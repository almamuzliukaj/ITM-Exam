using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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
    private const string StudentAccessStatusNotVerified = "NotVerified";
    private const string StudentAccessStatusWaitingForPhysicalVerification = "WaitingForPhysicalVerification";
    private const string StudentAccessStatusApprovalRequested = "ApprovalRequested";
    private const string StudentAccessStatusRejected = "Rejected";
    private const string StudentAccessStatusRemoved = "Removed";
    private const string StudentAccessStatusDeviceChangeRequested = "DeviceChangeRequested";
    private const string StudentAccessStatusTemporarilyOffline = "TemporarilyOffline";
    private const string StudentAccessStatusCodeVerified = "CodeVerified";
    private const string StudentAccessStatusManuallyApproved = "ManuallyApproved";
    private const string StudentAccessStatusStarted = "Started";
    private const string StudentAccessStatusSubmitted = "Submitted";
    private const string ExamAttemptRemovedStatus = "Removed";
    private const int ExamAccessCodeLifetimeMinutes = 3;
    private const int LivePresenceOfflineSeconds = 30;
    private const int IntegrityFinalWarningThreshold = 2;
    private const int IntegrityAutoActionThreshold = 3;
    private const string IntegrityPolicyActionNone = "None";
    private const string IntegrityPolicyActionWarning = "Warning";
    private const string IntegrityPolicyActionFinalWarning = "FinalWarning";
    private const string IntegrityPolicyActionAutoSubmit = "AutoSubmit";
    private static readonly HashSet<string> EvaluationStopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "the", "and", "for", "with", "that", "this", "from", "into", "your", "than", "then", "using",
        "nje", "një", "dhe", "per", "për", "nga", "tek", "nje", "ose", "qe", "që", "eshte", "është",
        "duhet", "mund", "me", "ne", "në", "te", "të", "si", "ku", "nga", "para", "pas", "gjithe", "gjithë"
    };
    private static readonly string[] SqlKeywords =
    [
        "select", "from", "where", "join", "group", "order", "by", "having", "count", "sum", "avg",
        "insert", "update", "delete", "inner", "left", "right", "on", "distinct"
    ];
    private static readonly string[] CSharpKeywords =
    [
        "using", "system", "console", "writeline", "readline", "int", "string", "double", "decimal",
        "parse", "return", "for", "foreach", "while", "if", "else", "class", "static", "void", "main", "public"
    ];
    private static readonly Dictionary<string, string[]> EvaluationSynonyms = new(StringComparer.OrdinalIgnoreCase)
    {
        ["compiler"] = ["kompajler", "compiler", "kompilues"],
        ["interpreter"] = ["interpreter", "interpretues"],
        ["perkthen"] = ["perkthen", "perkthim", "perkthyer", "kompilon", "kompilon", "shnderron", "konverton"],
        ["ekzekuton"] = ["ekzekuton", "ekzekutim", "run", "zbaton"],
        ["hap"] = ["hap", "hapsh", "hapi", "step"],
        ["rresht"] = ["rresht", "rreshti", "line"],
        ["program"] = ["program", "kod", "aplikacion"],
        ["para"] = ["para", "perpara", "meheret"],
        ["lexon"] = ["lexon", "lexim", "read"],
        ["pytje"] = ["pytje", "pyetje", "question"],
        ["numer"] = ["numer", "numri", "number", "n"],
        ["katror"] = ["katror", "square", "n*n", "n * n"],
        ["filter"] = ["filter", "filtron", "where"],
        ["student"] = ["student", "students", "studentet"],
        ["viti"] = ["yearofstudy", "vit", "viti", "year"],
        ["dy"] = ["2", "dy", "two"]
    };
    private static readonly HashSet<string> AllowedIntegrityEventTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "TAB_SWITCH",
        "WINDOW_BLUR",
        "EXIT_FULLSCREEN",
        "COPY_ATTEMPT",
        "PASTE_ATTEMPT",
        "CUT_ATTEMPT",
        "RIGHT_CLICK_ATTEMPT",
        "DEVTOOLS_ATTEMPT",
        "SHORTCUT_ATTEMPT",
        "PRINT_ATTEMPT",
        "FULLSCREEN_REQUEST_FAILED",
        "NETWORK_OFFLINE",
        "BACK_NAVIGATION",
        "CAMERA_UNAVAILABLE",
        "NO_FACE_DETECTED",
        "MULTIPLE_FACES_DETECTED",
        "FACE_DETECTION_ERROR"
    };
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public ExamsController(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Exam>>> GetExams(
        [FromQuery] Guid? courseOfferingId = null,
        [FromQuery] string? publicationState = null,
        [FromQuery] bool? assignedOnly = null,
        [FromQuery] bool? needsGrading = null)
    {
        if (User.IsInRole("Admin"))
            return Forbid();

        IQueryable<Exam> query = _context.Exams
            .Include(x => x.CourseOffering)
                .ThenInclude(x => x!.Course)
            .Include(x => x.CourseOffering)
                .ThenInclude(x => x!.Term)
            .Where(x => !x.Description.StartsWith(QuestionBankMarker));

        var normalizedPublicationState = NormalizePublicationState(publicationState);
        if (publicationState is not null && normalizedPublicationState is null)
            return BadRequest(new { message = "PublicationState must be Draft or Published." });

        if (User.IsInRole("Professor") || User.IsInRole("Assistant"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var assignmentRole = User.IsInRole("Professor") ? "Professor" : "Assistant";
            var assignedOfferingIds = await GetAssignedOfferingIdsAsync(userId.Value, assignmentRole);
            query = query.Where(x =>
                x.CreatedByUserId == userId.Value ||
                (x.CourseOfferingId.HasValue && assignedOfferingIds.Contains(x.CourseOfferingId.Value)));

            if (assignedOnly == true)
            {
                query = query.Where(x =>
                    x.CourseOfferingId.HasValue &&
                    assignedOfferingIds.Contains(x.CourseOfferingId.Value));
            }

            if (courseOfferingId.HasValue)
            {
                if (!assignedOfferingIds.Contains(courseOfferingId.Value))
                    return Forbid();

                query = query.Where(x => x.CourseOfferingId == courseOfferingId.Value);
            }
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

            if (courseOfferingId.HasValue)
                query = query.Where(x => x.CourseOfferingId == courseOfferingId.Value);
        }

        if (normalizedPublicationState == "Draft")
            query = query.Where(x => !x.IsPublished || x.Status == "Draft");
        else if (normalizedPublicationState == "Published")
            query = query.Where(x => x.IsPublished && x.Status == "Published");

        if (needsGrading == true)
            query = query.Where(x => _context.ExamAttempts.Any(a => a.ExamId == x.Id && a.Status == ExamAttemptSubmittedStatus && !a.IsGraded));
        else if (needsGrading == false)
            query = query.Where(x => !_context.ExamAttempts.Any(a => a.ExamId == x.Id && a.Status == ExamAttemptSubmittedStatus && !a.IsGraded));

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
        if (dto.MaximumPoints <= 0)
            return BadRequest(new { message = "MaximumPoints must be greater than 0." });

        if (dto.IsPublished)
            return BadRequest(new { message = "Exams must be created as drafts and published through the publish workflow." });

        var durationMinutes = dto.DurationMinutes > 0 ? dto.DurationMinutes : 60;
        var startsAt = dto.StartsAt?.ToUniversalTime() ?? DateTime.UtcNow;
        var endsAt = dto.EndsAt?.ToUniversalTime() ?? startsAt.AddMinutes(durationMinutes);
        var assessmentType = NormalizeAssessmentType(dto.AssessmentType);
        var examPeriod = NormalizeExamPeriod(dto.ExamPeriod);
        if (User.IsInRole("Assistant") && assessmentType == "Exam")
            return BadRequest(new { message = "Assistants can create only colloquium assessments." });

        if (endsAt <= startsAt)
            return BadRequest(new { message = "EndsAt must be later than StartsAt." });

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (!dto.CourseOfferingId.HasValue)
            return BadRequest(new { message = "CourseOfferingId is required." });

        var offering = await GetAuthorizedCourseOfferingAsync(dto.CourseOfferingId.Value, userId.Value);
        if (offering == null)
            return Forbid();

        var title = BuildExamTitle(dto.Title, offering, assessmentType, examPeriod);
        var academicYear = ResolveAcademicYear(offering, dto.AcademicYear);
        var semesterLabel = ResolveSemesterLabel(offering, dto.SemesterLabel);
        var cohortLabel = ResolveCohortLabel(offering, dto.CohortLabel);

        var exam = new Exam
        {
            Id = Guid.NewGuid(),
            Title = title,
            Description = dto.Description?.Trim() ?? string.Empty,
            StartsAt = startsAt,
            EndsAt = endsAt,
            DurationMinutes = durationMinutes,
            IsPublished = false,
            Status = "Draft",
            RequiresLockdown = false,
            AllowedClient = "StandardBrowser",
            LockdownMode = "Advisory",
            CreatedByUserId = userId.Value,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null,
            PublishedAt = null,
            UnpublishedAt = null,
            AssessmentType = assessmentType,
            ExamPeriod = examPeriod,
            AcademicYear = academicYear,
            SemesterLabel = semesterLabel,
            CohortLabel = cohortLabel,
            CourseOfferingId = offering.Id,
            MaximumPoints = dto.MaximumPoints
        };

        _context.Exams.Add(exam);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Exam.Created", "Exam", exam.Id, new
        {
            exam.Title,
            exam.CourseOfferingId,
            exam.Status,
            exam.MaximumPoints,
            exam.AssessmentType,
            exam.ExamPeriod,
            exam.AcademicYear,
            exam.SemesterLabel,
            exam.CohortLabel,
            exam.RequiresLockdown,
            exam.AllowedClient,
            exam.LockdownMode
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

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (dto.MaximumPoints <= 0)
            return BadRequest(new { message = "MaximumPoints must be greater than 0." });

        if (dto.IsPublished)
            return BadRequest(new { message = "Use the publish workflow to publish a draft exam after readiness checks pass." });

        var durationMinutes = dto.DurationMinutes > 0 ? dto.DurationMinutes : 60;
        var startsAt = dto.StartsAt?.ToUniversalTime() ?? exam.StartsAt;
        var endsAt = dto.EndsAt?.ToUniversalTime() ?? startsAt.AddMinutes(durationMinutes);
        var assessmentType = NormalizeAssessmentType(dto.AssessmentType);
        var examPeriod = NormalizeExamPeriod(dto.ExamPeriod);
        if (User.IsInRole("Assistant") && assessmentType == "Exam")
            return BadRequest(new { message = "Assistants can manage only colloquium assessments." });

        if (endsAt <= startsAt)
            return BadRequest(new { message = "EndsAt must be later than StartsAt." });

        if (!dto.CourseOfferingId.HasValue)
            return BadRequest(new { message = "CourseOfferingId is required." });

        var offering = await GetAuthorizedCourseOfferingAsync(dto.CourseOfferingId.Value, userId.Value);
        if (offering == null)
            return Forbid();

        exam.Title = BuildExamTitle(dto.Title, offering, assessmentType, examPeriod);
        exam.Description = dto.Description?.Trim() ?? string.Empty;
        exam.StartsAt = startsAt;
        exam.EndsAt = endsAt;
        exam.DurationMinutes = durationMinutes;
        exam.IsPublished = false;
        exam.Status = "Draft";
        exam.UpdatedAt = DateTime.UtcNow;
        exam.PublishedAt = null;
        exam.UnpublishedAt = exam.UnpublishedAt ?? DateTime.UtcNow;
        exam.AssessmentType = assessmentType;
        exam.ExamPeriod = examPeriod;
        exam.AcademicYear = ResolveAcademicYear(offering, dto.AcademicYear);
        exam.SemesterLabel = ResolveSemesterLabel(offering, dto.SemesterLabel);
        exam.CohortLabel = ResolveCohortLabel(offering, dto.CohortLabel);
        exam.MaximumPoints = dto.MaximumPoints;
        exam.CourseOfferingId = offering.Id;
        exam.RequiresLockdown = false;
        exam.AllowedClient = "StandardBrowser";
        exam.LockdownMode = "Advisory";

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Exam.Updated", "Exam", exam.Id, new
        {
            exam.Title,
            exam.CourseOfferingId,
            exam.Status,
            exam.MaximumPoints,
            exam.AssessmentType,
            exam.ExamPeriod,
            exam.AcademicYear,
            exam.SemesterLabel,
            exam.CohortLabel,
            exam.RequiresLockdown,
            exam.AllowedClient,
            exam.LockdownMode
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

        var sessionAccessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: false);
        if (sessionAccessError != null)
        {
            if (sessionAccessError == StudentExamNotEligibleMessage)
                return Forbid();

            return BadRequest(new { message = sessionAccessError });
        }

        await EnsureExamHasQuestionsFromBankAsync(exam);

        if (exam.Questions.Count == 0)
            return BadRequest(new { message = "This exam cannot be submitted because it has no questions." });

        var attempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

        var submittedAnswers = dto.Answers ?? [];
        var validationError = ValidateAttemptAnswers(exam, submittedAnswers);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        var (details, autoScore, _, requiresManualGrading) = BuildAttemptEvaluation(exam, submittedAnswers);
        var questionScores = BuildQuestionScoreBreakdown(exam.Questions, submittedAnswers);
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
                QuestionScoresJson = SerializeQuestionScores(questionScores),
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
            attempt.QuestionScoresJson = SerializeQuestionScores(questionScores);
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

        await MarkStudentAccessSubmittedAsync(examId, userId.Value, now);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateExamAttemptException(ex))
        {
            return Conflict(new { message = "An attempt already exists for this exam. Refresh the page and submit again." });
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

        await EnsureExamHasQuestionsFromBankAsync(exam);

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
            await MarkStudentAccessStartedAsync(examId, userId.Value, now);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsDuplicateExamAttemptException(ex))
            {
                attempt = await _context.ExamAttempts
                    .AsNoTracking()
                    .FirstAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

                return Ok(MapToDraftDto(attempt, exam.DurationMinutes));
            }

            await _auditLogService.LogAsync("ExamAttempt.Started", "ExamAttempt", attempt.Id, new
            {
                attempt.ExamId,
                attempt.StudentId,
                attempt.StartedAt
            }, "ExamDelivery");
        }

        await MarkStudentAccessStartedAsync(examId, userId.Value, DateTime.UtcNow);
        await _context.SaveChangesAsync();

        return Ok(MapToDraftDto(attempt, exam.DurationMinutes));
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

        await EnsureExamHasQuestionsFromBankAsync(exam);

        if (exam.Questions.Count == 0)
            return BadRequest(new { message = "This exam cannot accept draft answers because it has no questions." });

        var now = DateTime.UtcNow;
        var answers = dto.Answers ?? [];
        var validationError = ValidateAttemptAnswers(exam, answers);
        if (validationError != null)
            return BadRequest(new { message = validationError });
        var attempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

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

        await MarkStudentAccessStartedAsync(examId, userId.Value, now);
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

        return Ok(MapToDraftDto(attempt, exam.DurationMinutes));
    }

    [HttpPost("{examId:guid}/attempt/questions/{questionId:guid}/run")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<TechnicalRunResultDto>> RunTechnicalAnswer(
        Guid examId,
        Guid questionId,
        [FromBody] RunTechnicalAnswerDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (dto.QuestionId != Guid.Empty && dto.QuestionId != questionId)
            return BadRequest(new { message = "QuestionId in body does not match route." });

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

        await EnsureExamHasQuestionsFromBankAsync(exam);

        var question = exam.Questions.FirstOrDefault(x => x.Id == questionId);
        if (question == null)
            return NotFound(new { message = "Question not found in this exam." });

        if (!IsTechnicalQuestion(question))
            return BadRequest(new { message = "Run is available only for SQL and C# questions." });

        var now = DateTime.UtcNow;
        var attempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(a => a.ExamId == examId && a.StudentId == userId.Value);

        if (attempt?.Status == ExamAttemptSubmittedStatus)
            return BadRequest(new { message = "Submitted attempts cannot be executed again." });

        var response = dto.Response?.Trim() ?? string.Empty;
        var answers = attempt == null ? new List<AnswerDto>() : ParseAttemptAnswers(attempt.AnswersJson);
        var existingAnswer = answers.FirstOrDefault(x => x.QuestionId == questionId);
        if (existingAnswer == null)
        {
            answers.Add(new AnswerDto { QuestionId = questionId, Response = response });
        }
        else
        {
            existingAnswer.Response = response;
        }

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
        }
        else
        {
            attempt.Status = ExamAttemptInProgressStatus;
            attempt.LastSavedAt = now;
            attempt.AnswersJson = JsonSerializer.Serialize(answers);
        }

        await MarkStudentAccessStartedAsync(examId, userId.Value, now);
        await _context.SaveChangesAsync();

        var runResult = BuildTechnicalRunResult(question, response);
        await _auditLogService.LogAsync("ExamAttempt.TechnicalAnswerRun", "ExamAttempt", attempt.Id, new
        {
            attempt.ExamId,
            attempt.StudentId,
            questionId,
            question.Type,
            runResult.Status,
            runResult.ExecutedAt,
            dto.ClientSessionId
        }, "ExamDelivery");

        return Ok(runResult);
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
        await MarkStudentAccessStartedAsync(examId, userId.Value, DateTime.UtcNow);
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
        if (sessionAccessError != null)
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

    [HttpGet("{examId:guid}/access-status")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ExamAccessStatusDto>> GetExamAccessStatus(Guid examId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        var baseAccessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: true, enforceEntryCode: false, enforceRemoval: false);
        if (baseAccessError != null)
        {
            if (baseAccessError == StudentExamNotEligibleMessage)
                return Forbid();

            return BadRequest(new { message = baseAccessError });
        }

        var now = DateTime.UtcNow;
        await DeactivateExpiredAccessCodesAsync(exam.Id, now);
        await _context.SaveChangesAsync();

        var requiresCode = await RequiresEntryCodeAsync(exam.Id);
        var activeCode = requiresCode ? await GetActiveExamAccessCodeAsync(exam.Id) : null;
        var access = await _context.ExamStudentAccesses
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ExamId == exam.Id && x.StudentId == userId.Value);
        var hasAccess = !requiresCode || IsStudentAccessGranted(access);

        return Ok(new ExamAccessStatusDto
        {
            RequiresCode = requiresCode,
            HasActiveCode = activeCode != null,
            HasAccess = hasAccess,
            AccessStatus = access?.AccessStatus ?? StudentAccessStatusNotVerified,
            ActiveCodeExpiresAt = activeCode?.ExpiresAt,
            VerifiedAt = access?.VerifiedAt,
            ApprovedAt = access?.ApprovedAt,
            RequestedAt = access?.AccessStatus is StudentAccessStatusApprovalRequested or StudentAccessStatusWaitingForPhysicalVerification or StudentAccessStatusDeviceChangeRequested ? access.LastActivityAt : null,
            ServerTimeUtc = now,
            ApprovalReason = access?.ApprovalReason ?? string.Empty,
            StudentIdentity = await BuildStudentIdentityDtoAsync(userId.Value),
            Message = BuildAccessStatusMessage(hasAccess, access?.AccessStatus, requiresCode)
        });
    }

    [HttpPost("{examId:guid}/attempt/heartbeat")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ExamAccessStatusDto>> RecordStudentExamHeartbeat(Guid examId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        var baseAccessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: false, enforceEntryCode: false, enforceRemoval: false);
        if (baseAccessError != null)
        {
            if (baseAccessError == StudentExamNotEligibleMessage)
                return Forbid();

            return BadRequest(new { message = baseAccessError });
        }

        var now = DateTime.UtcNow;
        var requiresCode = await RequiresEntryCodeAsync(exam.Id);
        var access = await GetOrCreateStudentAccessAsync(exam.Id, userId.Value);
        var hasAccess = !requiresCode || IsStudentAccessGranted(access);

        if (hasAccess)
        {
            if (requiresCode && access.AccessStatus != StudentAccessStatusSubmitted)
                access.AccessStatus = StudentAccessStatusStarted;
            access.LastActivityAt = now;
            await _context.SaveChangesAsync();
        }

        return Ok(new ExamAccessStatusDto
        {
            RequiresCode = requiresCode,
            HasAccess = hasAccess,
            AccessStatus = access.AccessStatus,
            VerifiedAt = access.VerifiedAt,
            ApprovedAt = access.ApprovedAt,
            RequestedAt = access.AccessStatus is StudentAccessStatusApprovalRequested or StudentAccessStatusWaitingForPhysicalVerification or StudentAccessStatusDeviceChangeRequested ? access.LastActivityAt : null,
            ApprovalReason = access.ApprovalReason,
            StudentIdentity = await BuildStudentIdentityDtoAsync(userId.Value),
            Message = BuildAccessStatusMessage(hasAccess, access.AccessStatus, requiresCode)
        });
    }

    [HttpPost("{examId:guid}/request-approval")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ExamAccessStatusDto>> RequestExamAccessApproval(Guid examId, [FromBody] RequestExamAccessApprovalDto? dto = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        var baseAccessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: true, enforceEntryCode: false);
        if (baseAccessError != null)
        {
            if (baseAccessError == StudentExamNotEligibleMessage)
                return Forbid();

            return BadRequest(new { message = baseAccessError });
        }

        var now = DateTime.UtcNow;
        var access = await GetOrCreateStudentAccessAsync(exam.Id, userId.Value);
        if (IsStudentAccessGranted(access))
        {
            return Ok(new ExamAccessStatusDto
            {
                RequiresCode = await RequiresEntryCodeAsync(exam.Id),
                HasAccess = true,
                AccessStatus = access.AccessStatus,
                VerifiedAt = access.VerifiedAt,
                ApprovedAt = access.ApprovedAt,
                RequestedAt = access.AccessStatus is StudentAccessStatusApprovalRequested or StudentAccessStatusWaitingForPhysicalVerification or StudentAccessStatusDeviceChangeRequested ? access.LastActivityAt : null,
                ApprovalReason = access.ApprovalReason,
                StudentIdentity = await BuildStudentIdentityDtoAsync(userId.Value),
                Message = "Access confirmed. You can continue to the rules screen."
            });
        }

        access.AccessStatus = StudentAccessStatusApprovalRequested;
        access.ApprovalReason = NormalizeOptionalValue(dto?.Reason) ?? "Student requested professor approval.";
        access.LastActivityAt = now;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAccess.ApprovalRequested", "Exam", exam.Id, new
        {
            examId = exam.Id,
            studentId = userId.Value,
            requestedAt = access.LastActivityAt,
            access.ApprovalReason
        }, "ExamDelivery");

        return Ok(new ExamAccessStatusDto
        {
            RequiresCode = await RequiresEntryCodeAsync(exam.Id),
            HasAccess = false,
            AccessStatus = access.AccessStatus,
            VerifiedAt = access.VerifiedAt,
            ApprovedAt = access.ApprovedAt,
            RequestedAt = access.LastActivityAt,
            ApprovalReason = access.ApprovalReason,
            StudentIdentity = await BuildStudentIdentityDtoAsync(userId.Value),
            CodeLifetimeSeconds = ExamAccessCodeLifetimeMinutes * 60,
            Message = "Approval request sent. Wait for your professor before starting the exam."
        });
    }

    [HttpPost("{examId:guid}/verify-entry-code")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ExamAccessStatusDto>> VerifyEntryCode(Guid examId, [FromBody] VerifyExamAccessCodeDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        var baseAccessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: true, enforceEntryCode: false);
        if (baseAccessError != null)
        {
            if (baseAccessError == StudentExamNotEligibleMessage)
                return Forbid();

            return BadRequest(new { message = baseAccessError });
        }

        var submittedCode = NormalizeAccessCode(dto.Code);
        if (string.IsNullOrWhiteSpace(submittedCode))
            return BadRequest(new { message = "Entry code is required." });

        var now = DateTime.UtcNow;
        await DeactivateExpiredAccessCodesAsync(exam.Id, now);
        await _context.SaveChangesAsync();

        var requiresCode = await RequiresEntryCodeAsync(exam.Id);
        if (!requiresCode)
            return BadRequest(new { message = "Entry code is not enabled for this exam yet." });

        var activeCode = await GetActiveExamAccessCodeAsync(exam.Id, now);
        if (activeCode == null)
        {
            await _auditLogService.LogAsync("ExamAccess.CodeExpired", "Exam", exam.Id, new
            {
                examId = exam.Id,
                studentId = userId.Value
            }, "ExamDelivery");

            return BadRequest(new { message = "This entry code has expired. Please ask the professor for a new code." });
        }

        var codeHash = HashAccessCode(submittedCode, exam.Id);
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(activeCode.CodeHash), Encoding.UTF8.GetBytes(codeHash)))
        {
            await _auditLogService.LogAsync("ExamAccess.CodeRejected", "Exam", exam.Id, new
            {
                examId = exam.Id,
                studentId = userId.Value
            }, "ExamDelivery");

            return BadRequest(new { message = "The entry code is not valid for this exam." });
        }

        var access = await GetOrCreateStudentAccessAsync(exam.Id, userId.Value);
        access.AccessStatus = StudentAccessStatusWaitingForPhysicalVerification;
        access.VerifiedAt = now;
        access.LastActivityAt = now;
        access.ApprovalReason = "Access code verified. Waiting for physical identity approval.";

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAccess.CodeVerifiedPhysicalApprovalRequired", "Exam", exam.Id, new
        {
            examId = exam.Id,
            studentId = userId.Value,
            access.VerifiedAt,
            status = access.AccessStatus
        }, "ExamDelivery");

        return Ok(new ExamAccessStatusDto
        {
            RequiresCode = true,
            HasAccess = false,
            HasActiveCode = true,
            AccessStatus = access.AccessStatus,
            ActiveCodeExpiresAt = activeCode.ExpiresAt,
            VerifiedAt = access.VerifiedAt,
            ApprovedAt = access.ApprovedAt,
            RequestedAt = access.LastActivityAt,
            ApprovalReason = access.ApprovalReason,
            StudentIdentity = await BuildStudentIdentityDtoAsync(userId.Value),
            ServerTimeUtc = now,
            CodeLifetimeSeconds = ExamAccessCodeLifetimeMinutes * 60,
            Message = "Access code verified. Please wait for the professor to approve your physical identity before the rules screen opens."
        });
    }

    [HttpPost("{examId:guid}/access-codes")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<ActionResult<ExamAccessCodeResponseDto>> GenerateExamAccessCode(Guid examId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (!exam.IsPublished || exam.Status != "Published")
            return BadRequest(new { message = "Entry codes can be generated only after the assessment is published." });

        if (!exam.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Entry codes require an assessment linked to a course offering." });

        var now = DateTime.UtcNow;
        await DeactivateExpiredAccessCodesAsync(exam.Id, now);
        await _context.SaveChangesAsync();

        var activeCodes = await _context.ExamAccessCodes
            .Where(x => x.ExamId == exam.Id && x.IsActive && x.RevokedAt == null)
            .ToListAsync();

        foreach (var accessCode in activeCodes)
        {
            accessCode.IsActive = false;
            accessCode.RevokedAt = now;
            accessCode.RevokedByUserId = userId.Value;
        }

        var plainCode = GenerateAccessCode();
        var isRegeneration = activeCodes.Count > 0 || await _context.ExamAccessCodes.AnyAsync(x => x.ExamId == exam.Id);
        var created = new ExamAccessCode
        {
            Id = Guid.NewGuid(),
            ExamId = exam.Id,
            CodeHash = HashAccessCode(plainCode, exam.Id),
            GeneratedByUserId = userId.Value,
            GeneratedAt = now,
            ExpiresAt = now.AddMinutes(ExamAccessCodeLifetimeMinutes),
            IsActive = true
        };

        _context.ExamAccessCodes.Add(created);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAccess.CodeGenerated", "Exam", exam.Id, new
        {
            examId = exam.Id,
            created.GeneratedAt,
            created.ExpiresAt,
            isRegeneration,
            revokedCodeCount = activeCodes.Count
        }, "ExamDelivery");

        if (isRegeneration)
        {
            await _auditLogService.LogAsync("ExamAccess.CodeRegenerated", "Exam", exam.Id, new
            {
                examId = exam.Id,
                generatedAt = created.GeneratedAt,
                expiresAt = created.ExpiresAt,
                revokedCodeCount = activeCodes.Count
            }, "ExamDelivery");
        }

        return Ok(new ExamAccessCodeResponseDto
        {
            Id = created.Id,
            Code = plainCode,
            GeneratedAt = created.GeneratedAt,
            ExpiresAt = created.ExpiresAt,
            ServerTimeUtc = now,
            IsActive = created.IsActive
        });
    }

    [HttpPost("{examId:guid}/students/{studentId:guid}/allow-access")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<ActionResult<ExamAccessStatusDto>> AllowStudentExamAccess(Guid examId, Guid studentId, [FromBody] AllowExamStudentAccessDto? dto = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (!await IsStudentEligibleForExamAsync(studentId, exam))
            return BadRequest(new { message = "This student is not eligible for this exam." });

        var now = DateTime.UtcNow;
        var access = await GetOrCreateStudentAccessAsync(exam.Id, studentId);
        access.AccessStatus = StudentAccessStatusManuallyApproved;
        access.ApprovedByUserId = userId.Value;
        access.ApprovedAt = now;
        access.ApprovalReason = NormalizeOptionalValue(dto?.Reason) ?? "Physical identity approved by staff.";
        access.LastActivityAt = now;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAccess.PhysicalIdentityApproved", "Exam", exam.Id, new
        {
            examId = exam.Id,
            studentId,
            approvedByUserId = userId.Value,
            access.ApprovedAt,
            access.ApprovalReason
        }, "ExamDelivery");

        var requiresCode = await RequiresEntryCodeAsync(exam.Id);
        var activeCode = requiresCode ? await GetActiveExamAccessCodeAsync(exam.Id) : null;

        return Ok(new ExamAccessStatusDto
        {
            RequiresCode = requiresCode,
            HasActiveCode = activeCode != null,
            HasAccess = true,
            AccessStatus = access.AccessStatus,
            ActiveCodeExpiresAt = activeCode?.ExpiresAt,
            VerifiedAt = access.VerifiedAt,
            ApprovedAt = access.ApprovedAt,
            RequestedAt = null,
            ServerTimeUtc = now,
            ApprovalReason = access.ApprovalReason,
            CodeLifetimeSeconds = ExamAccessCodeLifetimeMinutes * 60,
            Message = "Student access approved."
        });
    }

    [HttpPost("{examId:guid}/students/{studentId:guid}/reject-access")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<ActionResult<ExamAccessStatusDto>> RejectStudentExamAccess(Guid examId, Guid studentId, [FromBody] AllowExamStudentAccessDto? dto = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (!await IsStudentEligibleForExamAsync(studentId, exam))
            return BadRequest(new { message = "This student is not eligible for this exam." });

        var now = DateTime.UtcNow;
        var access = await GetOrCreateStudentAccessAsync(exam.Id, studentId);
        access.AccessStatus = StudentAccessStatusRejected;
        access.ApprovedByUserId = userId.Value;
        access.ApprovedAt = null;
        access.ApprovalReason = NormalizeOptionalValue(dto?.Reason) ?? "Professor rejected manual admission.";
        access.LastActivityAt = now;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAccess.ManualRejection", "Exam", exam.Id, new
        {
            examId = exam.Id,
            studentId,
            rejectedByUserId = userId.Value,
            rejectedAt = access.LastActivityAt,
            access.ApprovalReason
        }, "ExamDelivery");

        return Ok(new ExamAccessStatusDto
        {
            RequiresCode = await RequiresEntryCodeAsync(exam.Id),
            HasAccess = false,
            AccessStatus = access.AccessStatus,
            VerifiedAt = access.VerifiedAt,
            ApprovedAt = access.ApprovedAt,
            RequestedAt = null,
            ApprovalReason = access.ApprovalReason,
            Message = "Student access request rejected."
        });
    }

    [HttpPost("{examId:guid}/students/{studentId:guid}/revoke-access")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<ActionResult<ExamAccessStatusDto>> RevokeStudentExamAccess(Guid examId, Guid studentId, [FromBody] AllowExamStudentAccessDto? dto = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (!await IsStudentEligibleForExamAsync(studentId, exam))
            return BadRequest(new { message = "This student is not eligible for this exam." });

        var now = DateTime.UtcNow;
        var access = await GetOrCreateStudentAccessAsync(exam.Id, studentId);
        access.AccessStatus = StudentAccessStatusRemoved;
        access.ApprovedAt = null;
        access.ApprovedByUserId = userId.Value;
        access.ApprovalReason = NormalizeOptionalValue(dto?.Reason) ?? "Admission revoked by staff.";
        access.LastActivityAt = now;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAccess.AdmissionRevoked", "Exam", exam.Id, new
        {
            examId = exam.Id,
            studentId,
            revokedByUserId = userId.Value,
            revokedAt = access.LastActivityAt,
            access.ApprovalReason
        }, "ExamDelivery");

        return Ok(new ExamAccessStatusDto
        {
            RequiresCode = await RequiresEntryCodeAsync(exam.Id),
            HasAccess = false,
            AccessStatus = access.AccessStatus,
            VerifiedAt = access.VerifiedAt,
            ApprovedAt = access.ApprovedAt,
            RequestedAt = null,
            ApprovalReason = access.ApprovalReason,
            Message = "Student admission revoked."
        });
    }

    [HttpPost("{examId:guid}/students/{studentId:guid}/remove-access")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<ActionResult<ExamAccessStatusDto>> RemoveStudentFromLiveExam(Guid examId, Guid studentId, [FromBody] AllowExamStudentAccessDto? dto = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (!await IsStudentEligibleForExamAsync(studentId, exam))
            return BadRequest(new { message = "This student is not eligible for this exam." });

        var now = DateTime.UtcNow;
        var reason = NormalizeOptionalValue(dto?.Reason) ?? "Removed by professor during live monitoring.";
        var access = await GetOrCreateStudentAccessAsync(exam.Id, studentId);
        access.AccessStatus = StudentAccessStatusRemoved;
        access.ApprovedByUserId = userId.Value;
        access.ApprovedAt = null;
        access.ApprovalReason = reason;
        access.LastActivityAt = now;

        var attempt = await _context.ExamAttempts
            .FirstOrDefaultAsync(x => x.ExamId == exam.Id && x.StudentId == studentId);
        if (attempt != null && attempt.Status != ExamAttemptSubmittedStatus)
        {
            attempt.Status = ExamAttemptRemovedStatus;
            attempt.LastSavedAt = now;
        }

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAccess.StudentRemoved", "Exam", exam.Id, new
        {
            examId = exam.Id,
            studentId,
            removedByUserId = userId.Value,
            removedAt = now,
            reason,
            attemptId = attempt?.Id,
            preservedAnswers = attempt?.AnswersJson?.Length > 0
        }, "ExamDelivery");

        var requiresCode = await RequiresEntryCodeAsync(exam.Id);

        return Ok(new ExamAccessStatusDto
        {
            RequiresCode = requiresCode,
            HasAccess = false,
            AccessStatus = access.AccessStatus,
            VerifiedAt = access.VerifiedAt,
            ApprovedAt = access.ApprovedAt,
            ServerTimeUtc = now,
            RequestedAt = null,
            ApprovalReason = access.ApprovalReason,
            Message = BuildAccessStatusMessage(false, access.AccessStatus, requiresCode)
        });
    }

    [HttpPost("{examId:guid}/request-device-change")]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<ExamAccessStatusDto>> RequestDeviceChange(Guid examId, [FromBody] DeviceChangeRequestDto? dto = null)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        var baseAccessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: false, enforceEntryCode: false);
        if (baseAccessError != null)
        {
            if (baseAccessError == StudentExamNotEligibleMessage)
                return Forbid();

            return BadRequest(new { message = baseAccessError });
        }

        var now = DateTime.UtcNow;
        var access = await GetOrCreateStudentAccessAsync(exam.Id, userId.Value);
        access.AccessStatus = StudentAccessStatusDeviceChangeRequested;
        access.ApprovedAt = null;
        access.ApprovalReason = NormalizeOptionalValue(dto?.Reason) ?? "Student requested device change approval.";
        access.LastActivityAt = now;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAccess.DeviceChangeRequested", "Exam", exam.Id, new
        {
            examId = exam.Id,
            studentId = userId.Value,
            requestedAt = access.LastActivityAt,
            access.ApprovalReason
        }, "ExamDelivery");

        return Ok(new ExamAccessStatusDto
        {
            RequiresCode = await RequiresEntryCodeAsync(exam.Id),
            HasAccess = false,
            AccessStatus = access.AccessStatus,
            VerifiedAt = access.VerifiedAt,
            ApprovedAt = access.ApprovedAt,
            RequestedAt = access.LastActivityAt,
            ApprovalReason = access.ApprovalReason,
            StudentIdentity = await BuildStudentIdentityDtoAsync(userId.Value),
            Message = "Device change request sent. Wait for staff approval before continuing."
        });
    }

    [HttpGet("{examId:guid}/live-monitor")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<ActionResult<ExamLiveMonitorDto>> GetLiveMonitor(Guid examId)
    {
        var exam = await _context.Exams
            .Include(x => x.CourseOffering)
            .FirstOrDefaultAsync(x => x.Id == examId);
        if (exam == null || exam.Description.StartsWith(QuestionBankMarker))
            return NotFound(new { message = "Exam not found." });

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (!exam.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Exam must be linked to a course offering before live monitoring is available." });

        var students = await _context.StudentCourseEnrollments
            .Where(x => x.CourseOfferingId == exam.CourseOfferingId.Value && x.EligibleForExam)
            .Join(_context.Users,
                enrollment => enrollment.StudentId,
                user => user.Id,
                (enrollment, user) => new { Enrollment = enrollment, Student = user })
            .OrderBy(x => x.Student.FullName)
            .ToListAsync();
        var studentIds = students.Select(x => x.Student.Id).ToList();
        var accesses = await _context.ExamStudentAccesses
            .Where(x => x.ExamId == exam.Id && studentIds.Contains(x.StudentId))
            .ToDictionaryAsync(x => x.StudentId);
        var attempts = await _context.ExamAttempts
            .Where(x => x.ExamId == exam.Id && studentIds.Contains(x.StudentId))
            .ToDictionaryAsync(x => x.StudentId);
        var latestEvents = await _context.ExamIntegrityEvents
            .Where(x => x.ExamId == exam.Id && studentIds.Contains(x.StudentId))
            .GroupBy(x => x.StudentId)
            .Select(group => group.OrderByDescending(x => x.OccurredAt).First())
            .ToDictionaryAsync(x => x.StudentId);
        var now = DateTime.UtcNow;
        await DeactivateExpiredAccessCodesAsync(exam.Id, now);
        await _context.SaveChangesAsync();
        var activeCode = await GetActiveExamAccessCodeAsync(exam.Id);

        var rows = students.Select(item =>
        {
            accesses.TryGetValue(item.Student.Id, out var access);
            attempts.TryGetValue(item.Student.Id, out var attempt);
            latestEvents.TryGetValue(item.Student.Id, out var latestEvent);

            var lastActivityAt = GetLatestActivityAt(access, attempt);
            var durationUsed = attempt?.SubmittedAt is not null
                ? Math.Max(0, (int)Math.Round((attempt.SubmittedAt.Value - attempt.StartedAt).TotalMinutes))
                : attempt is not null && attempt.Status != ExamAttemptRemovedStatus
                    ? Math.Max(0, (int)Math.Round((now - attempt.StartedAt).TotalMinutes))
                    : 0;

            return new ExamLiveMonitorStudentDto
            {
                StudentId = item.Student.Id,
                FullName = item.Student.FullName,
                Email = item.Student.Email,
                StudentNumber = BuildStudentNumber(item.Student),
                PhotoUrl = BuildStudentPhotoUrl(item.Student, exam.Id),
                Initials = BuildInitials(item.Student.FullName, item.Student.Email),
                EnrollmentStatus = item.Enrollment.Status,
                AccessStatus = ResolveLiveAccessStatus(access, attempt, lastActivityAt, now),
                AttemptStatus = attempt?.Status ?? "NotStarted",
                VerifiedAt = access?.VerifiedAt,
                ApprovedAt = access?.ApprovedAt,
                StartedAt = attempt?.StartedAt,
                SubmittedAt = attempt?.SubmittedAt,
                LastActivityAt = lastActivityAt,
                AdmissionReason = access?.ApprovalReason ?? string.Empty,
                HasDeviceChangeRequest = access?.AccessStatus == StudentAccessStatusDeviceChangeRequested,
                DeviceChangeRequestedAt = access?.AccessStatus == StudentAccessStatusDeviceChangeRequested ? access.LastActivityAt : null,
                DurationUsedMinutes = durationUsed,
                ViolationCount = attempt?.IntegrityViolationCount ?? 0,
                LatestViolationAt = latestEvent?.OccurredAt,
                LatestViolationType = latestEvent?.EventType ?? string.Empty,
                IntegritySeverity = ResolveIntegritySeverity(attempt?.IntegrityViolationCount ?? 0)
            };
        }).ToList();

        return Ok(new ExamLiveMonitorDto
        {
            ExamId = exam.Id,
            ExamTitle = exam.Title,
            ActiveCodeExpiresAt = activeCode?.ExpiresAt,
            ServerTimeUtc = now,
            Summary = new ExamLiveMonitorSummaryDto
            {
                TotalEnrolled = rows.Count,
                WaitingForPhysicalVerification = rows.Count(x => x.AccessStatus is StudentAccessStatusWaitingForPhysicalVerification or StudentAccessStatusApprovalRequested),
                Verified = rows.Count(x => x.AccessStatus is StudentAccessStatusManuallyApproved or StudentAccessStatusStarted or StudentAccessStatusSubmitted),
                Active = rows.Count(x => x.AttemptStatus == ExamAttemptInProgressStatus),
                Submitted = rows.Count(x => x.AttemptStatus == ExamAttemptSubmittedStatus),
                NotJoined = rows.Count(x => x.AttemptStatus == "NotStarted"),
                WithViolations = rows.Count(x => x.ViolationCount > 0)
            },
            Students = rows
        });
    }

    private const string StudentExamNotEligibleMessage = "You are not eligible to access this exam.";

    private async Task<string?> GetStudentExamSessionAccessErrorAsync(Guid userId, Exam exam, bool blockResubmission, bool enforceEntryCode = true, bool enforceRemoval = true)
    {
        if (!exam.IsPublished || exam.Status != "Published" || !exam.CourseOfferingId.HasValue)
            return "This exam is not available for students.";

        var now = DateTime.UtcNow;
        if (now < exam.StartsAt)
            return "This exam has not started yet.";

        var hasEligibleEnrollment = await _context.StudentCourseEnrollments.AnyAsync(x =>
            x.StudentId == userId &&
            x.CourseOfferingId == exam.CourseOfferingId.Value &&
            x.EligibleForExam &&
            x.Status == "Eligible");

        if (!hasEligibleEnrollment)
            return StudentExamNotEligibleMessage;

        if (enforceRemoval)
        {
            var removedAccess = await _context.ExamStudentAccesses
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ExamId == exam.Id && x.StudentId == userId && x.AccessStatus == StudentAccessStatusRemoved);

            if (removedAccess != null)
                return BuildAccessStatusMessage(false, StudentAccessStatusRemoved, await RequiresEntryCodeAsync(exam.Id));
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

        if (enforceEntryCode && await RequiresEntryCodeAsync(exam.Id))
        {
            var access = await _context.ExamStudentAccesses
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ExamId == exam.Id && x.StudentId == userId);

            if (access?.AccessStatus == StudentAccessStatusRemoved)
                return "Your exam admission was revoked by staff.";

            if (access?.AccessStatus == StudentAccessStatusRejected)
                return "Your exam admission request was rejected by staff.";

            if (access?.AccessStatus == StudentAccessStatusDeviceChangeRequested)
                return "Device change approval is required before continuing this exam.";

            if (access?.AccessStatus == StudentAccessStatusWaitingForPhysicalVerification)
                return "Physical professor approval is required before starting this exam.";

            if (!IsStudentAccessGranted(access))
                return "Enter the exam access code before starting this exam.";
        }

        return null;
    }

    private async Task<bool> RequiresEntryCodeAsync(Guid examId)
    {
        return await _context.ExamAccessCodes.AnyAsync(x => x.ExamId == examId);
    }

    private async Task<ExamAccessCode?> GetActiveExamAccessCodeAsync(Guid examId, DateTime? at = null)
    {
        var now = at ?? DateTime.UtcNow;
        return await _context.ExamAccessCodes
            .AsNoTracking()
            .Where(x => x.ExamId == examId && x.IsActive && x.RevokedAt == null && x.ExpiresAt > now)
            .OrderByDescending(x => x.GeneratedAt)
            .FirstOrDefaultAsync();
    }

    private async Task<int> DeactivateExpiredAccessCodesAsync(Guid examId, DateTime now)
    {
        var expiredCodes = await _context.ExamAccessCodes
            .Where(x => x.ExamId == examId && x.IsActive && x.ExpiresAt <= now)
            .ToListAsync();

        foreach (var accessCode in expiredCodes)
        {
            accessCode.IsActive = false;
            accessCode.RevokedAt ??= accessCode.ExpiresAt;
        }

        return expiredCodes.Count;
    }

    private async Task<ExamStudentAccess> GetOrCreateStudentAccessAsync(Guid examId, Guid studentId)
    {
        var access = await _context.ExamStudentAccesses
            .FirstOrDefaultAsync(x => x.ExamId == examId && x.StudentId == studentId);

        if (access != null)
            return access;

        access = new ExamStudentAccess
        {
            Id = Guid.NewGuid(),
            ExamId = examId,
            StudentId = studentId,
            AccessStatus = StudentAccessStatusNotVerified
        };
        _context.ExamStudentAccesses.Add(access);
        return access;
    }

    private async Task<StudentIdentityDto?> BuildStudentIdentityDtoAsync(Guid studentId)
    {
        var student = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == studentId);

        if (student == null)
            return null;

        return new StudentIdentityDto
        {
            StudentId = student.Id,
            FullName = student.FullName,
            Email = student.Email,
            StudentNumber = BuildStudentNumber(student),
            PhotoUrl = BuildStudentPhotoUrl(student),
            Initials = BuildInitials(student.FullName, student.Email)
        };
    }

    private static string BuildStudentNumber(User student)
    {
        if (!string.IsNullOrWhiteSpace(student.StudentNumber))
            return student.StudentNumber.Trim();

        var localPart = student.Email.Split('@', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(localPart) && localPart.Any(char.IsDigit))
            return localPart.Trim();

        return $"STU-{student.Id.ToString("N")[..8].ToUpperInvariant()}";
    }

    private string BuildStudentPhotoUrl(User student, Guid? examId = null)
    {
        if (string.IsNullOrWhiteSpace(student.OfficialPhotoFileName))
            return string.Empty;

        return Url.Action("GetStudentPhoto", "StudentIdentities", new { studentId = student.Id, examId }) ?? string.Empty;
    }

    private static string BuildInitials(string? fullName, string? email)
    {
        var parts = (fullName ?? string.Empty)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Take(2)
            .Select(part => char.ToUpperInvariant(part[0]))
            .ToArray();

        if (parts.Length > 0)
            return new string(parts);

        return string.IsNullOrWhiteSpace(email) ? "ST" : email[..1].ToUpperInvariant();
    }

    private static bool IsStudentAccessGranted(ExamStudentAccess? access)
    {
        return access?.AccessStatus is StudentAccessStatusManuallyApproved or StudentAccessStatusStarted or StudentAccessStatusSubmitted;
    }

    private static string BuildAccessStatusMessage(bool hasAccess, string? accessStatus, bool requiresCode)
    {
        if (hasAccess)
            return "Access confirmed. Review the rules before starting the exam.";

        return accessStatus switch
        {
            StudentAccessStatusWaitingForPhysicalVerification => "Access code verified. Wait for physical identity approval from your professor before starting.",
            StudentAccessStatusApprovalRequested => "Approval request sent. Wait for your professor before starting the exam.",
            StudentAccessStatusRejected => "Your manual admission request was rejected. Contact your professor or enter a valid code.",
            StudentAccessStatusRemoved => "You were removed from this live exam session by staff.",
            StudentAccessStatusDeviceChangeRequested => "Device change request sent. Wait for staff approval before continuing.",
            _ when requiresCode => "Enter the exam access code provided by the professor or request manual approval.",
            _ => "Access is available."
        };
    }

    private async Task MarkStudentAccessStartedAsync(Guid examId, Guid studentId, DateTime now)
    {
        if (!await RequiresEntryCodeAsync(examId))
            return;

        var access = await GetOrCreateStudentAccessAsync(examId, studentId);
        if (access.AccessStatus is not StudentAccessStatusSubmitted and not StudentAccessStatusRemoved)
            access.AccessStatus = StudentAccessStatusStarted;
        access.LastActivityAt = now;
    }

    private async Task MarkStudentAccessSubmittedAsync(Guid examId, Guid studentId, DateTime now)
    {
        if (!await RequiresEntryCodeAsync(examId))
            return;

        var access = await GetOrCreateStudentAccessAsync(examId, studentId);
        access.AccessStatus = StudentAccessStatusSubmitted;
        access.LastActivityAt = now;
    }

    private async Task<bool> IsStudentEligibleForExamAsync(Guid studentId, Exam exam)
    {
        if (!exam.CourseOfferingId.HasValue)
            return false;

        return await _context.StudentCourseEnrollments.AnyAsync(x =>
            x.StudentId == studentId &&
            x.CourseOfferingId == exam.CourseOfferingId.Value &&
            x.EligibleForExam &&
            x.Status == "Eligible");
    }

    private static DateTime? GetLatestActivityAt(ExamStudentAccess? access, ExamAttempt? attempt)
    {
        var values = new[]
        {
            attempt?.LastSavedAt,
            attempt?.SubmittedAt,
            access?.LastActivityAt,
            access?.VerifiedAt,
            access?.ApprovedAt,
            attempt?.StartedAt
        };

        var activityValues = values
            .Where(value => value.HasValue)
            .Select(value => value!.Value)
            .ToList();

        return activityValues.Count == 0 ? null : activityValues.Max();
    }

    private static string ResolveLiveAccessStatus(ExamStudentAccess? access, ExamAttempt? attempt, DateTime? lastActivityAt, DateTime now)
    {
        if (access?.AccessStatus == StudentAccessStatusRemoved || attempt?.Status == ExamAttemptRemovedStatus)
            return StudentAccessStatusRemoved;

        if (attempt?.Status == ExamAttemptSubmittedStatus)
            return StudentAccessStatusSubmitted;

        if (attempt?.Status == ExamAttemptInProgressStatus)
        {
            if (lastActivityAt.HasValue && (now - lastActivityAt.Value).TotalSeconds > LivePresenceOfflineSeconds)
                return StudentAccessStatusTemporarilyOffline;

            return StudentAccessStatusStarted;
        }

        return access?.AccessStatus ?? StudentAccessStatusNotVerified;
    }

    private static string ResolveIntegritySeverity(int violationCount)
    {
        if (violationCount >= IntegrityAutoActionThreshold)
            return "High risk";

        if (violationCount > 0)
            return "Warning";

        return "None";
    }

    private static string GenerateAccessCode()
    {
        return RandomNumberGenerator.GetInt32(100000, 999999).ToString();
    }

    private static string NormalizeAccessCode(string? code)
    {
        return Regex.Replace(code ?? string.Empty, "\\s+", string.Empty).Trim().ToUpperInvariant();
    }

    private static string HashAccessCode(string code, Guid examId)
    {
        var scopedCode = $"{examId:N}:{NormalizeAccessCode(code)}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(scopedCode));
        return Convert.ToHexString(bytes);
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

        if (exam.MaximumPoints <= 0)
            return BadRequest(new { message = "Exam maximum points must be greater than 0 before publishing." });

        var hasQuestions = await _context.Questions.AnyAsync(q => q.ExamId == id);
        if (!hasQuestions)
            return BadRequest(new { message = "Exam must have at least one question before publishing." });

        exam.Status = "Published";
        exam.IsPublished = true;
        exam.PublishedAt = DateTime.UtcNow;
        exam.UnpublishedAt = null;
        exam.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Exam.Published", "Exam", exam.Id, new
        {
            exam.CourseOfferingId,
            exam.AssessmentType,
            exam.ExamPeriod,
            exam.PublishedAt,
            exam.RequiresLockdown,
            exam.AllowedClient,
            exam.LockdownMode
        }, "ExamAuthoring");

        return Ok(new { message = "Exam published!", examId = id });
    }

    [HttpPost("{id:guid}/unpublish")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> UnpublishExam(Guid id)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return NotFound();

        if (exam.Description.StartsWith(QuestionBankMarker))
            return NotFound();

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (!exam.IsPublished && exam.Status == "Draft")
            return BadRequest(new { message = "This assessment is already in draft state." });

        var hasAttempts = await _context.ExamAttempts.AnyAsync(x => x.ExamId == id);
        if (hasAttempts)
            return BadRequest(new { message = "This assessment cannot be unpublished because attempts already exist." });

        exam.Status = "Draft";
        exam.IsPublished = false;
        exam.UnpublishedAt = DateTime.UtcNow;
        exam.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Exam.Unpublished", "Exam", exam.Id, new
        {
            exam.CourseOfferingId,
            exam.AssessmentType,
            exam.ExamPeriod,
            exam.UnpublishedAt
        }, "ExamAuthoring");

        return Ok(new { message = "Assessment returned to draft.", examId = id });
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

        var questions = await _context.Questions
            .AsNoTracking()
            .Where(x => x.ExamId == id)
            .OrderBy(x => x.Id)
            .ToListAsync();

        var attempts = await _context.ExamAttempts
            .Where(a => a.ExamId == id && a.Status == ExamAttemptSubmittedStatus)
            .Join(
                _context.Users,
                attempt => attempt.StudentId,
                user => user.Id,
                (attempt, user) => new
                {
                    Attempt = attempt,
                    StudentName = user.FullName,
                    StudentEmail = user.Email
            })
            .OrderByDescending(x => x.Attempt.SubmittedAt)
            .ToListAsync();

        var questionTotal = await _context.Questions
            .Where(x => x.ExamId == id)
            .SumAsync(x => (double)x.Points);
        var examMaxPoints = ResolveExamMaximumPoints(exam, questionTotal);

        var mappedAttempts = attempts
            .Select(item =>
            {
                var scorePercentage = CalculateScorePercentage(item.Attempt.FinalScore, examMaxPoints);
                return new ExamAttemptSummaryDto
                {
                    AttemptId = item.Attempt.Id,
                    ExamId = item.Attempt.ExamId,
                    StudentId = item.Attempt.StudentId,
                    StudentName = item.StudentName,
                    StudentEmail = item.StudentEmail,
                    Status = item.Attempt.Status,
                    GradingStatus = ResolveGradingStatus(item.Attempt),
                    StartedAt = item.Attempt.StartedAt,
                    LastSavedAt = item.Attempt.LastSavedAt,
                    SubmittedAt = item.Attempt.SubmittedAt,
                    AutoScore = item.Attempt.AutoScore,
                    ManualScore = item.Attempt.ManualScore,
                    FinalScore = item.Attempt.FinalScore,
                    ExamMaxPoints = examMaxPoints,
                    ScorePercentage = scorePercentage,
                    FinalGrade = CalculateFinalGrade(scorePercentage),
                    IsPassed = IsPassingGrade(scorePercentage),
                    RequiresManualGrading = item.Attempt.RequiresManualGrading,
                    IsGraded = item.Attempt.IsGraded,
                    IsPublished = item.Attempt.IsPublished,
                    GradedAt = item.Attempt.GradedAt,
                    GradedByUserId = item.Attempt.GradedByUserId,
                    GradingNotes = item.Attempt.GradingNotes,
                    PublishedAt = item.Attempt.PublishedAt,
                    PublishedByUserId = item.Attempt.PublishedByUserId,
                    IntegrityViolationCount = item.Attempt.IntegrityViolationCount,
                    IntegrityLastViolationAt = item.Attempt.IntegrityLastViolationAt,
                    IntegrityPolicyAction = item.Attempt.IntegrityPolicyAction,
                    IntegrityAutoActionTriggeredAt = item.Attempt.IntegrityAutoActionTriggeredAt
                };
            })
            .ToList();

        var attemptIds = mappedAttempts.Select(x => x.AttemptId).ToList();
        var integrityByAttempt = attemptIds.Count == 0
            ? new Dictionary<Guid, List<ExamIntegrityEventDto>>()
            : await _context.ExamIntegrityEvents
                .AsNoTracking()
                .Where(x => attemptIds.Contains(x.ExamAttemptId))
                .OrderByDescending(x => x.RecordedAt)
                .GroupBy(x => x.ExamAttemptId)
                .ToDictionaryAsync(
                    x => x.Key,
                    x => x.Take(8).Select(MapIntegrityEventForReview).ToList());

        var answerRows = await _context.ExamAttempts
            .AsNoTracking()
            .Where(a => attemptIds.Contains(a.Id))
            .Select(a => new { a.Id, a.AnswersJson, a.QuestionScoresJson })
            .ToListAsync();
        var questionScoresByAttempt = answerRows.ToDictionary(
            x => x.Id,
            x => ReadQuestionScoresForReview(questions, x.AnswersJson, x.QuestionScoresJson));
        var answersByAttempt = answerRows.ToDictionary(
            x => x.Id,
            x =>
            {
                var scores = questionScoresByAttempt.TryGetValue(x.Id, out var questionScores) ? questionScores : [];
                return BuildAnswerReview(questions, ParseAttemptAnswers(x.AnswersJson), scores);
            });

        foreach (var attempt in mappedAttempts)
        {
            attempt.Answers = answersByAttempt.TryGetValue(attempt.AttemptId, out var answers) ? answers : [];
            attempt.QuestionScores = questionScoresByAttempt.TryGetValue(attempt.AttemptId, out var questionScores) ? questionScores : [];

            if (integrityByAttempt.TryGetValue(attempt.AttemptId, out var events))
            {
                attempt.IntegrityEvents = events;
                attempt.IntegrityViolationCount = Math.Max(attempt.IntegrityViolationCount, events.Count == 0 ? 0 : events.Max(x => x.ViolationCount));
                attempt.IntegrityLastEventAt = events.Count == 0 ? null : events.Max(x => x.CreatedAt);
            }
        }

        return Ok(mappedAttempts);
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

        var questions = await _context.Questions
            .AsNoTracking()
            .Where(x => x.ExamId == attempt.ExamId)
            .OrderBy(x => x.Id)
            .ToListAsync();
        var examPoints = ResolveExamMaximumPoints(attempt.Exam, questions.Sum(x => (double)x.Points));

        var requestedQuestionScores = dto.QuestionScores ?? [];
        var questionScoreValidationError = ValidateRequestedQuestionScores(questions, requestedQuestionScores);
        if (questionScoreValidationError != null)
            return BadRequest(new { message = questionScoreValidationError });

        var questionScores = ReadQuestionScoresForReview(questions, attempt.AnswersJson, attempt.QuestionScoresJson);
        if (requestedQuestionScores.Count > 0)
        {
            ApplyQuestionScoreOverrides(questionScores, requestedQuestionScores);
        }
        else
        {
            var desiredFinalScore = dto.FinalScore ?? (attempt.AutoScore + (dto.ManualScore ?? attempt.ManualScore));
            if (desiredFinalScore < 0 || (examPoints > 0 && desiredFinalScore > examPoints))
                return BadRequest(new { message = "Final score is outside the allowed exam range." });

            ApplyLegacyOverallAdjustment(questionScores, desiredFinalScore);
        }

        var (autoScore, finalScore, manualScore) = CalculateQuestionScoreTotals(questionScores);

        if (finalScore < 0 || (examPoints > 0 && finalScore > examPoints))
            return BadRequest(new { message = "Final score is outside the allowed exam range." });

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        attempt.QuestionScoresJson = SerializeQuestionScores(questionScores);
        attempt.AutoScore = autoScore;
        attempt.ManualScore = manualScore;
        attempt.FinalScore = finalScore;
        attempt.IsGraded = true;
        attempt.GradedAt = DateTime.UtcNow;
        attempt.GradedByUserId = userId.Value;
        attempt.GradingNotes = NormalizeOptionalValue(dto.Notes);
        var wasPublished = attempt.IsPublished;
        if (wasPublished)
        {
            attempt.IsPublished = false;
            attempt.PublishedAt = null;
            attempt.PublishedByUserId = null;
        }
        var scorePercentage = CalculateScorePercentage(attempt.FinalScore, examPoints);

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamAttempt.Graded", "ExamAttempt", attempt.Id, new
        {
            attempt.ExamId,
            attempt.AutoScore,
            attempt.ManualScore,
            attempt.FinalScore,
            attempt.GradedByUserId,
            attempt.GradedAt,
            wasPublished,
            unpublishedForReview = wasPublished
        }, "Grading");

        return Ok(new ExamAttemptSummaryDto
        {
            AttemptId = attempt.Id,
            ExamId = attempt.ExamId,
            StudentId = attempt.StudentId,
            Status = attempt.Status,
            GradingStatus = ResolveGradingStatus(attempt),
            StartedAt = attempt.StartedAt,
            LastSavedAt = attempt.LastSavedAt,
            SubmittedAt = attempt.SubmittedAt,
            AutoScore = attempt.AutoScore,
            ManualScore = attempt.ManualScore,
            FinalScore = attempt.FinalScore,
            ExamMaxPoints = examPoints,
            ScorePercentage = scorePercentage,
            FinalGrade = CalculateFinalGrade(scorePercentage),
            IsPassed = IsPassingGrade(scorePercentage),
            RequiresManualGrading = attempt.RequiresManualGrading,
            IsGraded = attempt.IsGraded,
            IsPublished = attempt.IsPublished,
            GradedAt = attempt.GradedAt,
            GradedByUserId = attempt.GradedByUserId,
            GradingNotes = attempt.GradingNotes,
            PublishedAt = attempt.PublishedAt,
            PublishedByUserId = attempt.PublishedByUserId,
            IntegrityViolationCount = attempt.IntegrityViolationCount,
            IntegrityLastViolationAt = attempt.IntegrityLastViolationAt,
            IntegrityPolicyAction = attempt.IntegrityPolicyAction,
            IntegrityAutoActionTriggeredAt = attempt.IntegrityAutoActionTriggeredAt,
            QuestionScores = questionScores,
            Answers = BuildAnswerReview(questions, ParseAttemptAnswers(attempt.AnswersJson), questionScores)
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

        foreach (var question in questions.Where(RequiresAiReview))
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
            ReviewReminder = "AI completed the first review. The professor can keep or change this evaluation before publishing the final result.",
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

        var query = _context.ExamAttempts.Where(x =>
            x.ExamId == id &&
            x.Status == ExamAttemptSubmittedStatus &&
            !x.IsPublished);

        if (dto?.PublishAll == false)
        {
            if (dto.AttemptIds.Count == 0)
                return BadRequest(new { message = "At least one attemptId is required when PublishAll is false." });

            query = query.Where(x => dto.AttemptIds.Contains(x.Id));
        }

        var attempts = await query.ToListAsync();
        if (attempts.Count == 0)
            return BadRequest(new { message = "No graded unpublished attempts are available to publish." });

        var notReviewedCount = attempts.Count(x => !x.IsGraded);
        if (notReviewedCount > 0)
            return BadRequest(new { message = $"Cannot publish results yet. {notReviewedCount} attempt(s) still need grading review." });

        var publishedAt = DateTime.UtcNow;
        foreach (var attempt in attempts)
        {
            attempt.IsPublished = true;
            attempt.PublishedAt = publishedAt;
            attempt.PublishedByUserId = userId.Value;
        }

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("ExamResults.Published", "Exam", id, new
        {
            PublishedAttempts = attempts.Count,
            PublishedAttemptIds = attempts.Select(x => x.Id).ToList(),
            PublishedByUserId = userId.Value,
            PublishedAt = publishedAt
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

        var rawResults = await _context.ExamAttempts
            .Where(x => x.StudentId == userId.Value && x.Status == ExamAttemptSubmittedStatus && x.IsPublished)
            .Join(
                _context.Exams,
                attempt => attempt.ExamId,
                exam => exam.Id,
                (attempt, exam) => new
                {
                    AttemptId = attempt.Id,
                    ExamId = attempt.ExamId,
                    ExamTitle = exam.Title,
                    SubmittedAt = attempt.SubmittedAt,
                    Status = "Published",
                    IsPublished = attempt.IsPublished,
                    FinalScore = attempt.FinalScore,
                    AutoScore = attempt.AutoScore,
                    GradingNotes = attempt.GradingNotes,
                    PublishedAt = attempt.PublishedAt
                })
            .OrderByDescending(x => x.SubmittedAt)
            .ToListAsync();

        var examPointLookup = await _context.Exams
            .Select(exam => new { exam.Id, exam.MaximumPoints })
            .ToDictionaryAsync(x => x.Id, x => (double)Math.Max(x.MaximumPoints, 0));

        var results = rawResults
            .Select(item =>
            {
                var examMaxPoints = examPointLookup.GetValueOrDefault(item.ExamId, 0);
                var scorePercentage = CalculateScorePercentage(item.FinalScore, examMaxPoints);
                return new StudentExamResultDto
                {
                    AttemptId = item.AttemptId,
                    ExamId = item.ExamId,
                    ExamTitle = item.ExamTitle,
                    SubmittedAt = item.SubmittedAt,
                    Status = item.Status,
                    IsPublished = item.IsPublished,
                    FinalScore = item.FinalScore,
                    AutoScore = item.AutoScore,
                    ExamMaxPoints = examMaxPoints,
                    ScorePercentage = scorePercentage,
                    FinalGrade = CalculateFinalGrade(scorePercentage),
                    IsPassed = IsPassingGrade(scorePercentage),
                    GradingNotes = item.GradingNotes,
                    PublishedAt = item.PublishedAt
                };
            })
            .ToList();

        await _auditLogService.LogAsync("StudentResults.ListViewed", "User", userId.Value, new
        {
            studentId = userId.Value,
            totalResults = results.Count,
            publishedResults = results.Count,
            pendingResults = 0
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

        var rawResult = await _context.ExamAttempts
            .Where(x => x.Id == attemptId && x.StudentId == userId.Value && x.Status == ExamAttemptSubmittedStatus)
            .Join(
                _context.Exams,
                attempt => attempt.ExamId,
                exam => exam.Id,
                (attempt, exam) => new
                {
                    AttemptId = attempt.Id,
                    ExamId = attempt.ExamId,
                    ExamTitle = exam.Title,
                    SubmittedAt = attempt.SubmittedAt,
                    Status = attempt.IsPublished ? "Published" : (attempt.IsGraded ? "ReadyToPublish" : "Pending"),
                    IsPublished = attempt.IsPublished,
                    FinalScore = attempt.FinalScore,
                    AutoScore = attempt.AutoScore,
                    GradingNotes = attempt.GradingNotes,
                    PublishedAt = attempt.PublishedAt,
                    RequiresManualGrading = attempt.RequiresManualGrading,
                    IsGraded = attempt.IsGraded,
                    ExamMaximumPoints = exam.MaximumPoints
                })
            .FirstOrDefaultAsync();

        if (rawResult == null)
            return NotFound(new { message = "Result not found." });

        var resultExamPoints = Math.Max(rawResult.ExamMaximumPoints, 0);
        var resultScorePercentage = rawResult.IsPublished ? CalculateScorePercentage(rawResult.FinalScore, resultExamPoints) : (double?)null;
        var result = new StudentExamResultDetailDto
        {
            AttemptId = rawResult.AttemptId,
            ExamId = rawResult.ExamId,
            ExamTitle = rawResult.ExamTitle,
            SubmittedAt = rawResult.SubmittedAt,
            Status = rawResult.Status,
            IsPublished = rawResult.IsPublished,
            FinalScore = rawResult.IsPublished ? rawResult.FinalScore : null,
            AutoScore = rawResult.IsPublished ? rawResult.AutoScore : null,
            ExamMaxPoints = rawResult.IsPublished ? resultExamPoints : null,
            ScorePercentage = resultScorePercentage,
            FinalGrade = resultScorePercentage.HasValue ? CalculateFinalGrade(resultScorePercentage.Value) : null,
            IsPassed = resultScorePercentage.HasValue ? IsPassingGrade(resultScorePercentage.Value) : null,
            GradingNotes = rawResult.IsPublished ? rawResult.GradingNotes : null,
            PublishedAt = rawResult.PublishedAt,
            RequiresManualGrading = rawResult.RequiresManualGrading,
            IsGraded = rawResult.IsGraded
        };

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

        if (exam.IsPublished)
            return BadRequest(new { message = "Question generation is available only while the exam is still a draft." });

        if (!exam.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Exam must be linked to a course offering before generating questions." });

        var bankExam = await FindQuestionBankContainerAsync(exam.CourseOfferingId.Value);
        if (bankExam == null)
            return BadRequest(new { message = "No question bank exists for this course offering yet." });

        var candidates = await BuildQuestionBankCandidateQuery(bankExam.Id, dto.Type).ToListAsync();

        var existingQuestions = exam.Questions.ToList();
        var replaceExisting = dto.ReplaceExisting;
        var availableCandidates = candidates
            .Where(candidate => replaceExisting || !existingQuestions.Any(existing => IsSameQuestionContent(existing, candidate)))
            .OrderBy(_ => Guid.NewGuid())
            .ToList();

        if (availableCandidates.Count == 0)
            return BadRequest(new { message = "No matching question bank entries are available for this request." });

        if (availableCandidates.Count < dto.NumberOfQuestions)
            return BadRequest(new { message = $"Only {availableCandidates.Count} matching question bank entries are available. Lower the count or add more questions to the bank." });

        var currentTotalPoints = replaceExisting ? 0 : existingQuestions.Sum(question => question.Points);
        var targetPoints = Math.Max(exam.MaximumPoints - currentTotalPoints, 0);
        if (targetPoints <= 0)
            return BadRequest(new { message = "This exam already meets or exceeds its maximum points. Adjust existing question points before generating more questions." });

        var selectedCandidates = SelectBestQuestionSubset(availableCandidates, targetPoints, dto.NumberOfQuestions);
        if (selectedCandidates.Count == 0)
            return BadRequest(new { message = "No valid question combination could be created for the remaining exam points." });

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (replaceExisting && existingQuestions.Count > 0)
        {
            _context.Questions.RemoveRange(existingQuestions);
        }

        var createdQuestions = selectedCandidates
            .Select(candidate => CloneQuestionForExam(candidate, exam.Id))
            .ToList();

        _context.Questions.AddRange(createdQuestions);
        exam.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        var createdPoints = createdQuestions.Sum(question => question.Points);
        var difference = createdPoints - targetPoints;

        return Ok(new GenerateRandomExamQuestionsResponseDto
        {
            Questions = createdQuestions.Select(MapToExamQuestionResponse).ToList(),
            RequestedQuestionCount = dto.NumberOfQuestions,
            CreatedQuestionCount = createdQuestions.Count,
            ReplacedQuestionCount = replaceExisting ? existingQuestions.Count : 0,
            TargetPoints = targetPoints,
            TotalPoints = createdPoints,
            Difference = difference,
            IsExactMatch = difference == 0,
            Message = BuildGenerationFeedbackMessage(targetPoints, createdPoints, difference)
        });
    }

    [HttpPost("{examId:guid}/questions/from-bank")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> AddSelectedQuestionsFromBank(Guid examId, [FromBody] AddSelectedExamQuestionsDto dto)
    {
        var requestedIds = dto.QuestionBankQuestionIds
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        if (requestedIds.Count == 0)
            return BadRequest(new { message = "Select at least one question from the question bank." });

        var exam = await _context.Exams
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == examId);

        if (exam == null)
            return NotFound(new { message = "Exam not found." });

        if (exam.Description.StartsWith(QuestionBankMarker))
            return NotFound();

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (exam.IsPublished || exam.Status == "Published")
            return BadRequest(new { message = "Published exams cannot be modified. Return the exam to draft before changing questions." });

        if (!exam.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Exam must be linked to a course offering before adding question bank questions." });

        var bankExam = await FindQuestionBankContainerAsync(exam.CourseOfferingId.Value);
        if (bankExam == null)
            return BadRequest(new { message = "No question bank exists for this course offering yet." });

        var selectedBankQuestions = await BuildQuestionBankCandidateQuery(bankExam.Id, null)
            .Where(question => requestedIds.Contains(question.Id))
            .ToListAsync();

        if (selectedBankQuestions.Count == 0)
            return BadRequest(new { message = "None of the selected questions were found in this course question bank." });

        var createdQuestions = selectedBankQuestions
            .Where(candidate => !exam.Questions.Any(existing => IsSameQuestionContent(existing, candidate)))
            .Select(candidate => CloneQuestionForExam(candidate, exam.Id))
            .ToList();

        if (createdQuestions.Count == 0)
            return BadRequest(new { message = "The selected questions are already included in this exam." });

        _context.Questions.AddRange(createdQuestions);
        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync("ExamQuestions.AddedFromBank", "Exam", exam.Id, new
        {
            AddedQuestionCount = createdQuestions.Count,
            RequestedQuestionCount = requestedIds.Count,
            exam.CourseOfferingId
        }, "ExamAuthoring");

        return Ok(new
        {
            Questions = createdQuestions.Select(MapToExamQuestionResponse).ToList(),
            Message = $"Added {createdQuestions.Count} selected question(s) to the exam."
        });
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

        if (exam.IsPublished || exam.Status == "Published")
            return BadRequest(new { message = "Published exams cannot be modified. Return the exam to draft before replacing questions." });

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
        existingQuestion.Topic = selectedReplacement.Topic;
        existingQuestion.Difficulty = selectedReplacement.Difficulty;
        existingQuestion.OptionsJson = selectedReplacement.OptionsJson;
        existingQuestion.MetadataJson = selectedReplacement.MetadataJson;
        existingQuestion.Points = selectedReplacement.Points;
        existingQuestion.CourseId = selectedReplacement.CourseId;

        await _context.SaveChangesAsync();

        return Ok(MapToExamQuestionResponse(existingQuestion));
    }

    [HttpPost("{examId:guid}/questions/{questionId:guid}/replace-with-bank-question")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> ReplaceExamQuestionWithSelectedBankQuestion(Guid examId, Guid questionId, [FromBody] ReplaceWithBankQuestionDto dto)
    {
        if (dto.QuestionBankQuestionId == Guid.Empty)
            return BadRequest(new { message = "Select a replacement question from the question bank." });

        var exam = await _context.Exams
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == examId);

        if (exam == null)
            return NotFound(new { message = "Exam not found." });

        if (exam.Description.StartsWith(QuestionBankMarker))
            return NotFound();

        if (!await CanManageExamAsync(exam))
            return Forbid();

        if (exam.IsPublished || exam.Status == "Published")
            return BadRequest(new { message = "Published exams cannot be modified. Return the exam to draft before replacing questions." });

        if (!exam.CourseOfferingId.HasValue)
            return BadRequest(new { message = "Exam must be linked to a course offering before replacing questions." });

        var existingQuestion = exam.Questions.FirstOrDefault(x => x.Id == questionId);
        if (existingQuestion == null)
            return NotFound(new { message = "Question not found in this exam." });

        var bankExam = await FindQuestionBankContainerAsync(exam.CourseOfferingId.Value);
        if (bankExam == null)
            return BadRequest(new { message = "No question bank exists for this course offering yet." });

        var selectedReplacement = await BuildQuestionBankCandidateQuery(bankExam.Id, null)
            .FirstOrDefaultAsync(candidate => candidate.Id == dto.QuestionBankQuestionId);

        if (selectedReplacement == null)
            return BadRequest(new { message = "The selected replacement question does not belong to this course question bank." });

        if (IsSameQuestionContent(existingQuestion, selectedReplacement))
            return BadRequest(new { message = "Choose a different question as the replacement." });

        if (exam.Questions.Any(question => question.Id != existingQuestion.Id && IsSameQuestionContent(question, selectedReplacement)))
            return BadRequest(new { message = "The selected replacement question is already included in this exam." });

        existingQuestion.Text = selectedReplacement.Text;
        existingQuestion.Type = selectedReplacement.Type;
        existingQuestion.CorrectAnswer = selectedReplacement.CorrectAnswer;
        existingQuestion.Topic = selectedReplacement.Topic;
        existingQuestion.Difficulty = selectedReplacement.Difficulty;
        existingQuestion.OptionsJson = selectedReplacement.OptionsJson;
        existingQuestion.MetadataJson = selectedReplacement.MetadataJson;
        existingQuestion.Points = selectedReplacement.Points;
        existingQuestion.CourseId = selectedReplacement.CourseId;

        await _context.SaveChangesAsync();

        await _auditLogService.LogAsync("ExamQuestion.ReplacedWithBankQuestion", "Question", existingQuestion.Id, new
        {
            ExamId = exam.Id,
            ReplacementQuestionBankQuestionId = selectedReplacement.Id,
            exam.CourseOfferingId
        }, "ExamAuthoring");

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

        return await UserHasOfferingAccessAsync(exam.CourseOfferingId.Value, userId.Value, assignmentRole);
    }

    private async Task<CourseOffering?> GetAuthorizedCourseOfferingAsync(Guid offeringId, Guid userId)
    {
        var assignmentRole = User.IsInRole("Professor")
            ? "Professor"
            : User.IsInRole("Assistant")
                ? "Assistant"
                : string.Empty;

        if (string.IsNullOrWhiteSpace(assignmentRole))
            return null;

        var offering = await _context.CourseOfferings
            .Include(x => x.Course)
            .Include(x => x.Term)
            .FirstOrDefaultAsync(x => x.Id == offeringId);

        if (offering == null)
            return null;

        var hasAccess = await UserHasOfferingAccessAsync(offeringId, userId, assignmentRole);
        return hasAccess ? offering : null;
    }

    private async Task<bool> UserHasOfferingAccessAsync(Guid offeringId, Guid userId, string assignmentRole)
    {
        var hasStaffAssignment = await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
            a.CourseOfferingId == offeringId &&
            a.UserId == userId &&
            a.IsActive &&
            a.RoleInOffering == assignmentRole);

        if (hasStaffAssignment)
            return true;

        return assignmentRole switch
        {
            "Professor" => await _context.CourseOfferings.AnyAsync(x => x.Id == offeringId && x.PrimaryProfessorId == userId),
            "Assistant" => await _context.CourseOfferings.AnyAsync(x => x.Id == offeringId && x.AssistantId == userId),
            _ => false
        };
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
            Topic = source.Topic,
            Difficulty = source.Difficulty,
            OptionsJson = source.OptionsJson,
            MetadataJson = source.MetadataJson,
            Points = source.Points
        };
    }

    private async Task EnsureExamHasQuestionsFromBankAsync(Exam exam)
    {
        if (exam.Questions.Count > 0 || !exam.CourseOfferingId.HasValue)
            return;

        var bankExam = await FindQuestionBankContainerAsync(exam.CourseOfferingId.Value);
        if (bankExam == null)
            return;

        var candidates = await BuildQuestionBankCandidateQuery(bankExam.Id, null)
            .OrderBy(_ => Guid.NewGuid())
            .Take(10)
            .ToListAsync();

        if (candidates.Count == 0)
            return;

        var createdQuestions = candidates
            .Select(candidate => CloneQuestionForExam(candidate, exam.Id))
            .ToList();

        _context.Questions.AddRange(createdQuestions);
        foreach (var question in createdQuestions)
        {
            exam.Questions.Add(question);
        }

        await _context.SaveChangesAsync();
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
            Topic = question.Topic,
            Difficulty = question.Difficulty,
            CorrectAnswerCount = GetCorrectAnswers(question.CorrectAnswer).Count,
            Options = ParseOptions(question.OptionsJson),
            Points = question.Points,
            TechnicalMetadata = QuestionTechnicalMetadataMapper.BuildResponseMetadata(question, includePrivateFields: true)
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
    private static (List<QuestionScoreDetailDto> details, double autoScore, double aiManualScore, bool requiresManualGrading) BuildAttemptEvaluation(Exam exam, List<AnswerDto> submittedAnswers)
    {
        var details = new List<QuestionScoreDetailDto>();
        double autoScore = 0;
        double aiManualScore = 0;
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
                    IsCorrectMcqResponse(question.CorrectAnswer, answer.Response))
                {
                    awarded = question.Points;
                }
            }
            else
            {
                requiresManualGrading = true;
                aiManualScore += BuildTextEvaluationSuggestion(question, answer.Response).SuggestedPoints;
            }

            details.Add(new QuestionScoreDetailDto
            {
                QuestionId = question.Id,
                PointsAwarded = awarded,
                MaxPoints = question.Points
            });

            autoScore += awarded;
        }

        return (details, autoScore, Math.Round(aiManualScore, 2), requiresManualGrading);
    }

    private static ExamAttemptDraftDto MapToDraftDto(ExamAttempt attempt, int durationMinutes)
    {
        var safeDurationMinutes = Math.Max(1, durationMinutes <= 0 ? 60 : durationMinutes);
        return new ExamAttemptDraftDto
        {
            ExamAttemptId = attempt.Id,
            Status = attempt.Status,
            StartedAt = attempt.StartedAt,
            ExpiresAt = attempt.StartedAt.AddMinutes(safeDurationMinutes),
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
        var normalized = trimmed switch
        {
            "TabHidden" => "TAB_SWITCH",
            "WindowBlur" => "WINDOW_BLUR",
            "FullscreenExit" => "EXIT_FULLSCREEN",
            "CopyAttempt" => "COPY_ATTEMPT",
            "PasteAttempt" => "PASTE_ATTEMPT",
            "CutAttempt" => "CUT_ATTEMPT",
            "RightClickAttempt" => "RIGHT_CLICK_ATTEMPT",
            "ShortcutAttempt" => "SHORTCUT_ATTEMPT",
            "PrintAttempt" => "PRINT_ATTEMPT",
            "FullscreenRequestFailed" => "FULLSCREEN_REQUEST_FAILED",
            "NetworkOffline" => "NETWORK_OFFLINE",
            "NoFaceDetected" => "NO_FACE_DETECTED",
            "MultipleFacesDetected" => "MULTIPLE_FACES_DETECTED",
            "CameraUnavailable" => "CAMERA_UNAVAILABLE",
            "FaceDetectionError" => "FACE_DETECTION_ERROR",
            _ => trimmed.ToUpperInvariant()
        };

        if (!AllowedIntegrityEventTypes.Contains(normalized))
            return null;

        return AllowedIntegrityEventTypes.First(x => string.Equals(x, normalized, StringComparison.OrdinalIgnoreCase));
    }
    private static AiTextEvaluationQuestionDto BuildTextEvaluationSuggestion(Question question, string response)
    {
        var expectedAnswer = ResolveExpectedAnswer(question);
        var cleanResponse = response.Trim();

        if (string.IsNullOrWhiteSpace(cleanResponse))
        {
            return new AiTextEvaluationQuestionDto
            {
                QuestionId = question.Id,
                Prompt = ResolveQuestionPrompt(question),
                QuestionType = question.Type,
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
                Prompt = ResolveQuestionPrompt(question),
                QuestionType = question.Type,
                Response = cleanResponse,
                ExpectedAnswer = expectedAnswer,
                MaxPoints = question.Points,
                SuggestedPoints = 0,
                Confidence = "Low",
                Rationale = "No expected answer or grading note is available, so staff review is required."
            };
        }

        return string.Equals(question.Type, "SQL", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(question.Type, "CSharp", StringComparison.OrdinalIgnoreCase)
            ? BuildTechnicalEvaluationSuggestion(question, cleanResponse, expectedAnswer)
            : BuildWrittenEvaluationSuggestion(question, cleanResponse, expectedAnswer);
    }

    private static AiTextEvaluationQuestionDto BuildWrittenEvaluationSuggestion(Question question, string cleanResponse, string expectedAnswer)
    {
        var expectedTerms = TokenizeOrderedTerms(expectedAnswer, preserveShortTerms: false);
        var responseTerms = TokenizeOrderedTerms(cleanResponse, preserveShortTerms: false);
        var expectedTokens = expectedTerms.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var responseTokens = responseTerms.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var expectedConceptGroups = BuildConceptGroups(expectedTokens);
        var responseConceptGroups = BuildConceptGroups(responseTokens);
        var semanticRecall = expectedConceptGroups.Count == 0
            ? 0
            : expectedConceptGroups.Count(group => responseConceptGroups.Contains(group)) / (double)expectedConceptGroups.Count;

        var recall = expectedTokens.Count == 0
            ? 0
            : expectedTokens.Count(token => responseTokens.Contains(token)) / (double)expectedTokens.Count;
        var precision = responseTokens.Count == 0
            ? 0
            : responseTokens.Count(token => expectedTokens.Contains(token)) / (double)responseTokens.Count;

        var expectedPhrases = BuildPhrases(expectedTerms, 2);
        var responsePhrases = BuildPhrases(responseTerms, 2);
        var phraseRecall = expectedPhrases.Count == 0
            ? 0
            : expectedPhrases.Count(phrase => responsePhrases.Contains(phrase)) / (double)expectedPhrases.Count;

        var completeness = expectedTerms.Count == 0
            ? 0
            : Math.Min(responseTerms.Count / (double)expectedTerms.Count, 1);

        var scoreRatio = Math.Clamp(
            (semanticRecall * 0.35) +
            (recall * 0.25) +
            (precision * 0.1) +
            (phraseRecall * 0.15) +
            (completeness * 0.15), 0, 1);

        // Be more generous when the student clearly covers the expected concepts
        // but uses different wording or ordering than the reference answer.
        if (semanticRecall >= 0.9 && recall >= 0.75)
            scoreRatio = Math.Max(scoreRatio, 0.95);
        else if (semanticRecall >= 0.8 && recall >= 0.65)
            scoreRatio = Math.Max(scoreRatio, 0.88);
        else if (semanticRecall >= 0.7 && recall >= 0.55)
            scoreRatio = Math.Max(scoreRatio, 0.8);

        if (responseTerms.Count <= 2)
            scoreRatio = Math.Min(scoreRatio, 0.35);

        if (cleanResponse.Length < 20)
            scoreRatio *= 0.85;

        var matchedConcepts = expectedConceptGroups
            .Where(responseConceptGroups.Contains)
            .Take(6)
            .ToList();
        var confidence = scoreRatio >= 0.8 ? "High" : scoreRatio >= 0.5 ? "Medium" : "Low";
        var rationale = matchedConcepts.Count > 0
            ? $"Matched key concepts: {string.Join(", ", matchedConcepts)}. Semantic concept recall {Math.Round(semanticRecall * 100)}%, term recall {Math.Round(recall * 100)}%, and phrase recall {Math.Round(phraseRecall * 100)}%."
            : "Very few expected concepts were found in the answer. Staff review is strongly recommended.";

        return new AiTextEvaluationQuestionDto
        {
            QuestionId = question.Id,
            Prompt = ResolveQuestionPrompt(question),
            QuestionType = question.Type,
            Response = cleanResponse,
            ExpectedAnswer = expectedAnswer,
            MaxPoints = question.Points,
            SuggestedPoints = Math.Round(question.Points * scoreRatio, 2),
            Confidence = confidence,
            Rationale = rationale
        };
    }

    private static AiTextEvaluationQuestionDto BuildTechnicalEvaluationSuggestion(Question question, string cleanResponse, string expectedAnswer)
    {
        var prompt = ResolveQuestionPrompt(question);
        var normalizedExpected = NormalizeTechnicalText(expectedAnswer);
        var normalizedResponse = NormalizeTechnicalText(cleanResponse);
        var normalizedPrompt = NormalizeTechnicalText(prompt);

        if (!string.IsNullOrWhiteSpace(normalizedExpected) &&
            string.Equals(normalizedExpected, normalizedResponse, StringComparison.OrdinalIgnoreCase))
        {
            return new AiTextEvaluationQuestionDto
            {
                QuestionId = question.Id,
                Prompt = prompt,
                QuestionType = question.Type,
                Response = cleanResponse,
                ExpectedAnswer = expectedAnswer,
                MaxPoints = question.Points,
                SuggestedPoints = question.Points,
                Confidence = "High",
                Rationale = "The submitted technical answer matches the expected solution pattern very closely."
            };
        }

        var expectedConcepts = ExtractTechnicalConcepts(expectedAnswer, question.Type, prompt);
        var responseConcepts = ExtractTechnicalConcepts(cleanResponse, question.Type, prompt);
        var conceptRecall = expectedConcepts.Count == 0
            ? 0
            : expectedConcepts.Count(token => responseConcepts.Contains(token)) / (double)expectedConcepts.Count;
        var conceptPrecision = responseConcepts.Count == 0
            ? 0
            : responseConcepts.Count(token => expectedConcepts.Contains(token)) / (double)responseConcepts.Count;

        var requiredKeywords = ExtractRequiredKeywords(expectedAnswer, question.Type, prompt);
        var matchedKeywords = requiredKeywords.Where(keyword => normalizedResponse.Contains(keyword, StringComparison.OrdinalIgnoreCase)).ToList();
        var keywordCoverage = requiredKeywords.Count == 0
            ? 0
            : matchedKeywords.Count / (double)requiredKeywords.Count;

        var structureCoverage = EvaluateTechnicalStructure(question.Type, normalizedResponse, normalizedExpected, prompt);
        var lengthCoverage = Math.Min(cleanResponse.Length / (double)Math.Max(expectedAnswer.Length, 1), 1);

        var scoreRatio = Math.Clamp(
            (conceptRecall * 0.4) +
            (conceptPrecision * 0.1) +
            (keywordCoverage * 0.3) +
            (structureCoverage * 0.15) +
            (lengthCoverage * 0.05), 0, 1);

        if (cleanResponse.Length < 12)
            scoreRatio *= 0.65;

        var exactIntentCoverage = EvaluateTechnicalIntentCoverage(question.Type, normalizedResponse, normalizedExpected, normalizedPrompt);
        if (exactIntentCoverage >= 0.99)
            scoreRatio = Math.Max(scoreRatio, 0.98);
        else if (exactIntentCoverage >= 0.9)
            scoreRatio = Math.Max(scoreRatio, 0.92);
        else if (exactIntentCoverage >= 0.75)
            scoreRatio = Math.Max(scoreRatio, 0.82);

        var confidence = scoreRatio >= 0.8 ? "High" : scoreRatio >= 0.5 ? "Medium" : "Low";
        var rationale = matchedKeywords.Count > 0
            ? $"Matched technical markers: {string.Join(", ", matchedKeywords.Take(6))}. Required-structure coverage {Math.Round(structureCoverage * 100)}%. Intent coverage {Math.Round(exactIntentCoverage * 100)}%."
            : "The response does not include enough of the expected technical markers or structure.";

        return new AiTextEvaluationQuestionDto
        {
            QuestionId = question.Id,
            Prompt = prompt,
            QuestionType = question.Type,
            Response = cleanResponse,
            ExpectedAnswer = expectedAnswer,
            MaxPoints = question.Points,
            SuggestedPoints = Math.Round(question.Points * scoreRatio, 2),
            Confidence = confidence,
            Rationale = rationale
        };
    }

    private static HashSet<string> TokenizeForEvaluation(string value)
    {
        return TokenizeOrderedTerms(value, preserveShortTerms: false).ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static List<string> TokenizeOrderedTerms(string value, bool preserveShortTerms)
    {
        var normalizedChars = NormalizeForEvaluation(value)
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : ' ')
            .ToArray();

        return new string(normalizedChars)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(token => preserveShortTerms || token.Length > 2)
            .Where(token => preserveShortTerms || !EvaluationStopWords.Contains(token))
            .Select(NormalizeTokenForEvaluation)
            .ToList();
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

    private static string NormalizeAssessmentType(string? value)
    {
        var normalized = NormalizeOptionalValue(value)?.Replace(" ", "", StringComparison.OrdinalIgnoreCase);
        return normalized switch
        {
            "Colloquium1" or "Kollokfium1" or "Midterm1" => "Colloquium 1",
            "Colloquium2" or "Kollokfium2" or "Midterm2" => "Colloquium 2",
            "Practice" or "PracticeExam" or "PracticeAssessment" or "Ushtrime" => "Practice Assessment",
            "Final" or "FinalExam" or "Exam" or "Provim" => "Exam",
            _ => "Exam"
        };
    }

    private static string NormalizeExamPeriod(string? value)
    {
        var normalized = NormalizeOptionalValue(value);
        if (string.IsNullOrWhiteSpace(normalized))
            return "Custom";

        return normalized.ToLowerInvariant() switch
        {
            "january" or "january exam period" or "af atijanarit" or "afatijanarit" or "janar" or "afati i janarit" => "January Exam Period",
            "april" or "april exam period" or "afatiprillit" or "prill" or "afati i prillit" => "April Exam Period",
            "june" or "june exam period" or "afatiqershorit" or "qershor" or "afati i qershorit" => "June Exam Period",
            "september" or "september exam period" or "afatishtatorit" or "shtator" or "afati i shtatorit" => "September Exam Period",
            "october" or "october exam period" or "af atitetorit" or "afatitetorit" or "tetor" or "afati i tetorit" => "October Exam Period",
            "semester" or "during semester" or "gjate semestrit" => "During Semester",
            _ => "Custom"
        };
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var normalized = NormalizeOptionalValue(value);
        return normalized?.Length > 120 ? normalized[..120] : normalized;
    }

    private static string BuildExamTitle(string? requestedTitle, CourseOffering offering, string assessmentType, string examPeriod)
    {
        var normalizedTitle = NormalizeOptionalText(requestedTitle);
        if (!string.IsNullOrWhiteSpace(normalizedTitle))
            return normalizedTitle;

        var courseCode = NormalizeOptionalText(offering.Course?.Code);
        var courseName = NormalizeOptionalText(offering.Course?.Name);
        var courseLabel = string.Join(" - ", new[] { courseCode, courseName }.Where(static value => !string.IsNullOrWhiteSpace(value)));
        if (string.IsNullOrWhiteSpace(courseLabel))
            courseLabel = "Course";

        var parts = new List<string>
        {
            courseLabel,
            FormatAssessmentTypeLabel(assessmentType)
        };

        var periodLabel = FormatExamPeriodLabel(assessmentType, examPeriod);
        if (!string.IsNullOrWhiteSpace(periodLabel))
            parts.Add(periodLabel);

        var academicYear = ResolveAcademicYear(offering, null);
        if (!string.IsNullOrWhiteSpace(academicYear))
            parts.Add(academicYear);

        return string.Join(" - ", parts);
    }

    private static string ResolveAcademicYear(CourseOffering offering, string? fallbackAcademicYear)
    {
        return NormalizeOptionalText(offering.Term?.AcademicYearLabel) ??
               NormalizeOptionalText(offering.Term?.Code) ??
               NormalizeOptionalText(fallbackAcademicYear) ??
               string.Empty;
    }

    private static string ResolveSemesterLabel(CourseOffering offering, string? fallbackSemesterLabel)
    {
        if (offering.SemesterNo > 0)
            return $"Semester {offering.SemesterNo}";

        return NormalizeOptionalText(offering.Term?.Season) ??
               NormalizeOptionalText(fallbackSemesterLabel) ??
               string.Empty;
    }

    private static string ResolveCohortLabel(CourseOffering offering, string? fallbackCohortLabel)
    {
        var parts = new List<string>();
        if (offering.YearOfStudy > 0)
            parts.Add($"Year {offering.YearOfStudy}");

        var sectionCode = NormalizeOptionalText(offering.SectionCode);
        if (!string.IsNullOrWhiteSpace(sectionCode))
            parts.Add($"Section {sectionCode}");

        if (parts.Count > 0)
            return string.Join(" / ", parts);

        return NormalizeOptionalText(fallbackCohortLabel) ?? string.Empty;
    }

    private static string FormatAssessmentTypeLabel(string assessmentType)
    {
        return assessmentType switch
        {
            "Kollokfium1" => "Kollokfium 1",
            "Kollokfium2" => "Kollokfium 2",
            "Practice" => "Ushtrime / practice",
            _ => "Provim"
        };
    }

    private static string? FormatExamPeriodLabel(string assessmentType, string examPeriod)
    {
        if (!string.Equals(assessmentType, "Provim", StringComparison.OrdinalIgnoreCase))
            return null;

        return examPeriod switch
        {
            "AfatiJanarit" => "Afati i Janarit",
            "AfatiPrillit" => "Afati i Prillit",
            "AfatiQershorit" => "Afati i Qershorit",
            "AfatiShtatorit" => "Afati i Shtatorit",
            "AfatiTetorit" => "Afati i Tetorit",
            "GjateSemestrit" => "Gjate semestrit",
            _ => null
        };
    }

    private static bool RequiresAiReview(Question question)
    {
        return string.Equals(question.Type, "Text", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(question.Type, "CSharp", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(question.Type, "SQL", StringComparison.OrdinalIgnoreCase);
    }

    private static string ResolveQuestionPrompt(Question question)
    {
        return QuestionTechnicalMetadataMapper.ResolvePrompt(question);
    }

    private static string? ResolveExpectedAnswer(Question question)
    {
        return QuestionTechnicalMetadataMapper.ResolveExpectedAnswerOrNotes(question);
    }

    private static string? ExtractStructuredQuestionSection(string value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var sections = value
            .Split("\n\n---\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var section in sections)
        {
            var prefix = $"{label}:\n";
            if (section.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return NormalizeOptionalValue(section[prefix.Length..]);
        }

        return null;
    }

    private static string NormalizeForEvaluation(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        return value
            .ToLowerInvariant()
            .Replace('ë', 'e')
            .Replace('Ë', 'e')
            .Replace('ç', 'c')
            .Replace('Ç', 'c');
    }

    private static string NormalizeTokenForEvaluation(string token)
    {
        var normalized = NormalizeForEvaluation(token).Trim();
        if (normalized.Length <= 3)
            return normalized;

        var suffixes = new[]
        {
            "imeve", "imit", "imin", "imet", "shem", "shme", "ues", "uesh", "ura", "rave", "rimi",
            "tion", "ions", "ing", "ed", "es", "ve", "ve", "it", "in", "et", "at", "or", "er", "ur", "on", "an"
        };

        foreach (var suffix in suffixes.OrderByDescending(x => x.Length))
        {
            if (normalized.EndsWith(suffix, StringComparison.OrdinalIgnoreCase) && normalized.Length > suffix.Length + 2)
                return normalized[..^suffix.Length];
        }

        return normalized;
    }

    private static HashSet<string> BuildConceptGroups(IEnumerable<string> tokens)
    {
        var groups = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var token in tokens)
        {
            var normalized = NormalizeTokenForEvaluation(token);
            var group = ResolveConceptGroup(normalized);
            if (!string.IsNullOrWhiteSpace(group))
                groups.Add(group);
        }

        return groups;
    }

    private static string ResolveConceptGroup(string token)
    {
        foreach (var pair in EvaluationSynonyms)
        {
            if (pair.Key.Equals(token, StringComparison.OrdinalIgnoreCase))
                return pair.Key;

            if (pair.Value.Any(candidate => NormalizeTokenForEvaluation(candidate).Equals(token, StringComparison.OrdinalIgnoreCase)))
                return pair.Key;
        }

        return token;
    }

    private static HashSet<string> BuildPhrases(IReadOnlyList<string> terms, int phraseLength)
    {
        var phrases = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (terms.Count < phraseLength)
            return phrases;

        for (var index = 0; index <= terms.Count - phraseLength; index++)
        {
            phrases.Add(string.Join(' ', terms.Skip(index).Take(phraseLength)));
        }

        return phrases;
    }

    private static string NormalizeTechnicalText(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var withoutComments = Regex.Replace(value, @"(--.*?$|//.*?$|/\*.*?\*/)", " ", RegexOptions.Multiline | RegexOptions.Singleline);
        var normalizedWhitespace = Regex.Replace(withoutComments.ToLowerInvariant(), @"\s+", " ").Trim();
        return normalizedWhitespace.TrimEnd(';');
    }

    private static HashSet<string> ExtractTechnicalConcepts(string value, string questionType, string prompt)
    {
        var concepts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var normalized = NormalizeTechnicalText(value);
        foreach (Match match in Regex.Matches(normalized, @"[a-z_][a-z0-9_\.]*|\d+|[><=!]=|[+\-*/=]"))
        {
            var token = match.Value.Trim();
            if (string.IsNullOrWhiteSpace(token))
                continue;

            if (token.Length <= 1 && !char.IsDigit(token[0]) && !"+-*/=".Contains(token))
                continue;

            concepts.Add(token);
        }

        foreach (var keyword in ExtractRequiredKeywords(value, questionType, prompt))
        {
            concepts.Add(keyword);
        }

        return concepts;
    }

    private static List<string> ExtractRequiredKeywords(string expectedAnswer, string questionType, string prompt)
    {
        var normalizedExpected = NormalizeTechnicalText(expectedAnswer);
        var normalizedPrompt = NormalizeTechnicalText(prompt);
        var source = $"{normalizedExpected} {normalizedPrompt}";
        var keywords = string.Equals(questionType, "SQL", StringComparison.OrdinalIgnoreCase)
            ? SqlKeywords
            : CSharpKeywords;

        return keywords
            .Where(keyword => source.Contains(keyword, StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static double EvaluateTechnicalStructure(string questionType, string normalizedResponse, string normalizedExpected, string prompt)
    {
        if (string.IsNullOrWhiteSpace(normalizedResponse))
            return 0;

        double structureScore = 0;
        double structureWeight = 0;

        void AddSignal(bool condition, double weight)
        {
            structureWeight += weight;
            if (condition)
                structureScore += weight;
        }

        if (string.Equals(questionType, "SQL", StringComparison.OrdinalIgnoreCase))
        {
            AddSignal(normalizedResponse.Contains("select"), 1.2);
            AddSignal(normalizedResponse.Contains("from"), 1.2);
            if (normalizedExpected.Contains("where") || NormalizeTechnicalText(prompt).Contains("where"))
                AddSignal(normalizedResponse.Contains("where"), 1.1);
            AddSignal(normalizedResponse.Contains("=") || normalizedResponse.Contains(">") || normalizedResponse.Contains("<"), 0.8);
        }
        else
        {
            AddSignal(normalizedResponse.Contains("console.writeline") || normalizedResponse.Contains("console"), 1.2);
            if (normalizedExpected.Contains("readline") || normalizedExpected.Contains("parse"))
                AddSignal(normalizedResponse.Contains("readline") || normalizedResponse.Contains("parse"), 1.0);
            AddSignal(normalizedResponse.Contains("="), 0.7);
            AddSignal(normalizedResponse.Contains("*") || normalizedResponse.Contains("+") || normalizedResponse.Contains("-") || normalizedResponse.Contains("/"), 0.8);
            AddSignal(normalizedResponse.Contains("main") || normalizedResponse.Contains("return"), 0.5);
        }

        if (!string.IsNullOrWhiteSpace(normalizedExpected))
            AddSignal(normalizedResponse == normalizedExpected || normalizedResponse.Contains(normalizedExpected), 1.4);

        return structureWeight <= 0 ? 0 : structureScore / structureWeight;
    }

    private static double EvaluateTechnicalIntentCoverage(string questionType, string normalizedResponse, string normalizedExpected, string normalizedPrompt)
    {
        if (string.IsNullOrWhiteSpace(normalizedResponse))
            return 0;

        var combinedSource = $"{normalizedExpected} {normalizedPrompt}";

        return string.Equals(questionType, "SQL", StringComparison.OrdinalIgnoreCase)
            ? EvaluateSqlIntentCoverage(normalizedResponse, combinedSource)
            : EvaluateCSharpIntentCoverage(normalizedResponse, combinedSource);
    }

    private static double EvaluateSqlIntentCoverage(string normalizedResponse, string combinedSource)
    {
        double matched = 0;
        double total = 0;

        void AddRule(bool shouldCheck, bool isMatched, double weight)
        {
            if (!shouldCheck)
                return;

            total += weight;
            if (isMatched)
                matched += weight;
        }

        AddRule(true, normalizedResponse.Contains("select"), 1.2);
        AddRule(true, normalizedResponse.Contains("from"), 1.2);
        AddRule(combinedSource.Contains("students"), normalizedResponse.Contains("students"), 1.0);
        AddRule(combinedSource.Contains("where"), normalizedResponse.Contains("where"), 1.0);
        AddRule(combinedSource.Contains("yearofstudy"), normalizedResponse.Contains("yearofstudy"), 1.2);
        AddRule(combinedSource.Contains("= 2") || combinedSource.Contains("=2") || combinedSource.Contains(" dy "), normalizedResponse.Contains("= 2") || normalizedResponse.Contains("=2"), 1.0);

        return total <= 0 ? 0 : matched / total;
    }

    private static double EvaluateCSharpIntentCoverage(string normalizedResponse, string combinedSource)
    {
        double matched = 0;
        double total = 0;

        void AddRule(bool shouldCheck, bool isMatched, double weight)
        {
            if (!shouldCheck)
                return;

            total += weight;
            if (isMatched)
                matched += weight;
        }

        var expectsInput = combinedSource.Contains("readline") || combinedSource.Contains("parse") || combinedSource.Contains("pranon nje numer") || combinedSource.Contains("lexoje nje numer");
        var expectsSquare = combinedSource.Contains("n * n") || combinedSource.Contains("n*n") || combinedSource.Contains("katror");

        AddRule(true, normalizedResponse.Contains("console.writeline"), 1.3);
        AddRule(expectsInput, normalizedResponse.Contains("readline") || normalizedResponse.Contains("parse"), 1.2);
        AddRule(true, normalizedResponse.Contains("main"), 0.5);
        AddRule(expectsSquare, normalizedResponse.Contains("n * n") || normalizedResponse.Contains("n*n") || normalizedResponse.Contains("math.pow"), 1.4);
        AddRule(true, normalizedResponse.Contains("="), 0.4);

        return total <= 0 ? 0 : matched / total;
    }

    private static double ResolveExamMaximumPoints(Exam exam, double currentQuestionTotal)
    {
        if (exam.MaximumPoints > 0)
            return exam.MaximumPoints;

        return currentQuestionTotal > 0 ? currentQuestionTotal : 100;
    }

    private static List<Question> SelectBestQuestionSubset(IReadOnlyList<Question> candidates, int targetPoints, int requestedQuestions)
    {
        var requiredQuestionCount = Math.Max(1, requestedQuestions);
        var states = new Dictionary<(int TotalPoints, int Count), SubsetSelectionState>
        {
            [(0, 0)] = new(0, [])
        };

        foreach (var candidate in candidates)
        {
            var snapshot = states.Values.ToList();
            foreach (var state in snapshot)
            {
                var nextCount = state.Count + 1;
                if (nextCount > requiredQuestionCount)
                    continue;

                var nextPoints = state.TotalPoints + candidate.Points;
                var nextQuestions = new List<Question>(state.Questions) { candidate };
                var nextKey = (nextPoints, nextCount);

                if (!states.ContainsKey(nextKey))
                {
                    states[nextKey] = new SubsetSelectionState(nextPoints, nextQuestions);
                }
            }
        }

        var best = states.Values
            .Where(state => state.Count == requiredQuestionCount)
            .OrderBy(state => Math.Abs(state.TotalPoints - targetPoints))
            .ThenBy(state => state.TotalPoints > targetPoints ? 1 : 0)
            .FirstOrDefault();

        return best?.Questions ?? [];
    }

    private static string BuildGenerationFeedbackMessage(int targetPoints, int totalPoints, int difference)
    {
        if (difference == 0)
            return $"Generated an exact question set with {totalPoints} / {targetPoints} target points.";

        if (difference < 0)
            return $"Generated {totalPoints} points, which is {Math.Abs(difference)} below the target of {targetPoints}. You can now raise one or more question scores.";

        return $"Generated {totalPoints} points, which is {difference} above the target of {targetPoints}. You can now reduce one or more question scores.";
    }

    private sealed record SubsetSelectionState(int TotalPoints, List<Question> Questions)
    {
        public int Count => Questions.Count;
    }

    private static double CalculateScorePercentage(double finalScore, double examMaxPoints)
    {
        if (examMaxPoints <= 0)
            return 0;

        var boundedScore = Math.Clamp(finalScore, 0, examMaxPoints);
        return Math.Round((boundedScore / examMaxPoints) * 100, 2);
    }

    private static int CalculateFinalGrade(double scorePercentage)
    {
        if (scorePercentage < 51) return 5;
        if (scorePercentage <= 60) return 6;
        if (scorePercentage <= 70) return 7;
        if (scorePercentage <= 80) return 8;
        if (scorePercentage <= 90) return 9;
        return 10;
    }

    private static bool IsPassingGrade(double scorePercentage)
    {
        return CalculateFinalGrade(scorePercentage) >= 6;
    }

    private static string? ValidateLockdownConfiguration(bool requiresLockdown, string? allowedClient, string? lockdownMode)
    {
        var normalizedClient = NormalizeOptionalValue(allowedClient) ?? "StandardBrowser";
        var normalizedMode = NormalizeOptionalValue(lockdownMode) ?? "Advisory";

        if (!requiresLockdown)
            return null;

        var allowedClients = new[] { "StandardBrowser", "SafeExamBrowser", "KioskClient", "InstitutionalKiosk" };
        var allowedModes = new[] { "Advisory", "Strict" };

        if (!allowedClients.Contains(normalizedClient, StringComparer.OrdinalIgnoreCase))
            return "Invalid lockdown client.";

        if (!allowedModes.Contains(normalizedMode, StringComparer.OrdinalIgnoreCase))
            return "Invalid lockdown mode.";

        if (requiresLockdown && string.Equals(normalizedClient, "StandardBrowser", StringComparison.OrdinalIgnoreCase))
            return "A lockdown exam must require SafeExamBrowser or KioskClient.";

        return null;
    }

    private static bool IsCorrectMcqResponse(string? correctAnswer, string? response)
    {
        var correctAnswers = GetCorrectAnswers(correctAnswer);
        var submittedAnswers = GetCorrectAnswers(response);

        if (correctAnswers.Count == 0 || submittedAnswers.Count == 0)
            return false;

        return correctAnswers.Count == submittedAnswers.Count &&
               correctAnswers.All(correct => submittedAnswers.Any(submitted => string.Equals(submitted, correct, StringComparison.OrdinalIgnoreCase)));
    }

    private static List<string> GetCorrectAnswers(string? correctAnswer)
    {
        var normalized = NormalizeOptionalValue(correctAnswer);
        if (normalized == null)
            return [];

        try
        {
            var parsed = JsonSerializer.Deserialize<List<string>>(normalized);
            if (parsed != null)
            {
                return parsed
                    .Select(NormalizeOptionalValue)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x!)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
        }
        catch
        {
            // Older MCQ answers are stored as plain text.
        }

        return [normalized];
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

    private static ExamIntegrityEventDto MapIntegrityEventForReview(ExamIntegrityEvent integrityEvent)
    {
        return new ExamIntegrityEventDto
        {
            EventType = integrityEvent.EventType,
            ViolationCount = integrityEvent.AttemptViolationCount,
            Message = integrityEvent.PolicyAction,
            CreatedAt = integrityEvent.OccurredAt
        };
    }

    private static List<ExamAttemptAnswerReviewDto> BuildAnswerReview(
        List<Question> questions,
        List<AnswerDto> answers,
        List<ExamAttemptQuestionScoreDto>? questionScores = null)
    {
        var answerByQuestion = answers.ToDictionary(x => x.QuestionId, x => x.Response ?? string.Empty);
        var scoreByQuestion = (questionScores ?? [])
            .GroupBy(x => x.QuestionId)
            .ToDictionary(x => x.Key, x => x.Last());

        return questions.Select(question =>
        {
            answerByQuestion.TryGetValue(question.Id, out var response);
            var normalizedResponse = NormalizeOptionalValue(response) ?? string.Empty;
            var isCorrect = !string.IsNullOrWhiteSpace(question.CorrectAnswer) &&
                IsCorrectMcqResponse(question.CorrectAnswer, normalizedResponse);
            scoreByQuestion.TryGetValue(question.Id, out var score);

            return new ExamAttemptAnswerReviewDto
            {
                QuestionId = question.Id,
                QuestionText = question.Text,
                QuestionType = question.Type,
                Options = ParseOptions(question.OptionsJson),
                CorrectAnswer = question.CorrectAnswer,
                Response = normalizedResponse,
                Points = question.Points,
                IsCorrect = isCorrect,
                AutoPointsAwarded = score?.AutoPointsAwarded ?? (isCorrect ? question.Points : 0),
                FinalPointsAwarded = score?.FinalPointsAwarded ?? (isCorrect ? question.Points : 0),
                IsManuallyOverridden = score?.IsManuallyOverridden ?? false,
                GradingNotes = score?.GradingNotes
            };
        }).ToList();
    }

    private static List<ExamAttemptQuestionScoreDto> BuildQuestionScoreBreakdown(List<Question> questions, List<AnswerDto> answers)
    {
        var answerByQuestion = answers.ToDictionary(x => x.QuestionId, x => x.Response ?? string.Empty);

        return questions
            .OrderBy(x => x.Id)
            .Select(question =>
            {
                answerByQuestion.TryGetValue(question.Id, out var response);
                var autoPoints = 0d;

                if (string.Equals(question.Type, "MCQ", StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(question.CorrectAnswer) &&
                    IsCorrectMcqResponse(question.CorrectAnswer, response))
                {
                    autoPoints = question.Points;
                }

                return new ExamAttemptQuestionScoreDto
                {
                    QuestionId = question.Id,
                    MaxPoints = question.Points,
                    AutoPointsAwarded = RoundScore(autoPoints),
                    FinalPointsAwarded = RoundScore(autoPoints),
                    IsManuallyOverridden = false
                };
            })
            .ToList();
    }

    private static List<ExamAttemptQuestionScoreDto> ReadQuestionScoresForReview(List<Question> questions, string answersJson, string? questionScoresJson)
    {
        var defaults = BuildQuestionScoreBreakdown(questions, ParseAttemptAnswers(answersJson));
        var defaultByQuestion = defaults.ToDictionary(x => x.QuestionId);
        var raw = NormalizeOptionalValue(questionScoresJson);
        if (raw == null)
            return defaults;

        try
        {
            var stored = JsonSerializer.Deserialize<List<ExamAttemptQuestionScoreDto>>(raw) ?? [];
            var storedByQuestion = stored
                .Where(x => x.QuestionId != Guid.Empty)
                .GroupBy(x => x.QuestionId)
                .ToDictionary(x => x.Key, x => x.Last());

            return questions
                .OrderBy(x => x.Id)
                .Select(question =>
                {
                    var fallback = defaultByQuestion[question.Id];
                    if (!storedByQuestion.TryGetValue(question.Id, out var existing))
                        return fallback;

                    var normalizedAuto = Math.Clamp(RoundScore(existing.AutoPointsAwarded), 0, question.Points);
                    var normalizedFinal = Math.Clamp(RoundScore(existing.FinalPointsAwarded), 0, question.Points);

                    return new ExamAttemptQuestionScoreDto
                    {
                        QuestionId = question.Id,
                        MaxPoints = question.Points,
                        AutoPointsAwarded = normalizedAuto,
                        FinalPointsAwarded = normalizedFinal,
                        IsManuallyOverridden = existing.IsManuallyOverridden || Math.Abs(normalizedFinal - normalizedAuto) > 0.009,
                        GradingNotes = NormalizeOptionalValue(existing.GradingNotes)
                    };
                })
                .ToList();
        }
        catch
        {
            return defaults;
        }
    }

    private static string? SerializeQuestionScores(List<ExamAttemptQuestionScoreDto> questionScores)
    {
        return questionScores.Count == 0 ? null : JsonSerializer.Serialize(questionScores);
    }

    private static string? ValidateRequestedQuestionScores(List<Question> questions, List<GradeExamAttemptQuestionScoreDto> requestedScores)
    {
        if (requestedScores.Count == 0)
            return null;

        var duplicateIds = requestedScores
            .GroupBy(x => x.QuestionId)
            .Where(x => x.Key != Guid.Empty && x.Count() > 1)
            .Select(x => x.Key)
            .ToList();
        if (duplicateIds.Count > 0)
            return "Each question score can only be submitted once per grading request.";

        var questionById = questions.ToDictionary(x => x.Id);
        foreach (var item in requestedScores)
        {
            if (!questionById.TryGetValue(item.QuestionId, out var question))
                return "One or more question scores do not belong to this exam.";

            if (item.PointsAwarded < 0 || item.PointsAwarded > question.Points)
                return $"Question score for '{ResolveQuestionPrompt(question)}' is outside the allowed range.";
        }

        return null;
    }

    private static void ApplyQuestionScoreOverrides(
        List<ExamAttemptQuestionScoreDto> currentScores,
        List<GradeExamAttemptQuestionScoreDto> requestedScores)
    {
        var scoreByQuestion = currentScores.ToDictionary(x => x.QuestionId);

        foreach (var item in requestedScores)
        {
            if (!scoreByQuestion.TryGetValue(item.QuestionId, out var existing))
                continue;

            existing.FinalPointsAwarded = RoundScore(item.PointsAwarded);
            existing.IsManuallyOverridden = Math.Abs(existing.FinalPointsAwarded - existing.AutoPointsAwarded) > 0.009;
            existing.GradingNotes = NormalizeOptionalValue(item.Notes);
        }
    }

    private static void ApplyLegacyOverallAdjustment(List<ExamAttemptQuestionScoreDto> questionScores, double desiredFinalScore)
    {
        var remainingDelta = RoundScore(desiredFinalScore - questionScores.Sum(x => x.FinalPointsAwarded));
        if (Math.Abs(remainingDelta) <= 0.009)
            return;

        var candidates = remainingDelta > 0
            ? questionScores.OrderByDescending(x => x.MaxPoints - x.FinalPointsAwarded).ToList()
            : questionScores.OrderByDescending(x => x.FinalPointsAwarded).ToList();

        foreach (var score in candidates)
        {
            var available = remainingDelta > 0
                ? score.MaxPoints - score.FinalPointsAwarded
                : score.FinalPointsAwarded;

            if (available <= 0)
                continue;

            var change = Math.Min(Math.Abs(remainingDelta), available);
            score.FinalPointsAwarded = RoundScore(score.FinalPointsAwarded + (remainingDelta > 0 ? change : -change));
            score.IsManuallyOverridden = Math.Abs(score.FinalPointsAwarded - score.AutoPointsAwarded) > 0.009;
            remainingDelta = RoundScore(remainingDelta + (remainingDelta > 0 ? -change : change));

            if (Math.Abs(remainingDelta) <= 0.009)
                break;
        }
    }

    private static (double autoScore, double finalScore, double manualScore) CalculateQuestionScoreTotals(List<ExamAttemptQuestionScoreDto> questionScores)
    {
        var autoScore = RoundScore(questionScores.Sum(x => x.AutoPointsAwarded));
        var finalScore = RoundScore(questionScores.Sum(x => x.FinalPointsAwarded));
        var manualScore = RoundScore(finalScore - autoScore);
        return (autoScore, finalScore, manualScore);
    }

    private static string ResolveGradingStatus(ExamAttempt attempt)
    {
        if (attempt.IsPublished)
            return "Published";

        if (attempt.IsGraded)
            return "Graded";

        if (attempt.GradedAt.HasValue || !string.IsNullOrWhiteSpace(attempt.QuestionScoresJson))
            return "InReview";

        return "NotReviewed";
    }

    private static double RoundScore(double value)
    {
        return Math.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static TechnicalRunResultDto BuildTechnicalRunResult(Question question, string response)
    {
        var questionType = question.Type;
        var executedAt = DateTime.UtcNow;

        if (string.IsNullOrWhiteSpace(response))
        {
            return new TechnicalRunResultDto
            {
                Status = "Error",
                Errors = "Write a solution before running this technical answer.",
                Notes = "Run validates the current draft only. Final grading still happens after submission.",
                ExecutedAt = executedAt,
                TestResults =
                [
                    new TechnicalRunTestResultDto
                    {
                        Name = "Draft content",
                        Passed = false,
                        Message = "No SQL query or C# code was provided.",
                        Visibility = "Public"
                    }
                ]
            };
        }

        if (string.Equals(questionType, "SQL", StringComparison.OrdinalIgnoreCase))
            return BuildSqlRunPreview(response, executedAt);

        if (string.Equals(questionType, "CSharp", StringComparison.OrdinalIgnoreCase))
            return BuildCSharpRunPreview(response, executedAt);

        return new TechnicalRunResultDto
        {
            Status = "NotSupported",
            Errors = "This question type does not support technical execution.",
            ExecutedAt = executedAt
        };
    }

    private static TechnicalRunResultDto BuildSqlRunPreview(string response, DateTime executedAt)
    {
        var normalized = response.Trim();
        var lowered = normalized.ToLowerInvariant();
        var hasSelect = Regex.IsMatch(lowered, @"\bselect\b");
        var hasFrom = Regex.IsMatch(lowered, @"\bfrom\b");
        var hasDestructiveStatement = Regex.IsMatch(lowered, @"\b(drop|truncate|alter|delete|update|insert)\b");
        var hasSemicolon = normalized.EndsWith(";", StringComparison.Ordinal);
        var passedPreview = hasSelect && hasFrom && !hasDestructiveStatement;

        return new TechnicalRunResultDto
        {
            Status = passedPreview ? "NotSupported" : "Error",
            Output = passedPreview
                ? "SQL structure preview passed. Real result rows require an isolated SQL runner with a controlled dataset."
                : string.Empty,
            Errors = passedPreview
                ? string.Empty
                : "The SQL draft needs review before it can be executed.",
            Notes = "The main API does not execute arbitrary SQL. A sandboxed SQL runner can later use this same response contract for real datasets.",
            ExecutedAt = executedAt,
            TestResults =
            [
                new TechnicalRunTestResultDto
                {
                    Name = "SELECT clause",
                    Passed = hasSelect,
                    Message = hasSelect ? "Query includes SELECT." : "Add a SELECT clause.",
                    Visibility = "Public"
                },
                new TechnicalRunTestResultDto
                {
                    Name = "FROM clause",
                    Passed = hasFrom,
                    Message = hasFrom ? "Query includes FROM." : "Add a FROM clause or dataset reference.",
                    Visibility = "Public"
                },
                new TechnicalRunTestResultDto
                {
                    Name = "Read-only safety",
                    Passed = !hasDestructiveStatement,
                    Message = hasDestructiveStatement ? "Destructive SQL statements are not allowed in exam preview." : "No destructive statement detected.",
                    Visibility = "Public"
                },
                new TechnicalRunTestResultDto
                {
                    Name = "Statement ending",
                    Passed = hasSemicolon,
                    Message = hasSemicolon ? "Statement ends with semicolon." : "A semicolon is recommended for clarity.",
                    Visibility = "Public"
                }
            ]
        };
    }

    private static TechnicalRunResultDto BuildCSharpRunPreview(string response, DateTime executedAt)
    {
        var hasClassOrMethod = Regex.IsMatch(response, @"\b(class|static|void|int|string|bool|double|public|private)\b", RegexOptions.IgnoreCase);
        var balancedBraces = response.Count(c => c == '{') == response.Count(c => c == '}');
        var hasConsoleOutput = Regex.IsMatch(response, @"Console\.(WriteLine|Write)\s*\(", RegexOptions.IgnoreCase);
        var hasPlaceholder = response.Contains("Write your solution here", StringComparison.OrdinalIgnoreCase);
        var passedPreview = hasClassOrMethod && balancedBraces && !hasPlaceholder;

        return new TechnicalRunResultDto
        {
            Status = passedPreview ? "NotSupported" : "Error",
            Output = passedPreview
                ? "C# structure preview passed. Real compilation and test execution require a sandboxed code runner."
                : string.Empty,
            Errors = passedPreview
                ? string.Empty
                : "The C# draft needs review before it can be compiled.",
            Notes = "The main API does not compile or execute arbitrary C# code. A containerized runner should be attached before real execution is enabled.",
            ExecutedAt = executedAt,
            TestResults =
            [
                new TechnicalRunTestResultDto
                {
                    Name = "C# structure",
                    Passed = hasClassOrMethod,
                    Message = hasClassOrMethod ? "C# keywords or method structure detected." : "Add a class, method, or valid C# structure.",
                    Visibility = "Public"
                },
                new TechnicalRunTestResultDto
                {
                    Name = "Brace balance",
                    Passed = balancedBraces,
                    Message = balancedBraces ? "Opening and closing braces are balanced." : "Check missing or extra braces.",
                    Visibility = "Public"
                },
                new TechnicalRunTestResultDto
                {
                    Name = "Starter placeholder",
                    Passed = !hasPlaceholder,
                    Message = hasPlaceholder ? "Replace the starter placeholder with your solution." : "Starter placeholder was replaced.",
                    Visibility = "Public"
                },
                new TechnicalRunTestResultDto
                {
                    Name = "Output check",
                    Passed = hasConsoleOutput,
                    Message = hasConsoleOutput ? "Console output is present." : "Console output is optional unless the prompt asks for it.",
                    Visibility = "Public"
                }
            ]
        };
    }

    private static bool IsTechnicalQuestion(Question question)
    {
        return string.Equals(question.Type, "SQL", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(question.Type, "CSharp", StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildQuestionBankDescription(Guid offeringId)
    {
        return $"{QuestionBankMarker}{offeringId}";
    }

    private async Task<List<Guid>> GetAssignedOfferingIdsAsync(Guid userId, string assignmentRole)
    {
        var assignmentIds = await _context.CourseOfferingStaffAssignments
            .Where(a =>
                a.UserId == userId &&
                a.IsActive &&
                a.RoleInOffering == assignmentRole)
            .Select(a => a.CourseOfferingId)
            .ToListAsync();

        var directIds = assignmentRole == "Professor"
            ? await _context.CourseOfferings.Where(x => x.PrimaryProfessorId == userId).Select(x => x.Id).ToListAsync()
            : await _context.CourseOfferings.Where(x => x.AssistantId == userId).Select(x => x.Id).ToListAsync();

        return assignmentIds
            .Concat(directIds)
            .Distinct()
            .ToList();
    }

    private static string? NormalizePublicationState(string? publicationState)
    {
        if (string.IsNullOrWhiteSpace(publicationState))
            return null;

        if (string.Equals(publicationState, "Draft", StringComparison.OrdinalIgnoreCase))
            return "Draft";

        if (string.Equals(publicationState, "Published", StringComparison.OrdinalIgnoreCase))
            return "Published";

        return null;
    }

    private async Task<List<Guid>> GetVisibleOfferingIdsForStudentAsync(Guid userId)
    {
        return await _context.StudentCourseEnrollments
            .Where(x => x.StudentId == userId && x.EligibleForExam && x.Status == "Eligible")
            .Select(x => x.CourseOfferingId)
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

        return hasEligibleEnrollment;
    }
}
