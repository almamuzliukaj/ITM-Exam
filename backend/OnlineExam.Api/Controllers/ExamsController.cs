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
    private const int IntegrityFinalWarningThreshold = 3;
    private const int IntegrityAutoActionThreshold = 5;
    private const string IntegrityPolicyActionNone = "None";
    private const string IntegrityPolicyActionWarning = "Warning";
    private const string IntegrityPolicyActionFinalWarning = "FinalWarning";
    private const string IntegrityPolicyActionAutoSubmit = "AutoSubmit";
    private static readonly HashSet<string> AllowedIntegrityEventTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "TabHidden",
        "WindowBlur",
        "FullscreenExit",
        "CopyAttempt",
        "PasteAttempt"
    };
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
            RequiresLockdown = dto.RequiresLockdown,
            AllowedClient = NormalizeLockdownClient(dto.AllowedClient),
            LockdownMode = NormalizeLockdownMode(dto.LockdownMode),
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
        exam.RequiresLockdown = dto.RequiresLockdown;
        exam.AllowedClient = NormalizeLockdownClient(dto.AllowedClient);
        exam.LockdownMode = NormalizeLockdownMode(dto.LockdownMode);

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

        if (exam.IsPublished || exam.Status == "Published")
            return BadRequest(new { message = "Published exams cannot be deleted. Only draft exams can be deleted." });

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

        if (exam.Questions.Count == 0)
            return BadRequest(new { message = "This exam cannot be submitted because it has no questions." });
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
        var validationError = ValidateAttemptAnswers(exam, submittedAnswers);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        var (details, autoScore, requiresManualGrading) = BuildAttemptEvaluation(exam, submittedAnswers);
        var now = DateTime.UtcNow;
        var createdNewAttempt = false;

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
                IsPublished = false,
                IntegrityViolationCount = 0,
                IntegrityPolicyAction = IntegrityPolicyActionNone
            };

            _context.ExamAttempts.Add(attempt);
            createdNewAttempt = true;
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
        if (createdNewAttempt)
        {
            await _auditLogService.LogAsync("ExamAttempt.Started", "ExamAttempt", attempt.Id, new
            {
                attempt.ExamId,
                attempt.StudentId,
                attempt.StartedAt
            }, "ExamDelivery");
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
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

        if (attempt == null)
        {
            var now = DateTime.UtcNow;
            attempt = new ExamAttempt
            {
                Id = Guid.NewGuid(),
                ExamId = examId,
                StudentId = userId.Value,
                Status = ExamAttemptInProgressStatus,
                StartedAt = now,
                LastSavedAt = null,
                SubmittedAt = null,
                AnswersJson = JsonSerializer.Serialize(new List<AnswerDto>()),
                AutoScore = 0,
                ManualScore = 0,
                FinalScore = 0,
                RequiresManualGrading = false,
                IsGraded = false,
                IsPublished = false,
                IntegrityViolationCount = 0,
                IntegrityPolicyAction = IntegrityPolicyActionNone
            };

            _context.ExamAttempts.Add(attempt);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsDuplicateExamAttemptException(ex))
            {
                attempt = await _context.ExamAttempts
                    .AsNoTracking()
                    .FirstAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

                return Ok(MapToDraftDto(attempt));
            }

            await _auditLogService.LogAsync("ExamAttempt.Started", "ExamAttempt", attempt.Id, new
            {
                attempt.ExamId,
                attempt.StudentId,
                attempt.StartedAt
            }, "ExamDelivery");
        }

        return Ok(MapToDraftDto(attempt));
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

        if (!await _context.Questions.AnyAsync(q => q.ExamId == examId))
            return BadRequest(new { message = "This exam cannot accept draft answers because it has no questions." });
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
        var validationError = ValidateAttemptAnswers(exam, answers);
        if (validationError != null)
            return BadRequest(new { message = validationError });
        var attempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

        if (attempt?.Status == ExamAttemptSubmittedStatus)
            return BadRequest(new { message = "You have already submitted this exam." });

        var createdNewAttempt = false;
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
                IsPublished = false,
                IntegrityViolationCount = 0,
                IntegrityPolicyAction = IntegrityPolicyActionNone
            };

            _context.ExamAttempts.Add(attempt);
            createdNewAttempt = true;
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

        if (createdNewAttempt)
        {
            await _auditLogService.LogAsync("ExamAttempt.Started", "ExamAttempt", attempt.Id, new
            {
                attempt.ExamId,
                attempt.StudentId,
                attempt.StartedAt
            }, "ExamDelivery");
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

    [HttpPost("{examId:guid}/attempt/integrity-events")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ExamIntegrityEventResultDto>> RecordIntegrityEvent(
        Guid examId,
        [FromBody] RecordExamIntegrityEventDto dto,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.EventType))
            return BadRequest(new { message = "EventType is required." });

        var normalizedEventType = NormalizeIntegrityEventType(dto.EventType);
        if (normalizedEventType == null)
            return BadRequest(new { message = "Unsupported integrity event type." });

        var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == examId, cancellationToken);
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
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value, cancellationToken);

        if (attempt == null)
        {
            var now = DateTime.UtcNow;
            attempt = new ExamAttempt
            {
                Id = Guid.NewGuid(),
                ExamId = examId,
                StudentId = userId.Value,
                Status = ExamAttemptInProgressStatus,
                StartedAt = now,
                LastSavedAt = null,
                SubmittedAt = null,
                AnswersJson = JsonSerializer.Serialize(new List<AnswerDto>()),
                AutoScore = 0,
                ManualScore = 0,
                FinalScore = 0,
                RequiresManualGrading = false,
                IsGraded = false,
                IsPublished = false,
                IntegrityViolationCount = 0,
                IntegrityPolicyAction = IntegrityPolicyActionNone
            };

            _context.ExamAttempts.Add(attempt);
            await _context.SaveChangesAsync(cancellationToken);

            await _auditLogService.LogAsync("ExamAttempt.Started", "ExamAttempt", attempt.Id, new
            {
                attempt.ExamId,
                attempt.StudentId,
                attempt.StartedAt
            }, "ExamDelivery", cancellationToken);
        }

        if (dto.ExamAttemptId.HasValue && dto.ExamAttemptId.Value != attempt.Id)
            return BadRequest(new { message = "ExamAttemptId does not match the active attempt for this exam." });

        if (attempt.Status == ExamAttemptSubmittedStatus)
            return BadRequest(new { message = "Cannot record integrity events for a submitted attempt." });

        var occurredAt = dto.OccurredAt?.ToUniversalTime() ?? DateTime.UtcNow;
        var attemptViolationCount = await _context.ExamIntegrityEvents
            .Where(x => x.ExamAttemptId == attempt.Id)
            .CountAsync(cancellationToken) + 1;
        var studentViolationCount = await _context.ExamIntegrityEvents
            .Where(x => x.StudentId == userId.Value)
            .CountAsync(cancellationToken) + 1;
        var policyAction = ResolveIntegrityPolicyAction(attemptViolationCount);
        var autoActionTriggeredAt = policyAction == IntegrityPolicyActionAutoSubmit
            ? attempt.IntegrityAutoActionTriggeredAt ?? DateTime.UtcNow
            : attempt.IntegrityAutoActionTriggeredAt;

        var integrityEvent = new ExamIntegrityEvent
        {
            Id = Guid.NewGuid(),
            ExamAttemptId = attempt.Id,
            ExamId = examId,
            StudentId = userId.Value,
            EventType = normalizedEventType,
            OccurredAt = occurredAt,
            MetadataJson = dto.Metadata.HasValue ? dto.Metadata.Value.GetRawText() : null,
            ClientSessionId = string.IsNullOrWhiteSpace(dto.ClientSessionId) ? null : dto.ClientSessionId.Trim(),
            UserAgent = Request.Headers.UserAgent.ToString(),
            SequenceNumber = attemptViolationCount,
            AttemptViolationCount = attemptViolationCount,
            StudentViolationCount = studentViolationCount,
            PolicyAction = policyAction,
            RecordedAt = DateTime.UtcNow
        };

        attempt.IntegrityViolationCount = attemptViolationCount;
        attempt.IntegrityLastViolationAt = occurredAt;
        attempt.IntegrityPolicyAction = policyAction;
        attempt.IntegrityAutoActionTriggeredAt = autoActionTriggeredAt;

        _context.ExamIntegrityEvents.Add(integrityEvent);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditLogService.LogAsync("ExamIntegrityEvent.Recorded", "ExamAttempt", attempt.Id, new
        {
            integrityEvent.Id,
            integrityEvent.ExamId,
            integrityEvent.StudentId,
            integrityEvent.EventType,
            integrityEvent.OccurredAt,
            integrityEvent.ClientSessionId,
            integrityEvent.SequenceNumber,
            integrityEvent.AttemptViolationCount,
            integrityEvent.StudentViolationCount,
            integrityEvent.PolicyAction
        }, "ExamIntegrity", cancellationToken);

        return Ok(new ExamIntegrityEventResultDto
        {
            EventId = integrityEvent.Id,
            ExamAttemptId = attempt.Id,
            EventType = integrityEvent.EventType,
            OccurredAt = integrityEvent.OccurredAt,
            AttemptViolationCount = attemptViolationCount,
            StudentViolationCount = studentViolationCount,
            Policy = BuildIntegrityPolicyDto(
                attemptViolationCount,
                studentViolationCount,
                occurredAt,
                autoActionTriggeredAt)
        });
    }

    [HttpGet("{examId:guid}/attempt/integrity-summary")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<StudentExamIntegritySummaryDto>> GetCurrentAttemptIntegritySummary(Guid examId, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FirstOrDefaultAsync(e => e.Id == examId, cancellationToken);
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
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value, cancellationToken);

        if (attempt == null)
            return NotFound(new { message = "Attempt not found." });

        var events = await _context.ExamIntegrityEvents
            .AsNoTracking()
            .Where(x => x.ExamAttemptId == attempt.Id)
            .OrderByDescending(x => x.RecordedAt)
            .ToListAsync(cancellationToken);

        var studentViolationCount = attempt.IntegrityViolationCount > 0
            ? await _context.ExamIntegrityEvents
                .Where(x => x.StudentId == userId.Value)
                .CountAsync(cancellationToken)
            : 0;

        return Ok(new StudentExamIntegritySummaryDto
        {
            ExamId = examId,
            ExamAttemptId = attempt.Id,
            AttemptStatus = attempt.Status,
            AttemptViolationCount = attempt.IntegrityViolationCount,
            StudentViolationCount = studentViolationCount,
            LastViolationAt = attempt.IntegrityLastViolationAt,
            AutoActionTriggeredAt = attempt.IntegrityAutoActionTriggeredAt,
            Policy = BuildIntegrityPolicyDto(
                attempt.IntegrityViolationCount,
                studentViolationCount,
                attempt.IntegrityLastViolationAt,
                attempt.IntegrityAutoActionTriggeredAt),
            EventCounts = BuildIntegrityEventCounts(events),
            Events = events.Select(MapIntegrityTimelineEvent).ToList()
        });
    }
    private const string StudentExamNotEligibleMessage = "You are not eligible to access this exam.";

    private async Task<string?> GetStudentExamSessionAccessErrorAsync(Guid userId, Exam exam, bool blockResubmission)
    {
        if (!exam.IsPublished || exam.Status != "Published" || !exam.CourseOfferingId.HasValue)
            return "This exam is not available for students.";

        if (exam.RequiresLockdown && !IsAllowedLockdownClient(exam))
            return "This exam requires lockdown mode before it can be started.";

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

        var integrityLogs = await _context.AuditLogs
            .Where(x => x.Action == "ExamIntegrity.Event" && x.Scope == "ExamIntegrity")
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();
        var integrityByAttempt = integrityLogs
            .Select(x => new { x.EntityId, Event = TryMapIntegrityEvent(x) })
            .Where(x => x.EntityId.HasValue && x.Event != null)
            .GroupBy(x => x.EntityId!.Value)
            .ToDictionary(x => x.Key, x => x.Select(item => item.Event!).ToList());

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
                    GradingNotes = attempt.GradingNotes,
                    IntegrityViolationCount = attempt.IntegrityViolationCount,
                    IntegrityLastViolationAt = attempt.IntegrityLastViolationAt,
                    IntegrityPolicyAction = attempt.IntegrityPolicyAction,
                    IntegrityAutoActionTriggeredAt = attempt.IntegrityAutoActionTriggeredAt
                })
            .OrderByDescending(x => x.SubmittedAt)
            .ToListAsync();

        foreach (var attempt in attempts)
        {
            if (!integrityByAttempt.TryGetValue(attempt.AttemptId, out var events))
                continue;

            attempt.IntegrityEvents = events
                .OrderByDescending(x => x.CreatedAt)
                .Take(8)
                .ToList();
            attempt.IntegrityViolationCount = events.Max(x => x.ViolationCount);
            attempt.IntegrityLastEventAt = events.Max(x => x.CreatedAt);
        }

        return Ok(attempts);
    }

    [HttpPost("{examId:guid}/integrity-events")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> RecordIntegrityEvent(Guid examId, [FromBody] CreateExamIntegrityEventDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var attempt = await _context.ExamAttempts.FirstOrDefaultAsync(x =>
            x.ExamId == examId &&
            x.StudentId == userId.Value &&
            (!dto.AttemptId.HasValue || x.Id == dto.AttemptId.Value));

        if (attempt == null)
            return NotFound(new { message = "Attempt not found for integrity event." });

        var violationCount = Math.Max(1, dto.ViolationCount);
        await _auditLogService.LogAsync("ExamIntegrity.Event", "ExamAttempt", attempt.Id, new
        {
            examId,
            attemptId = attempt.Id,
            eventType = NormalizeOptionalValue(dto.EventType) ?? "IntegrityEvent",
            violationCount,
            message = NormalizeOptionalValue(dto.Message)
        }, "ExamIntegrity");

        return Ok(new { message = "Integrity event recorded.", violationCount });
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
            GradingNotes = attempt.GradingNotes,
            IntegrityViolationCount = attempt.IntegrityViolationCount,
            IntegrityLastViolationAt = attempt.IntegrityLastViolationAt,
            IntegrityPolicyAction = attempt.IntegrityPolicyAction,
            IntegrityAutoActionTriggeredAt = attempt.IntegrityAutoActionTriggeredAt
        });
    }

    [HttpGet("{id:guid}/integrity-summary")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<ActionResult<ExamIntegritySummaryDto>> GetExamIntegritySummary(Guid id, CancellationToken cancellationToken)
    {
        var exam = await _context.Exams
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (exam == null)
            return NotFound();

        if (!await CanManageExamAsync(exam))
            return Forbid();

        var attempts = await _context.ExamAttempts
            .AsNoTracking()
            .Where(x => x.ExamId == id)
            .Join(
                _context.Users.AsNoTracking(),
                attempt => attempt.StudentId,
                user => user.Id,
                (attempt, user) => new
                {
                    Attempt = attempt,
                    User = user
                })
            .OrderByDescending(x => x.Attempt.SubmittedAt ?? x.Attempt.LastSavedAt ?? x.Attempt.StartedAt)
            .ToListAsync(cancellationToken);

        var attemptIds = attempts.Select(x => x.Attempt.Id).ToList();
        var studentIds = attempts.Select(x => x.Attempt.StudentId).Distinct().ToList();

        var events = attemptIds.Count == 0
            ? []
            : await _context.ExamIntegrityEvents
                .AsNoTracking()
                .Where(x => attemptIds.Contains(x.ExamAttemptId))
                .OrderByDescending(x => x.RecordedAt)
                .ToListAsync(cancellationToken);

        var studentViolationCounts = studentIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await _context.ExamIntegrityEvents
                .AsNoTracking()
                .Where(x => studentIds.Contains(x.StudentId))
                .GroupBy(x => x.StudentId)
                .Select(x => new { StudentId = x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.StudentId, x => x.Count, cancellationToken);

        var eventsByAttemptId = events
            .GroupBy(x => x.ExamAttemptId)
            .ToDictionary(x => x.Key, x => x.ToList());

        var summary = new ExamIntegritySummaryDto
        {
            ExamId = exam.Id,
            ExamTitle = exam.Title,
            FinalWarningThreshold = IntegrityFinalWarningThreshold,
            AutoActionThreshold = IntegrityAutoActionThreshold,
            TotalViolations = events.Count,
            StudentsWithViolations = attempts.Count(x => x.Attempt.IntegrityViolationCount > 0),
            Attempts = attempts.Select(x =>
            {
                var attemptEvents = eventsByAttemptId.TryGetValue(x.Attempt.Id, out var list) ? list : [];
                var studentViolationCount = studentViolationCounts.TryGetValue(x.Attempt.StudentId, out var count) ? count : 0;

                return new ExamIntegrityAttemptSummaryDto
                {
                    AttemptId = x.Attempt.Id,
                    ExamId = x.Attempt.ExamId,
                    StudentId = x.Attempt.StudentId,
                    StudentName = x.User.FullName,
                    StudentEmail = x.User.Email,
                    AttemptStatus = x.Attempt.Status,
                    StartedAt = x.Attempt.StartedAt,
                    SubmittedAt = x.Attempt.SubmittedAt,
                    AttemptViolationCount = x.Attempt.IntegrityViolationCount,
                    StudentViolationCount = studentViolationCount,
                    LastViolationAt = x.Attempt.IntegrityLastViolationAt,
                    AutoActionTriggeredAt = x.Attempt.IntegrityAutoActionTriggeredAt,
                    CurrentPolicyAction = string.IsNullOrWhiteSpace(x.Attempt.IntegrityPolicyAction)
                        ? IntegrityPolicyActionNone
                        : x.Attempt.IntegrityPolicyAction,
                    EventCounts = BuildIntegrityEventCounts(attemptEvents),
                    Events = attemptEvents.Select(MapIntegrityTimelineEvent).ToList()
                };
            }).ToList()
        };

        return Ok(summary);
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

        await _auditLogService.LogAsync("StudentResults.ListViewed", "User", userId.Value, new
        {
            studentId = userId.Value,
            totalResults = results.Count,
            publishedResults = results.Count(x => x.IsPublished),
            pendingResults = results.Count(x => !x.IsPublished)
        }, "Results");

        return Ok(results);
    }

    [HttpGet("results/me/{attemptId:guid}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyResultDetails(Guid attemptId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var result = await _context.ExamAttempts
            .Where(x => x.Id == attemptId && x.StudentId == userId.Value && x.Status == ExamAttemptSubmittedStatus)
            .Join(
                _context.Exams,
                attempt => attempt.ExamId,
                exam => exam.Id,
                (attempt, exam) => new StudentExamResultDetailDto
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
                    PublishedAt = attempt.PublishedAt,
                    RequiresManualGrading = attempt.RequiresManualGrading,
                    IsGraded = attempt.IsGraded
                })
            .FirstOrDefaultAsync();

        if (result == null)
            return NotFound(new { message = "Result not found." });

        await _auditLogService.LogAsync("StudentResult.DetailViewed", "ExamAttempt", attemptId, new
        {
            studentId = userId.Value,
            result.AttemptId,
            result.ExamId,
            result.IsPublished,
            result.Status
        }, "Results");

        return Ok(result);
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

    private static string? ValidateAttemptAnswers(Exam exam, List<AnswerDto> answers)
    {
        var duplicateQuestionIds = answers
            .GroupBy(x => x.QuestionId)
            .Where(group => group.Key != Guid.Empty && group.Count() > 1)
            .Select(group => group.Key)
            .ToList();

        if (duplicateQuestionIds.Count > 0)
            return "Each question can only be answered once per request.";

        var validQuestionIds = exam.Questions.Select(x => x.Id).ToHashSet();
        if (answers.Any(x => x.QuestionId == Guid.Empty || !validQuestionIds.Contains(x.QuestionId)))
            return "One or more answers reference questions that do not belong to this exam.";

        return null;
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

    private static string ResolveIntegrityPolicyAction(int attemptViolationCount)
    {
        if (attemptViolationCount >= IntegrityAutoActionThreshold)
            return IntegrityPolicyActionAutoSubmit;

        if (attemptViolationCount >= IntegrityFinalWarningThreshold)
            return IntegrityPolicyActionFinalWarning;

        if (attemptViolationCount > 0)
            return IntegrityPolicyActionWarning;

        return IntegrityPolicyActionNone;
    }

    private static ExamIntegrityPolicyDto BuildIntegrityPolicyDto(
        int attemptViolationCount,
        int studentViolationCount,
        DateTime? lastViolationAt,
        DateTime? autoActionTriggeredAt)
    {
        var recommendedAction = ResolveIntegrityPolicyAction(attemptViolationCount);

        return new ExamIntegrityPolicyDto
        {
            FinalWarningThreshold = IntegrityFinalWarningThreshold,
            AutoActionThreshold = IntegrityAutoActionThreshold,
            RecommendedAction = recommendedAction,
            ShouldShowFinalWarning = attemptViolationCount >= IntegrityFinalWarningThreshold,
            ShouldBlockInteraction = attemptViolationCount >= IntegrityAutoActionThreshold,
            ShouldAutoSubmit = attemptViolationCount >= IntegrityAutoActionThreshold,
            AttemptViolationCount = attemptViolationCount,
            StudentViolationCount = studentViolationCount,
            LastViolationAt = lastViolationAt,
            AutoActionTriggeredAt = autoActionTriggeredAt
        };
    }

    private static List<ExamIntegrityEventCountDto> BuildIntegrityEventCounts(IEnumerable<ExamIntegrityEvent> events)
    {
        return events
            .GroupBy(x => x.EventType)
            .OrderByDescending(x => x.Count())
            .ThenBy(x => x.Key)
            .Select(x => new ExamIntegrityEventCountDto
            {
                EventType = x.Key,
                Count = x.Count()
            })
            .ToList();
    }

    private static ExamIntegrityTimelineEventDto MapIntegrityTimelineEvent(ExamIntegrityEvent integrityEvent)
    {
        return new ExamIntegrityTimelineEventDto
        {
            EventId = integrityEvent.Id,
            EventType = integrityEvent.EventType,
            OccurredAt = integrityEvent.OccurredAt,
            RecordedAt = integrityEvent.RecordedAt,
            SequenceNumber = integrityEvent.SequenceNumber,
            AttemptViolationCount = integrityEvent.AttemptViolationCount,
            StudentViolationCount = integrityEvent.StudentViolationCount,
            PolicyAction = integrityEvent.PolicyAction,
            MetadataJson = integrityEvent.MetadataJson,
            ClientSessionId = integrityEvent.ClientSessionId
        };
    }

    private static string? NormalizeIntegrityEventType(string rawEventType)
    {
        var trimmed = rawEventType.Trim();
        if (!AllowedIntegrityEventTypes.Contains(trimmed))
            return null;

        return AllowedIntegrityEventTypes.First(x => string.Equals(x, trimmed, StringComparison.OrdinalIgnoreCase));
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

    private bool IsAllowedLockdownClient(Exam exam)
    {
        if (!exam.RequiresLockdown)
            return true;

        if (string.Equals(exam.AllowedClient, "StandardBrowser", StringComparison.OrdinalIgnoreCase))
            return true;

        var client = Request.Headers["X-Exam-Client"].FirstOrDefault();
        return string.Equals(client, exam.AllowedClient, StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeLockdownClient(string? value)
    {
        var normalized = NormalizeOptionalValue(value);
        return normalized is "SafeExamBrowser" or "KioskClient" or "StandardBrowser"
            ? normalized
            : "StandardBrowser";
    }

    private static string NormalizeLockdownMode(string? value)
    {
        var normalized = NormalizeOptionalValue(value);
        return normalized is "Strict" or "Advisory" ? normalized : "Advisory";
    }

    private static ExamIntegrityEventDto? TryMapIntegrityEvent(AuditLog log)
    {
        if (string.IsNullOrWhiteSpace(log.DetailsJson))
            return null;

        try
        {
            using var document = JsonDocument.Parse(log.DetailsJson);
            var root = document.RootElement;
            return new ExamIntegrityEventDto
            {
                EventType = root.TryGetProperty("eventType", out var eventType) ? eventType.GetString() ?? "IntegrityEvent" : "IntegrityEvent",
                ViolationCount = root.TryGetProperty("violationCount", out var count) && count.TryGetInt32(out var parsedCount) ? parsedCount : 1,
                Message = root.TryGetProperty("message", out var message) ? message.GetString() : null,
                CreatedAt = log.CreatedAt
            };
        }
        catch
        {
            return null;
        }
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

        var currentTermOfferingIds = await _context.CourseOfferings
            .Where(x =>
                x.Term != null &&
                (x.Term.IsCurrent || x.Term.Status == "Open" || x.Term.Status == "Active" || x.Term.Status == "Draft") &&
                _context.Exams.Any(e => e.CourseOfferingId == x.Id && e.IsPublished && e.Status == "Published"))
            .Select(x => x.Id)
            .ToListAsync();

        return eligibleOfferingIds
            .Concat(currentTermOfferingIds)
            .Distinct()
            .ToList();
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

        return await _context.CourseOfferings.AnyAsync(x =>
            x.Id == exam.CourseOfferingId.Value &&
            x.Term != null &&
            (x.Term.IsCurrent || x.Term.Status == "Open" || x.Term.Status == "Active" || x.Term.Status == "Draft"));
    }
}
