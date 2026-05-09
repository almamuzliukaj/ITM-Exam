using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Models;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExamsController : ControllerBase
{
    private const string QuestionBankMarker = "__QUESTION_BANK__:";
    private readonly AppDbContext _context;

    public ExamsController(AppDbContext context)
    {
        _context = context;
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

        exam.Title = dto.Title.Trim();
        exam.Description = dto.Description?.Trim() ?? string.Empty;
        exam.StartsAt = startsAt;
        exam.EndsAt = endsAt;
        exam.DurationMinutes = durationMinutes;
        exam.IsPublished = dto.IsPublished;
        exam.Status = dto.IsPublished ? "Published" : exam.Status;
        exam.CourseOfferingId = dto.CourseOfferingId;

        await _context.SaveChangesAsync();
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

        if (!await CanStudentAccessExamAsync(userId.Value, exam))
            return Forbid();

        var details = new List<QuestionScoreDetailDto>();
        double autoScore = 0;
        var requiresManualGrading = false;

        foreach (var answer in dto.Answers)
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

        var attempt = new ExamAttempt
        {
            Id = Guid.NewGuid(),
            ExamId = examId,
            StudentId = userId.Value,
            SubmittedAt = DateTime.UtcNow,
            AnswersJson = JsonSerializer.Serialize(dto.Answers),
            AutoScore = autoScore,
            ManualScore = 0,
            FinalScore = autoScore,
            RequiresManualGrading = requiresManualGrading,
            IsGraded = !requiresManualGrading,
            IsPublished = false
        };

        _context.ExamAttempts.Add(attempt);
        await _context.SaveChangesAsync();

        return Ok(new ExamAttemptResultDto
        {
            ExamAttemptId = attempt.Id,
            Score = attempt.FinalScore,
            Questions = details
        });
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "Professor")]
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

        var hasAccess = exam.CreatedByUserId == userId.Value ||
                        (exam.CourseOfferingId != null && await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
                            a.CourseOfferingId == exam.CourseOfferingId &&
                            a.UserId == userId.Value &&
                            a.IsActive &&
                            a.RoleInOffering == "Professor"));

        if (!hasAccess)
            return Forbid();

        if (dto?.CourseOfferingId.HasValue == true)
        {
            var canAssignOffering = await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
                a.CourseOfferingId == dto.CourseOfferingId.Value &&
                a.UserId == userId.Value &&
                a.IsActive &&
                a.RoleInOffering == "Professor");

            var isPrimaryProfessor = await _context.CourseOfferings.AnyAsync(x =>
                x.Id == dto.CourseOfferingId.Value &&
                x.PrimaryProfessorId == userId.Value);

            if (!canAssignOffering && !isPrimaryProfessor)
                return Forbid();

            exam.CourseOfferingId = dto.CourseOfferingId.Value;
        }

        if (!exam.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Exam must be linked to a course offering before publishing." });

        exam.Status = "Published";
        exam.IsPublished = true;
        await _context.SaveChangesAsync();

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
            .Where(a => a.ExamId == id)
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

        return Ok(new ExamAttemptSummaryDto
        {
            AttemptId = attempt.Id,
            ExamId = attempt.ExamId,
            StudentId = attempt.StudentId,
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

        var query = _context.ExamAttempts.Where(x => x.ExamId == id && x.IsGraded);

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
            .Where(x => x.StudentId == userId.Value)
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
