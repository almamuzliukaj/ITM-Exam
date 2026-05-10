using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using OnlineExam.Api.Data;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Models;
using OnlineExam.Api.Services;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExamsController : ControllerBase
{
    private const string QuestionBankMarker = "__QUESTION_BANK__:";
    private const string ExamAttemptInProgressStatus = "InProgress";
    private const string ExamAttemptSubmittedStatus = "Submitted";
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public ExamsController(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Exam>>> GetExams()
    {
        if (User.IsInRole("Admin"))
            return Forbid();

        IQueryable<Exam> query = _context.Exams
            .Include(x => x.CourseOffering)
            .Where(x => !x.Description.StartsWith(QuestionBankMarker));

        if (User.IsInRole("Professor") || User.IsInRole("Assistant"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var assignmentRole = User.IsInRole("Professor") ? "Professor" : "Assistant";
            query = query.Where(x =>
                x.CreatedByUserId == userId.Value ||
                (x.CourseOfferingId != null && _context.CourseOfferingStaffAssignments.Any(a =>
                    a.CourseOfferingId == x.CourseOfferingId &&
                    a.UserId == userId.Value &&
                    a.IsActive &&
                    a.RoleInOffering == assignmentRole)));
        }
        else if (User.IsInRole("Student"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var offeringIds = await GetVisibleOfferingIdsForStudentAsync(userId.Value);
            query = query.Where(x =>
                x.IsPublished &&
                x.Status == "Published" &&
                x.CourseOfferingId.HasValue &&
                offeringIds.Contains(x.CourseOfferingId.Value));
        }

        return await query.OrderByDescending(x => x.CreatedAt).ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Exam>> GetExam(Guid id)
    {
        if (User.IsInRole("Admin"))
            return Forbid();

        var exam = await _context.Exams.Include(x => x.CourseOffering).FirstOrDefaultAsync(x => x.Id == id);
        if (exam == null)
            return NotFound();

        if (exam.Description.StartsWith(QuestionBankMarker))
            return NotFound();

        if (User.IsInRole("Professor") || User.IsInRole("Assistant"))
        {
            if (!await CanManageExamAsync(exam))
                return Forbid();
        }
        else if (User.IsInRole("Student"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            if (!await CanStudentAccessExamAsync(userId.Value, exam))
                return Forbid();
        }

        return exam;
    }

    [HttpPost]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<ActionResult<Exam>> PostExam([FromBody] CreateExamDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });

        var durationMinutes = dto.DurationMinutes > 0 ? dto.DurationMinutes : 60;
        var startsAt = dto.StartsAt?.ToUniversalTime() ?? DateTime.UtcNow;
        var endsAt = dto.EndsAt?.ToUniversalTime() ?? startsAt.AddMinutes(durationMinutes);

        if (endsAt <= startsAt)
            return BadRequest(new { message = "EndsAt must be later than StartsAt." });

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (User.IsInRole("Assistant") && !dto.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Assistant exams must be linked to an assigned course offering." });

        if (dto.CourseOfferingId.HasValue)
        {
            var offeringExists = await _context.CourseOfferings.AnyAsync(x => x.Id == dto.CourseOfferingId.Value);
            if (!offeringExists)
                return BadRequest(new { message = "CourseOfferingId is invalid." });

            var assignmentRole = User.IsInRole("Professor") ? "Professor" : "Assistant";
            var hasAssignment = await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
                a.CourseOfferingId == dto.CourseOfferingId.Value &&
                a.UserId == userId.Value &&
                a.IsActive &&
                a.RoleInOffering == assignmentRole);

            if (!hasAssignment)
                return Forbid();
        }

        var exam = new Exam
        {
            Id = Guid.NewGuid(),
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            StartsAt = startsAt,
            EndsAt = endsAt,
            DurationMinutes = durationMinutes,
            IsPublished = dto.IsPublished,
            Status = dto.IsPublished ? "Published" : "Draft",
            CreatedByUserId = userId.Value,
            CreatedAt = DateTime.UtcNow,
            CourseOfferingId = dto.CourseOfferingId
        };

        _context.Exams.Add(exam);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Exam.Created", "Exam", exam.Id, new
        {
            exam.Title,
            exam.CourseOfferingId,
            exam.Status
        }, "ExamAuthoring");

        return CreatedAtAction(nameof(GetExam), new { id = exam.Id }, exam);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> PutExam(Guid id, [FromBody] CreateExamDto dto)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return NotFound();

        if (exam.Description.StartsWith(QuestionBankMarker))
            return NotFound();

        if (exam.IsPublished || exam.Status == "Published")
            return BadRequest(new { message = "Published exams cannot be deleted. Only draft exams can be deleted." });

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (exam.CreatedByUserId != userId.Value)
            return Forbid();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Title is required." });

        var durationMinutes = dto.DurationMinutes > 0 ? dto.DurationMinutes : 60;
        var startsAt = dto.StartsAt?.ToUniversalTime() ?? exam.StartsAt;
        var endsAt = dto.EndsAt?.ToUniversalTime() ?? startsAt.AddMinutes(durationMinutes);

        if (endsAt <= startsAt)
            return BadRequest(new { message = "EndsAt must be later than StartsAt." });

        if (User.IsInRole("Assistant") && !dto.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Assistant exams must stay linked to an assigned course offering." });

        if (dto.CourseOfferingId.HasValue)
        {
            var offeringExists = await _context.CourseOfferings.AnyAsync(x => x.Id == dto.CourseOfferingId.Value);
            if (!offeringExists)
                return BadRequest(new { message = "CourseOfferingId is invalid." });

            var assignmentRole = User.IsInRole("Professor") ? "Professor" : "Assistant";
            var hasAssignment = await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
                a.CourseOfferingId == dto.CourseOfferingId.Value &&
                a.UserId == userId.Value &&
                a.IsActive &&
                a.RoleInOffering == assignmentRole);

            if (!hasAssignment)
                return Forbid();
        }

        exam.Title = dto.Title.Trim();
        exam.Description = dto.Description?.Trim() ?? string.Empty;
        exam.StartsAt = startsAt;
        exam.EndsAt = endsAt;
        exam.DurationMinutes = durationMinutes;
        exam.IsPublished = dto.IsPublished;
        exam.Status = dto.IsPublished ? "Published" : exam.Status;
        exam.CourseOfferingId = dto.CourseOfferingId;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Exam.Updated", "Exam", exam.Id, new
        {
            exam.Title,
            exam.CourseOfferingId,
            exam.Status
        }, "ExamAuthoring");
        return Ok(exam);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> DeleteExam(Guid id)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return NotFound();

        if (exam.Description.StartsWith(QuestionBankMarker))
            return NotFound();

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (exam.CreatedByUserId != userId.Value)
            return Forbid();

        _context.Exams.Remove(exam);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Exam.Deleted", "Exam", id, new
        {
            exam.Title
        }, "ExamAuthoring");

        return NoContent();
    }

    [HttpPost("{examId:guid}/attempt")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> SubmitAttempt(Guid examId, [FromBody] CreateExamAttemptDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (dto.ExamId != Guid.Empty && dto.ExamId != examId)
            return BadRequest(new { message = "ExamId in body does not match route." });

        var exam = await _context.Exams
            .Include(e => e.Questions)
            .FirstOrDefaultAsync(e => e.Id == examId);

        if (exam == null)
            return NotFound(new { message = "Exam not found." });

        var sessionAccessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: false);
        if (sessionAccessError != null)
        {
            if (sessionAccessError == StudentExamNotEligibleMessage)
                return Forbid();

            return BadRequest(new { message = sessionAccessError });
        }

        var attempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

        if (attempt?.Status == ExamAttemptSubmittedStatus)
            return BadRequest(new { message = "You have already submitted this exam." });

        var submittedAnswers = dto.Answers ?? [];
        var (details, autoScore, requiresManualGrading) = BuildAttemptEvaluation(exam, submittedAnswers);
        var now = DateTime.UtcNow;

        if (attempt == null)
        {
            attempt = new ExamAttempt
            {
                Id = Guid.NewGuid(),
                ExamId = examId,
                StudentId = userId.Value,
                Status = ExamAttemptSubmittedStatus,
                StartedAt = now,
                LastSavedAt = now,
                SubmittedAt = now,
                AnswersJson = JsonSerializer.Serialize(submittedAnswers),
                AutoScore = autoScore,
                ManualScore = 0,
                FinalScore = autoScore,
                RequiresManualGrading = requiresManualGrading,
                IsGraded = !requiresManualGrading,
                IsPublished = false
            };

            _context.ExamAttempts.Add(attempt);
        }
        else
        {
            attempt.Status = ExamAttemptSubmittedStatus;
            attempt.StartedAt = attempt.StartedAt == default ? now : attempt.StartedAt;
            attempt.LastSavedAt = now;
            attempt.SubmittedAt = now;
            attempt.AnswersJson = JsonSerializer.Serialize(submittedAnswers);
            attempt.AutoScore = autoScore;
            attempt.ManualScore = 0;
            attempt.FinalScore = autoScore;
            attempt.RequiresManualGrading = requiresManualGrading;
            attempt.IsGraded = !requiresManualGrading;
            attempt.IsPublished = false;
            attempt.GradedAt = null;
            attempt.GradedByUserId = null;
            attempt.GradingNotes = null;
            attempt.PublishedAt = null;
            attempt.PublishedByUserId = null;
        }
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateExamAttemptException(ex))
        {
            return BadRequest(new { message = "You have already submitted this exam." });
        }

        await _auditLogService.LogAsync("ExamAttempt.Submitted", "ExamAttempt", attempt.Id, new
        {
            attempt.ExamId,
            attempt.StudentId,
            attempt.AutoScore,
            attempt.RequiresManualGrading
        }, "ExamDelivery");

        return Ok(new ExamAttemptResultDto
        {
            ExamAttemptId = attempt.Id,
            Status = attempt.Status,
            StartedAt = attempt.StartedAt,
            LastSavedAt = attempt.LastSavedAt,
            SubmittedAt = attempt.SubmittedAt,
            Score = attempt.FinalScore,
            Questions = details
        });
    }

    [HttpGet("{examId:guid}/attempt")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ExamAttemptDraftDto?>> GetCurrentAttempt(Guid examId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == examId);
        if (exam == null)
            return NotFound(new { message = "Exam not found." });

        var sessionAccessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: false);
        if (sessionAccessError != null && sessionAccessError != "This exam is no longer accepting submissions.")
        {
            if (sessionAccessError == StudentExamNotEligibleMessage)
                return Forbid();

            return BadRequest(new { message = sessionAccessError });
        }

        var attempt = await _context.ExamAttempts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

        return Ok(attempt == null ? null : MapToDraftDto(attempt));
    }

    [HttpPut("{examId:guid}/attempt/draft")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ExamAttemptDraftDto>> SaveDraftAttempt(Guid examId, [FromBody] CreateExamAttemptDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (dto.ExamId != Guid.Empty && dto.ExamId != examId)
            return BadRequest(new { message = "ExamId in body does not match route." });

        var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == examId);
        if (exam == null)
            return NotFound(new { message = "Exam not found." });

        var sessionAccessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: false);
        if (sessionAccessError != null)
        {
            if (sessionAccessError == StudentExamNotEligibleMessage)
                return Forbid();

            if (sessionAccessError == "This exam is no longer accepting submissions.")
                return BadRequest(new { message = "Draft saving is closed because the exam session has ended." });

            return BadRequest(new { message = sessionAccessError });
        }

        var now = DateTime.UtcNow;
        var answers = dto.Answers ?? [];
        var attempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

        if (attempt?.Status == ExamAttemptSubmittedStatus)
            return BadRequest(new { message = "You have already submitted this exam." });

        if (attempt == null)
        {
            attempt = new ExamAttempt
            {
                Id = Guid.NewGuid(),
                ExamId = examId,
                StudentId = userId.Value,
                Status = ExamAttemptInProgressStatus,
                StartedAt = now,
                LastSavedAt = now,
                SubmittedAt = null,
                AnswersJson = JsonSerializer.Serialize(answers),
                AutoScore = 0,
                ManualScore = 0,
                FinalScore = 0,
                RequiresManualGrading = false,
                IsGraded = false,
                IsPublished = false
            };

            _context.ExamAttempts.Add(attempt);
        }
        else
        {
            attempt.Status = ExamAttemptInProgressStatus;
            attempt.StartedAt = attempt.StartedAt == default ? now : attempt.StartedAt;
            attempt.LastSavedAt = now;
            attempt.AnswersJson = JsonSerializer.Serialize(answers);
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateExamAttemptException(ex))
        {
            return Conflict(new { message = "An attempt already exists for this exam. Refresh the page to load the latest draft." });
        }

        await _auditLogService.LogAsync("ExamAttempt.DraftSaved", "ExamAttempt", attempt.Id, new
        {
            attempt.ExamId,
            attempt.StudentId,
            attempt.Status,
            attempt.LastSavedAt
        }, "ExamDelivery");

        return Ok(MapToDraftDto(attempt));
    }

    private const string StudentExamNotEligibleMessage = "You are not eligible to access this exam.";

    private async Task<string?> GetStudentExamSessionAccessErrorAsync(Guid userId, Exam exam, bool blockResubmission)
    {
        if (!exam.IsPublished || exam.Status != "Published" || !exam.CourseOfferingId.HasValue)
            return "This exam is not available for students.";

        var now = DateTime.UtcNow;
        if (now < exam.StartsAt)
            return "This exam has not started yet.";

        if (now > exam.EndsAt)
            return "This exam is no longer accepting submissions.";

        var hasEligibleEnrollment = await _context.StudentCourseEnrollments.AnyAsync(x =>
            x.StudentId == userId &&
            x.CourseOfferingId == exam.CourseOfferingId.Value &&
            x.EligibleForExam &&
            x.Status == "Eligible");

        var canUseCurrentTermFallback = false;
        if (!hasEligibleEnrollment)
        {
            var hasAnyEnrollment = await _context.StudentCourseEnrollments.AnyAsync(x => x.StudentId == userId);
            if (hasAnyEnrollment)
                return StudentExamNotEligibleMessage;

            canUseCurrentTermFallback = await _context.CourseOfferings.AnyAsync(x =>
                x.Id == exam.CourseOfferingId.Value &&
                x.Term != null &&
                (x.Term.IsCurrent || x.Term.Status == "Open" || x.Term.Status == "Active" || x.Term.Status == "Draft"));

            if (!canUseCurrentTermFallback)
                return StudentExamNotEligibleMessage;
        }

        if (blockResubmission)
        {
            var alreadySubmitted = await _context.ExamAttempts.AnyAsync(a =>
                a.ExamId == exam.Id &&
                a.StudentId == userId &&
                a.Status == ExamAttemptSubmittedStatus);

            if (alreadySubmitted)
                return "You have already submitted this exam.";
        }

        return null;
    }

    private static bool IsDuplicateExamAttemptException(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException postgresException &&
               postgresException.SqlState == PostgresErrorCodes.UniqueViolation &&
               string.Equals(postgresException.ConstraintName, "IX_ExamAttempts_ExamId_StudentId", StringComparison.Ordinal);
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> PublishExam(Guid id, [FromBody] PublishExamDto? dto = null)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return NotFound();

        if (exam.Description.StartsWith(QuestionBankMarker))
            return NotFound();

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var assignmentRole = User.IsInRole("Professor") ? "Professor" : "Assistant";
        var hasAccess = exam.CreatedByUserId == userId.Value ||
                        (exam.CourseOfferingId != null && await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
                            a.CourseOfferingId == exam.CourseOfferingId &&
                            a.UserId == userId.Value &&
                            a.IsActive &&
                            a.RoleInOffering == assignmentRole));

        if (!hasAccess)
            return Forbid();

        if (dto?.CourseOfferingId.HasValue == true)
        {
            var canAssignOffering = await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
                a.CourseOfferingId == dto.CourseOfferingId.Value &&
                a.UserId == userId.Value &&
                a.IsActive &&
                a.RoleInOffering == assignmentRole);

            var isPrimaryProfessor = await _context.CourseOfferings.AnyAsync(x =>
                x.Id == dto.CourseOfferingId.Value &&
                x.PrimaryProfessorId == userId.Value);

            if (!canAssignOffering && !(User.IsInRole("Professor") && isPrimaryProfessor))
                return Forbid();

            exam.CourseOfferingId = dto.CourseOfferingId.Value;
        }

        if (!exam.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Exam must be linked to a course offering before publishing." });

        var hasQuestions = await _context.Questions.AnyAsync(q => q.ExamId == id);
        if (!hasQuestions)
            return BadRequest(new { message = "Exam must have at least one question before publishing." });

        exam.Status = "Published";
        exam.IsPublished = true;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Exam.Published", "Exam", exam.Id, new
        {
            exam.CourseOfferingId
        }, "ExamAuthoring");

        return Ok(new { message = "Exam published!", examId = id });
    }

    [HttpGet("{id:guid}/gradebook")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> GetGradebook(Guid id)
    {
        var exam = await _context.Exams.FirstOrDefaultAsync(x => x.Id == id);
        if (exam == null)
            return NotFound();

        if (!await CanManageExamAsync(exam))
            return Forbid();

        var attempts = await _context.ExamAttempts
            .Where(a => a.ExamId == id && a.Status == ExamAttemptSubmittedStatus)
            .Join(
                _context.Users,
                attempt => attempt.StudentId,
                user => user.Id,
                (attempt, user) => new ExamAttemptSummaryDto
                {
                    AttemptId = attempt.Id,
                    ExamId = attempt.ExamId,
                    StudentId = attempt.StudentId,
                    StudentName = user.FullName,
                    StudentEmail = user.Email,
                    Status = attempt.Status,
                    StartedAt = attempt.StartedAt,
                    LastSavedAt = attempt.LastSavedAt,
                    SubmittedAt = attempt.SubmittedAt,
                    AutoScore = attempt.AutoScore,
                    ManualScore = attempt.ManualScore,
                    FinalScore = attempt.FinalScore,
                    RequiresManualGrading = attempt.RequiresManualGrading,
                    IsGraded = attempt.IsGraded,
                    IsPublished = attempt.IsPublished,
                    GradedAt = attempt.GradedAt,
                    GradingNotes = attempt.GradingNotes
                })
            .OrderByDescending(x => x.SubmittedAt)
            .ToListAsync();

        return Ok(attempts);
    }

    [HttpPost("attempts/{attemptId:guid}/grade")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> GradeAttempt(Guid attemptId, [FromBody] GradeExamAttemptDto dto)
    {
        var attempt = await _context.ExamAttempts
            .Include(x => x.Exam)
            .FirstOrDefaultAsync(x => x.Id == attemptId);

        if (attempt == null)
            return NotFound(new { message = "Attempt not found." });

        if (!await CanManageExamAsync(attempt.Exam))
            return Forbid();

        if (attempt.Status != ExamAttemptSubmittedStatus)
            return BadRequest(new { message = "Only submitted attempts can be graded." });

        var examPoints = await _context.Questions
            .Where(x => x.ExamId == attempt.ExamId)
            .SumAsync(x => (double)x.Points);

        var manualScore = dto.ManualScore ?? attempt.ManualScore;
        var finalScore = dto.FinalScore ?? (attempt.AutoScore + manualScore);

        if (manualScore < 0)
            return BadRequest(new { message = "Manual score cannot be negative." });

        if (finalScore < 0 || (examPoints > 0 && finalScore > examPoints))
            return BadRequest(new { message = "Final score is outside the allowed exam range." });

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        attempt.ManualScore = manualScore;
        attempt.FinalScore = finalScore;
        attempt.IsGraded = true;
        attempt.GradedAt = DateTime.UtcNow;
        attempt.GradedByUserId = userId.Value;
        attempt.GradingNotes = NormalizeOptionalValue(dto.Notes);

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAttempt.Graded", "ExamAttempt", attempt.Id, new
        {
            attempt.ExamId,
            attempt.AutoScore,
            attempt.ManualScore,
            attempt.FinalScore
        }, "Grading");

        return Ok(new ExamAttemptSummaryDto
        {
            AttemptId = attempt.Id,
            ExamId = attempt.ExamId,
            StudentId = attempt.StudentId,
            Status = attempt.Status,
            StartedAt = attempt.StartedAt,
            LastSavedAt = attempt.LastSavedAt,
            SubmittedAt = attempt.SubmittedAt,
            AutoScore = attempt.AutoScore,
            ManualScore = attempt.ManualScore,
            FinalScore = attempt.FinalScore,
            RequiresManualGrading = attempt.RequiresManualGrading,
            IsGraded = attempt.IsGraded,
            IsPublished = attempt.IsPublished,
            GradedAt = attempt.GradedAt,
            GradingNotes = attempt.GradingNotes
        });
    }

    [HttpPost("attempts/{attemptId:guid}/ai-text-evaluation")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> EvaluateTextAttempt(Guid attemptId)
    {
        var attempt = await _context.ExamAttempts
            .Include(x => x.Exam)
            .FirstOrDefaultAsync(x => x.Id == attemptId);

        if (attempt == null)
            return NotFound(new { message = "Attempt not found." });

        if (!await CanManageExamAsync(attempt.Exam))
            return Forbid();

        if (attempt.Status != ExamAttemptSubmittedStatus)
            return BadRequest(new { message = "AI review is available only for submitted attempts." });

        var questions = await _context.Questions
            .Where(x => x.ExamId == attempt.ExamId)
            .ToListAsync();

        var answers = ParseAttemptAnswers(attempt.AnswersJson);
        var suggestions = new List<AiTextEvaluationQuestionDto>();

        foreach (var question in questions.Where(q => string.Equals(q.Type, "Text", StringComparison.OrdinalIgnoreCase)))
        {
            var answer = answers.FirstOrDefault(x => x.QuestionId == question.Id);
            var response = answer?.Response ?? string.Empty;
            var suggestion = BuildTextEvaluationSuggestion(question, response);
            suggestions.Add(suggestion);
        }

        return Ok(new AiTextEvaluationResponseDto
        {
            AttemptId = attempt.Id,
            ExamId = attempt.ExamId,
            SuggestedManualScore = Math.Round(suggestions.Sum(x => x.SuggestedPoints), 2),
            ReviewReminder = "AI assistance is a baseline suggestion only. Staff must review the answer and save the final grade manually.",
            Questions = suggestions
        });
    }
    [HttpPost("{id:guid}/results/publish")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> PublishResults(Guid id, [FromBody] PublishExamResultsDto? dto = null)
    {
        var exam = await _context.Exams.FirstOrDefaultAsync(x => x.Id == id);
        if (exam == null)
            return NotFound();

        if (!await CanManageExamAsync(exam))
            return Forbid();

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var query = _context.ExamAttempts.Where(x => x.ExamId == id && x.Status == ExamAttemptSubmittedStatus && x.IsGraded);

        if (dto?.PublishAll == false)
        {
            if (dto.AttemptIds.Count == 0)
                return BadRequest(new { message = "At least one attemptId is required when PublishAll is false." });

            query = query.Where(x => dto.AttemptIds.Contains(x.Id));
        }

        var attempts = await query.ToListAsync();
        foreach (var attempt in attempts)
        {
            attempt.IsPublished = true;
            attempt.PublishedAt = DateTime.UtcNow;
            attempt.PublishedByUserId = userId.Value;
        }

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamResults.Published", "Exam", id, new
        {
            PublishedAttempts = attempts.Count
        }, "Results");

        return Ok(new
        {
            message = "Results published successfully.",
            examId = id,
            publishedCount = attempts.Count
        });
    }

    [HttpGet("results/me")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyResults()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var results = await _context.ExamAttempts
            .Where(x => x.StudentId == userId.Value && x.Status == ExamAttemptSubmittedStatus)
            .Join(
                _context.Exams,
                attempt => attempt.ExamId,
                exam => exam.Id,
                (attempt, exam) => new StudentExamResultDto
                {
                    AttemptId = attempt.Id,
                    ExamId = attempt.ExamId,
                    ExamTitle = exam.Title,
                    SubmittedAt = attempt.SubmittedAt,
                    Status = attempt.IsPublished ? "Published" : (attempt.IsGraded ? "ReadyToPublish" : "Pending"),
                    IsPublished = attempt.IsPublished,
                    FinalScore = attempt.IsPublished ? attempt.FinalScore : null,
                    AutoScore = attempt.IsPublished ? attempt.AutoScore : null,
                    GradingNotes = attempt.IsPublished ? attempt.GradingNotes : null,
                    PublishedAt = attempt.PublishedAt
                })
            .OrderByDescending(x => x.SubmittedAt)
            .ToListAsync();

        return Ok(results);
    }

    [HttpPost("build-random")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> BuildRandomExam([FromBody] BuildExamParamsDto dto)
    {
        if (dto.NumberOfQuestions <= 0)
            return BadRequest(new { message = "NumberOfQuestions must be greater than 0." });

        var query = _context.Questions.AsQueryable();

        if (dto.CourseId != Guid.Empty)
            query = query.Where(q => q.CourseId == dto.CourseId);

        if (!string.IsNullOrWhiteSpace(dto.Type))
            query = query.Where(q => q.Type.ToLower() == dto.Type.ToLower());

        var random = await query
            .OrderBy(_ => Guid.NewGuid())
            .Take(dto.NumberOfQuestions)
            .Select(q => new { q.Id, q.Text, q.Points, q.Type })
            .ToListAsync();

        return Ok(random);
    }

    [HttpPost("{examId:guid}/generate-random")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> GenerateRandomQuestionsForExam(Guid examId, [FromBody] GenerateRandomExamQuestionsDto dto)
    {
        if (dto.NumberOfQuestions <= 0)
            return BadRequest(new { message = "NumberOfQuestions must be greater than 0." });

        var exam = await _context.Exams
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == examId);

        if (exam == null)
            return NotFound(new { message = "Exam not found." });

        if (exam.Description.StartsWith(QuestionBankMarker))
            return NotFound();

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (!exam.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Exam must be linked to a course offering before generating questions." });

        var bankExam = await FindQuestionBankContainerAsync(exam.CourseOfferingId.Value);
        if (bankExam == null)
            return BadRequest(new { message = "No question bank exists for this course offering yet." });

        var candidates = await BuildQuestionBankCandidateQuery(bankExam.Id, dto.Type).ToListAsync();

        var availableCandidates = candidates
            .Where(candidate => !exam.Questions.Any(existing => IsSameQuestionContent(existing, candidate)))
            .OrderBy(_ => Guid.NewGuid())
            .Take(dto.NumberOfQuestions)
            .ToList();

        if (availableCandidates.Count < dto.NumberOfQuestions)
            return BadRequest(new { message = "Not enough matching question bank entries are available for this request." });

        var createdQuestions = availableCandidates
            .Select(candidate => CloneQuestionForExam(candidate, exam.Id))
            .ToList();

        _context.Questions.AddRange(createdQuestions);
        await _context.SaveChangesAsync();

        return Ok(createdQuestions.Select(MapToExamQuestionResponse));
    }

    [HttpPost("{examId:guid}/questions/{questionId:guid}/replace")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> ReplaceExamQuestion(Guid examId, Guid questionId, [FromBody] ReplaceExamQuestionDto? dto = null)
    {
        var exam = await _context.Exams
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == examId);

        if (exam == null)
            return NotFound(new { message = "Exam not found." });

        if (exam.Description.StartsWith(QuestionBankMarker))
            return NotFound();

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (!exam.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Exam must be linked to a course offering before replacing questions." });

        var existingQuestion = exam.Questions.FirstOrDefault(x => x.Id == questionId);
        if (existingQuestion == null)
            return NotFound(new { message = "Question not found in this exam." });

        var bankExam = await FindQuestionBankContainerAsync(exam.CourseOfferingId.Value);
        if (bankExam == null)
            return BadRequest(new { message = "No question bank exists for this course offering yet." });

        var type = NormalizeOptionalValue(dto?.Type) ?? existingQuestion.Type;

        var replacement = await BuildQuestionBankCandidateQuery(bankExam.Id, type)
            .Where(candidate => !IsSameQuestionContent(candidate, existingQuestion))
            .ToListAsync();

        var selectedReplacement = replacement
            .Where(candidate => !exam.Questions.Any(q => q.Id != existingQuestion.Id && IsSameQuestionContent(q, candidate)))
            .OrderBy(_ => Guid.NewGuid())
            .FirstOrDefault();

        if (selectedReplacement == null)
            return BadRequest(new { message = "No replacement question is available for the selected criteria." });

        existingQuestion.Text = selectedReplacement.Text;
        existingQuestion.Type = selectedReplacement.Type;
        existingQuestion.CorrectAnswer = selectedReplacement.CorrectAnswer;
        existingQuestion.OptionsJson = selectedReplacement.OptionsJson;
        existingQuestion.Points = selectedReplacement.Points;
        existingQuestion.CourseId = selectedReplacement.CourseId;

        await _context.SaveChangesAsync();

        return Ok(MapToExamQuestionResponse(existingQuestion));
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }

    private async Task<bool> CanManageExamAsync(Exam exam)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return false;

        if (exam.CreatedByUserId == userId.Value)
            return true;

        if (!exam.CourseOfferingId.HasValue)
            return false;

        var assignmentRole = User.IsInRole("Professor")
            ? "Professor"
            : User.IsInRole("Assistant")
                ? "Assistant"
                : string.Empty;

        if (string.IsNullOrWhiteSpace(assignmentRole))
            return false;

        return await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
            a.CourseOfferingId == exam.CourseOfferingId.Value &&
            a.UserId == userId.Value &&
            a.IsActive &&
            a.RoleInOffering == assignmentRole);
    }

    private async Task<Exam?> FindQuestionBankContainerAsync(Guid offeringId)
    {
        return await _context.Exams.FirstOrDefaultAsync(x =>
            x.CourseOfferingId == offeringId &&
            x.Description == BuildQuestionBankDescription(offeringId));
    }

    private IQueryable<Question> BuildQuestionBankCandidateQuery(Guid questionBankExamId, string? type)
    {
        var query = _context.Questions.AsQueryable().Where(x => x.ExamId == questionBankExamId);

        var normalizedType = NormalizeOptionalValue(type);
        if (!string.IsNullOrWhiteSpace(normalizedType))
        {
            query = query.Where(x => x.Type.ToLower() == normalizedType.ToLower());
        }

        return query;
    }

    private static Question CloneQuestionForExam(Question source, Guid examId)
    {
        return new Question
        {
            Id = Guid.NewGuid(),
            ExamId = examId,
            CourseId = source.CourseId,
            Text = source.Text,
            Type = source.Type,
            CorrectAnswer = source.CorrectAnswer,
            OptionsJson = source.OptionsJson,
            Points = source.Points
        };
    }

    private static ExamQuestionResponseDto MapToExamQuestionResponse(Question question)
    {
        return new ExamQuestionResponseDto
        {
            Id = question.Id,
            ExamId = question.ExamId,
            Text = question.Text,
            Type = question.Type,
            CorrectAnswer = question.CorrectAnswer,
            Options = ParseOptions(question.OptionsJson),
            Points = question.Points
        };
    }

    private static List<string> ParseOptions(string? optionsJson)
    {
        if (string.IsNullOrWhiteSpace(optionsJson))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<string>>(optionsJson) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static List<AnswerDto> ParseAttemptAnswers(string answersJson)
    {
        if (string.IsNullOrWhiteSpace(answersJson))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<AnswerDto>>(answersJson) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static (List<QuestionScoreDetailDto> details, double autoScore, bool requiresManualGrading) BuildAttemptEvaluation(Exam exam, List<AnswerDto> submittedAnswers)
    {
        var details = new List<QuestionScoreDetailDto>();
        double autoScore = 0;
        var requiresManualGrading = false;

        foreach (var answer in submittedAnswers)
        {
            var question = exam.Questions.FirstOrDefault(x => x.Id == answer.QuestionId);
            if (question == null)
                continue;

            var awarded = 0d;
            if (string.Equals(question.Type, "MCQ", StringComparison.OrdinalIgnoreCase))
            {
                if (!string.IsNullOrWhiteSpace(question.CorrectAnswer) &&
                    string.Equals(question.CorrectAnswer.Trim(), answer.Response.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    awarded = question.Points;
                }
            }
            else
            {
                requiresManualGrading = true;
            }

            details.Add(new QuestionScoreDetailDto
            {
                QuestionId = question.Id,
                PointsAwarded = awarded,
                MaxPoints = question.Points
            });

            autoScore += awarded;
        }

        return (details, autoScore, requiresManualGrading);
    }

    private static ExamAttemptDraftDto MapToDraftDto(ExamAttempt attempt)
    {
        return new ExamAttemptDraftDto
        {
            ExamAttemptId = attempt.Id,
            Status = attempt.Status,
            StartedAt = attempt.StartedAt,
            LastSavedAt = attempt.LastSavedAt,
            SubmittedAt = attempt.SubmittedAt,
            Answers = ParseAttemptAnswers(attempt.AnswersJson)
        };
    }

    private static AiTextEvaluationQuestionDto BuildTextEvaluationSuggestion(Question question, string response)
    {
        var expectedAnswer = NormalizeOptionalValue(question.CorrectAnswer);
        var cleanResponse = response.Trim();

        if (string.IsNullOrWhiteSpace(cleanResponse))
        {
            return new AiTextEvaluationQuestionDto
            {
                QuestionId = question.Id,
                Prompt = question.Text,
                Response = cleanResponse,
                ExpectedAnswer = expectedAnswer,
                MaxPoints = question.Points,
                SuggestedPoints = 0,
                Confidence = "High",
                Rationale = "No answer was submitted for this text question."
            };
        }

        if (string.IsNullOrWhiteSpace(expectedAnswer))
        {
            return new AiTextEvaluationQuestionDto
            {
                QuestionId = question.Id,
                Prompt = question.Text,
                Response = cleanResponse,
                ExpectedAnswer = expectedAnswer,
                MaxPoints = question.Points,
                SuggestedPoints = 0,
                Confidence = "Low",
                Rationale = "No expected answer or grading note is available, so staff review is required."
            };
        }

        var expectedTokens = TokenizeForEvaluation(expectedAnswer);
        var responseTokens = TokenizeForEvaluation(cleanResponse);
        var overlapRatio = expectedTokens.Count == 0
            ? 0
            : expectedTokens.Count(token => responseTokens.Contains(token)) / (double)expectedTokens.Count;
        var lengthRatio = expectedTokens.Count == 0
            ? 0
            : Math.Min(responseTokens.Count / (double)expectedTokens.Count, 1);
        var scoreRatio = Math.Clamp((overlapRatio * 0.75) + (lengthRatio * 0.25), 0, 1);
        var confidence = overlapRatio >= 0.75 ? "High" : overlapRatio >= 0.4 ? "Medium" : "Low";

        return new AiTextEvaluationQuestionDto
        {
            QuestionId = question.Id,
            Prompt = question.Text,
            Response = cleanResponse,
            ExpectedAnswer = expectedAnswer,
            MaxPoints = question.Points,
            SuggestedPoints = Math.Round(question.Points * scoreRatio, 2),
            Confidence = confidence,
            Rationale = $"Baseline text similarity matched {Math.Round(overlapRatio * 100)}% of expected grading terms. Staff must confirm the final score."
        };
    }

    private static HashSet<string> TokenizeForEvaluation(string value)
    {
        var normalizedChars = value
            .ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : ' ')
            .ToArray();

        return new string(normalizedChars)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(token => token.Length > 2)
            .ToHashSet();
    }

    private static bool IsSameQuestionContent(Question left, Question right)
    {
        return string.Equals(left.Text.Trim(), right.Text.Trim(), StringComparison.OrdinalIgnoreCase) &&
               string.Equals(left.Type.Trim(), right.Type.Trim(), StringComparison.OrdinalIgnoreCase) &&
               string.Equals(NormalizeOptionalValue(left.CorrectAnswer), NormalizeOptionalValue(right.CorrectAnswer), StringComparison.OrdinalIgnoreCase);
    }

    private static string? NormalizeOptionalValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string BuildQuestionBankDescription(Guid offeringId)
    {
        return $"{QuestionBankMarker}{offeringId}";
    }

    private async Task<List<Guid>> GetVisibleOfferingIdsForStudentAsync(Guid userId)
    {
        var eligibleOfferingIds = await _context.StudentCourseEnrollments
            .Where(x => x.StudentId == userId && x.EligibleForExam && x.Status == "Eligible")
            .Select(x => x.CourseOfferingId)
            .ToListAsync();

        if (eligibleOfferingIds.Count > 0)
            return eligibleOfferingIds;

        return await _context.CourseOfferings
            .Where(x =>
                x.Term != null &&
                (x.Term.IsCurrent || x.Term.Status == "Open" || x.Term.Status == "Active" || x.Term.Status == "Draft") &&
                _context.Exams.Any(e => e.CourseOfferingId == x.Id && e.IsPublished && e.Status == "Published"))
            .Select(x => x.Id)
            .ToListAsync();
    }

    private async Task<bool> CanStudentAccessExamAsync(Guid userId, Exam exam)
    {
        if (!exam.IsPublished || exam.Status != "Published" || !exam.CourseOfferingId.HasValue)
            return false;

        var hasEligibleEnrollment = await _context.StudentCourseEnrollments.AnyAsync(x =>
            x.StudentId == userId &&
            x.CourseOfferingId == exam.CourseOfferingId.Value &&
            x.EligibleForExam &&
            x.Status == "Eligible");

        if (hasEligibleEnrollment)
            return true;

        var hasAnyEnrollment = await _context.StudentCourseEnrollments.AnyAsync(x => x.StudentId == userId);
        if (hasAnyEnrollment)
            return false;

        return await _context.CourseOfferings.AnyAsync(x =>
            x.Id == exam.CourseOfferingId.Value &&
            x.Term != null &&
            (x.Term.IsCurrent || x.Term.Status == "Open" || x.Term.Status == "Active" || x.Term.Status == "Draft"));
    }
}
