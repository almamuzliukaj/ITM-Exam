using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Models;
using OnlineExam.Api.Services;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuestionsController : ControllerBase
{
    private const string QuestionBankMarker = "__QUESTION_BANK__:";
    private const string StudentExamNotEligibleMessage = "You are not eligible to access this exam.";
    private const string ExamAttemptSubmittedStatus = "Submitted";
    private static readonly string[] AllowedQuestionBankTypes = ["MCQ", "Text", "CSharp", "SQL"];
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public QuestionsController(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Question>> Get(Guid id)
    {
        var question = await _context.Questions
            .AsNoTracking()
            .Include(x => x.Exam)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (question == null || question.Exam == null)
            return NotFound();

        if (User.IsInRole("Student"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var accessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, question.Exam);
            if (accessError != null)
            {
                if (accessError == StudentExamNotEligibleMessage)
                    return Forbid();

                return BadRequest(new { message = accessError });
            }

            var sessionError = await GetSecureExamSessionErrorAsync(userId.Value, question.Exam, Request.Query["clientSessionId"].FirstOrDefault());
            if (sessionError != null)
                return BadRequest(new { message = sessionError.Value.Message, code = sessionError.Value.Code });
        }
        else if (!await CanAccessExamAsync(question.Exam))
        {
            return Forbid();
        }

        return Ok(new ExamQuestionResponseDto
        {
            Id = question.Id,
            ExamId = question.ExamId,
            Text = question.Text,
            Type = question.Type,
            CorrectAnswer = User.IsInRole("Student") ? null : question.CorrectAnswer,
            Topic = User.IsInRole("Student") ? null : question.Topic,
            Difficulty = User.IsInRole("Student") ? null : question.Difficulty,
            CorrectAnswerCount = GetCorrectAnswers(question.CorrectAnswer).Count,
            Options = ParseOptions(question.OptionsJson),
            Points = question.Points,
            TechnicalMetadata = QuestionTechnicalMetadataMapper.BuildResponseMetadata(question, includePrivateFields: !User.IsInRole("Student"))
        });
    }

    [HttpPost("/api/exams/{examId:guid}/questions")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> Post(Guid examId, [FromBody] CreateQuestionDto dto)
    {
        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null)
            return NotFound("Exam not found");

        if (IsQuestionBankContainer(exam))
            return NotFound();

        if (!await CanAuthorExamAsync(exam))
            return Forbid();

        if (exam.IsPublished || exam.Status == "Published")
            return BadRequest(new { message = "Published exams cannot be modified. Return the exam to draft before adding questions." });

        var options = NormalizeOptions(dto.Options);
        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = dto.Text,
            Type = dto.Type,
            CourseId = dto.CourseId,
            OptionsJson = options.Count > 0 ? JsonSerializer.Serialize(options) : null,
            MetadataJson = QuestionTechnicalMetadataMapper.SerializeForStorage(dto.Type, dto.TechnicalMetadata),
            CorrectAnswer = dto.CorrectAnswer,
            Topic = NormalizeOptionalValue(dto.Topic),
            Difficulty = NormalizeDifficulty(dto.Difficulty),
            Points = dto.Points,
            ExamId = examId
        };

        _context.Questions.Add(question);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Question.Created", "Question", question.Id, new
        {
            question.ExamId,
            question.Type,
            question.Points
        }, "ExamAuthoring");

        return CreatedAtAction(nameof(Get), new { id = question.Id }, new
        {
            question.Id,
            question.ExamId,
            question.Type,
            question.Text,
            question.Points
        });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> Put(Guid id, [FromBody] CreateQuestionDto dto)
    {
        var existing = await _context.Questions.FindAsync(id);
        if (existing == null)
            return NotFound();

        var exam = await _context.Exams.FindAsync(existing.ExamId);
        if (exam == null)
            return NotFound("Exam not found");

        if (IsQuestionBankContainer(exam))
            return NotFound();

        if (!await CanAuthorExamAsync(exam))
            return Forbid();

        if (exam.IsPublished || exam.Status == "Published")
            return BadRequest(new { message = "Published exams cannot be modified. Return the exam to draft before editing questions." });

        var options = NormalizeOptions(dto.Options);
        existing.Text = dto.Text;
        existing.Type = dto.Type;
        existing.CourseId = dto.CourseId;
        existing.OptionsJson = options.Count > 0 ? JsonSerializer.Serialize(options) : null;
        existing.MetadataJson = QuestionTechnicalMetadataMapper.SerializeForStorage(dto.Type, dto.TechnicalMetadata);
        existing.CorrectAnswer = dto.CorrectAnswer;
        existing.Topic = NormalizeOptionalValue(dto.Topic);
        existing.Difficulty = NormalizeDifficulty(dto.Difficulty);
        existing.Points = dto.Points;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Question.Updated", "Question", existing.Id, new
        {
            existing.ExamId,
            existing.Type,
            existing.Points
        }, "ExamAuthoring");
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var existing = await _context.Questions.FindAsync(id);
        if (existing == null)
            return NotFound();

        var exam = await _context.Exams.FindAsync(existing.ExamId);
        if (exam == null)
            return NotFound("Exam not found");

        if (IsQuestionBankContainer(exam))
            return NotFound();

        if (!await CanAuthorExamAsync(exam))
            return Forbid();

        if (exam.IsPublished || exam.Status == "Published")
            return BadRequest(new { message = "Published exams cannot be modified. Return the exam to draft before removing questions." });

        _context.Questions.Remove(existing);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("Question.Deleted", "Question", id, new
        {
            existing.ExamId
        }, "ExamAuthoring");
        return NoContent();
    }

    [HttpGet("/api/exams/{examId:guid}/questions")]
    public async Task<IActionResult> GetByExam(Guid examId, [FromQuery] string? clientSessionId = null)
    {
        var exam = await _context.Exams
            .Include(x => x.Questions)
            .FirstOrDefaultAsync(x => x.Id == examId);
        if (exam == null)
            return NotFound();

        if (User.IsInRole("Student"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var accessError = await GetStudentExamSessionAccessErrorAsync(userId.Value, exam, blockResubmission: false);
            if (accessError != null)
            {
                if (accessError == StudentExamNotEligibleMessage)
                    return Forbid();

                return BadRequest(new { message = accessError });
            }

            var sessionError = await GetSecureExamSessionErrorAsync(userId.Value, exam, clientSessionId);
            if (sessionError != null)
                return BadRequest(new { message = sessionError.Value.Message, code = sessionError.Value.Code });
        }
        else if (!await CanAccessExamAsync(exam))
        {
            return Forbid();
        }

        await EnsureExamHasQuestionsFromBankAsync(exam);

        var questions = await _context.Questions
            .AsNoTracking()
            .Where(q => q.ExamId == examId)
            .ToListAsync();

        var includeCorrectAnswer = !User.IsInRole("Student");

        return Ok(questions.Select(q => new ExamQuestionResponseDto
        {
            Id = q.Id,
            ExamId = q.ExamId,
            Text = q.Text,
            Type = q.Type,
            CorrectAnswer = includeCorrectAnswer ? q.CorrectAnswer : null,
            Topic = includeCorrectAnswer ? q.Topic : null,
            Difficulty = includeCorrectAnswer ? q.Difficulty : null,
            CorrectAnswerCount = GetCorrectAnswers(q.CorrectAnswer).Count,
            Options = ParseOptions(q.OptionsJson),
            Points = q.Points,
            TechnicalMetadata = QuestionTechnicalMetadataMapper.BuildResponseMetadata(q, includePrivateFields: includeCorrectAnswer)
        }));
    }

    [HttpGet("/api/question-bank/{offeringId:guid}/questions")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> GetQuestionBankQuestions(Guid offeringId, [FromQuery] string? type, [FromQuery] string? search, [FromQuery] string? topic, [FromQuery] string? difficulty)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var offering = await GetAccessibleOfferingAsync(offeringId, userId.Value);
        if (offering == null)
            return Forbid();

        var container = await FindQuestionBankContainerAsync(offeringId);
        if (container == null)
            return Ok(Array.Empty<QuestionBankQuestionResponseDto>());

        var query = _context.Questions.AsNoTracking().Where(x => x.ExamId == container.Id);

        if (!string.IsNullOrWhiteSpace(type))
        {
            var normalizedType = type.Trim();
            query = query.Where(x => x.Type == normalizedType);
        }

        if (!string.IsNullOrWhiteSpace(topic))
        {
            var normalizedTopic = topic.Trim().ToLower();
            query = query.Where(x => x.Topic != null && x.Topic.ToLower() == normalizedTopic);
        }

        if (!string.IsNullOrWhiteSpace(difficulty))
        {
            var normalizedDifficulty = difficulty.Trim().ToLower();
            query = query.Where(x => x.Difficulty != null && x.Difficulty.ToLower() == normalizedDifficulty);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(x =>
                x.Text.ToLower().Contains(normalizedSearch) ||
                (x.CorrectAnswer != null && x.CorrectAnswer.ToLower().Contains(normalizedSearch)) ||
                (x.Topic != null && x.Topic.ToLower().Contains(normalizedSearch)) ||
                (x.Difficulty != null && x.Difficulty.ToLower().Contains(normalizedSearch)));
        }

        var items = await query
            .OrderBy(x => x.Topic ?? "Uncategorized")
            .ThenBy(x => x.Difficulty ?? string.Empty)
            .ThenBy(x => x.Type)
            .ThenBy(x => x.Text)
            .ToListAsync();

        return Ok(items.Select(x => MapToQuestionBankResponse(x, offeringId)));
    }

    [HttpGet("/api/question-bank/questions/{id:guid}")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> GetQuestionBankQuestion(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var question = await _context.Questions
            .AsNoTracking()
            .Include(x => x.Exam)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (question == null || question.Exam?.CourseOfferingId == null || !IsQuestionBankContainer(question.Exam))
            return NotFound();

        var offering = await GetAccessibleOfferingAsync(question.Exam.CourseOfferingId.Value, userId.Value);
        if (offering == null)
            return Forbid();

        return Ok(MapToQuestionBankResponse(question, question.Exam.CourseOfferingId.Value));
    }

    [HttpPost("/api/question-bank/{offeringId:guid}/questions")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> CreateQuestionBankQuestion(Guid offeringId, [FromBody] UpsertQuestionBankQuestionDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var offering = await GetAccessibleOfferingAsync(offeringId, userId.Value);
        if (offering == null)
            return Forbid();

        var validationError = ValidateQuestionBankPayload(dto);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        var container = await GetOrCreateQuestionBankContainerAsync(offering, userId.Value);
        var options = NormalizeOptions(dto.Options);

        var question = new Question
        {
            Id = Guid.NewGuid(),
            ExamId = container.Id,
            CourseId = offering.CourseId,
            Text = dto.Text.Trim(),
            Type = NormalizeQuestionType(dto.Type),
            CorrectAnswer = NormalizeOptionalValue(dto.CorrectAnswer),
            Topic = NormalizeOptionalValue(dto.Topic),
            Difficulty = NormalizeDifficulty(dto.Difficulty),
            OptionsJson = options.Count > 0 ? JsonSerializer.Serialize(options) : null,
            MetadataJson = QuestionTechnicalMetadataMapper.SerializeForStorage(dto.Type, dto.TechnicalMetadata),
            Points = dto.Points
        };

        _context.Questions.Add(question);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("QuestionBankQuestion.Created", "Question", question.Id, new
        {
            question.ExamId,
            OfferingId = offeringId,
            question.Type
        }, "QuestionBank");

        return Created($"/api/question-bank/questions/{question.Id}", MapToQuestionBankResponse(question, offeringId));
    }

    [HttpPut("/api/question-bank/questions/{id:guid}")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> UpdateQuestionBankQuestion(Guid id, [FromBody] UpsertQuestionBankQuestionDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var question = await _context.Questions
            .Include(x => x.Exam)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (question == null || question.Exam?.CourseOfferingId == null || !IsQuestionBankContainer(question.Exam))
            return NotFound();

        var offering = await GetAccessibleOfferingAsync(question.Exam.CourseOfferingId.Value, userId.Value);
        if (offering == null)
            return Forbid();

        var validationError = ValidateQuestionBankPayload(dto);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        var options = NormalizeOptions(dto.Options);
        question.Text = dto.Text.Trim();
        question.Type = NormalizeQuestionType(dto.Type);
        question.CorrectAnswer = NormalizeOptionalValue(dto.CorrectAnswer);
        question.Topic = NormalizeOptionalValue(dto.Topic);
        question.Difficulty = NormalizeDifficulty(dto.Difficulty);
        question.OptionsJson = options.Count > 0 ? JsonSerializer.Serialize(options) : null;
        question.MetadataJson = QuestionTechnicalMetadataMapper.SerializeForStorage(dto.Type, dto.TechnicalMetadata);
        question.Points = dto.Points;
        question.CourseId = offering.CourseId;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("QuestionBankQuestion.Updated", "Question", question.Id, new
        {
            question.ExamId,
            OfferingId = offering.Id,
            question.Type
        }, "QuestionBank");
        return Ok(MapToQuestionBankResponse(question, offering.Id));
    }

    [HttpDelete("/api/question-bank/questions/{id:guid}")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> DeleteQuestionBankQuestion(Guid id)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var question = await _context.Questions
            .Include(x => x.Exam)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (question == null || question.Exam?.CourseOfferingId == null || !IsQuestionBankContainer(question.Exam))
            return NotFound();

        var offering = await GetAccessibleOfferingAsync(question.Exam.CourseOfferingId.Value, userId.Value);
        if (offering == null)
            return Forbid();

        _context.Questions.Remove(question);
        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("QuestionBankQuestion.Deleted", "Question", id, new
        {
            question.ExamId,
            OfferingId = question.Exam.CourseOfferingId
        }, "QuestionBank");
        return NoContent();
    }

    private Task<bool> CanAuthorExamAsync(Exam exam)
    {
        if (!User.IsInRole("Professor") && !User.IsInRole("Assistant"))
            return Task.FromResult(false);

        var userId = GetCurrentUserId();
        if (userId == null)
            return Task.FromResult(false);

        return Task.FromResult(exam.CreatedByUserId == userId.Value);
    }

    private async Task<bool> CanAccessExamAsync(Exam exam)
    {
        if (IsQuestionBankContainer(exam))
            return false;

        var userId = GetCurrentUserId();
        if (userId == null)
            return false;

        if (User.IsInRole("Admin"))
            return false;

        if (User.IsInRole("Professor") || User.IsInRole("Assistant"))
        {
            return exam.CreatedByUserId == userId.Value;
        }

        if (User.IsInRole("Student"))
        {
            return await GetStudentExamSessionAccessErrorAsync(userId.Value, exam) == null;
        }

        return false;
    }

    private async Task<string?> GetStudentExamSessionAccessErrorAsync(Guid userId, Exam exam, bool blockResubmission = true)
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
        {
            var canUseCurrentTermFallback = await _context.CourseOfferings.AnyAsync(x =>
                x.Id == exam.CourseOfferingId.Value &&
                x.Term != null &&
                (x.Term.IsCurrent || x.Term.Status == "Open" || x.Term.Status == "Active" || x.Term.Status == "Draft"));

            if (!canUseCurrentTermFallback)
                return null;
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

    private async Task<(string Code, string Message)?> GetSecureExamSessionErrorAsync(Guid userId, Exam exam, string? clientSessionId)
    {
        var normalizedClientSessionId = NormalizeOptionalValue(clientSessionId);
        if (string.IsNullOrWhiteSpace(normalizedClientSessionId))
            return ("EXAM_SESSION_NOT_APPROVED", "Secure exam session reference is required before questions can be loaded.");

        var attempt = await _context.ExamAttempts
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ExamId == exam.Id && x.StudentId == userId);
        if (attempt == null)
            return ("EXAM_SESSION_NOT_APPROVED", "Start the approved exam session before loading questions.");

        if (attempt.Status == ExamAttemptSubmittedStatus)
            return ("EXAM_TIME_EXPIRED", "This attempt has already been submitted.");

        var sessionHash = HashSessionReference(normalizedClientSessionId, exam.Id, userId);
        var binding = await _context.ExamSessionBindings
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.ExamId == exam.Id &&
                x.StudentId == userId &&
                x.AttemptId == attempt.Id &&
                x.SessionReferenceHash == sessionHash &&
                (x.Status == "Active" || x.Status == "Disconnected"));

        if (binding == null)
        {
            await _auditLogService.LogAsync("ExamSession.QuestionReadRejected", "ExamAttempt", attempt.Id, new
            {
                examId = exam.Id,
                studentId = userId,
                attemptId = attempt.Id
            }, "ExamSecurity");
            return ("EXAM_ACTIVE_ON_ANOTHER_SESSION", "Questions are available only in the approved browser session.");
        }

        return null;
    }

    private static string HashSessionReference(string clientSessionId, Guid examId, Guid studentId)
    {
        var input = $"{examId:N}:{studentId:N}:{clientSessionId.Trim()}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes);
    }

    private Task<bool> CanManageExamAsync(Exam exam)
    {
        if (IsQuestionBankContainer(exam))
            return Task.FromResult(false);

        if (User.IsInRole("Admin"))
            return Task.FromResult(true);

        var userId = GetCurrentUserId();
        if (userId == null)
            return Task.FromResult(false);

        if (!User.IsInRole("Professor") && !User.IsInRole("Assistant"))
            return Task.FromResult(false);

        return Task.FromResult(exam.CreatedByUserId == userId.Value);
    }

    private async Task<CourseOffering?> GetAccessibleOfferingAsync(Guid offeringId, Guid userId)
    {
        if (!User.IsInRole("Professor") && !User.IsInRole("Assistant"))
            return null;

        var assignmentRole = User.IsInRole("Professor") ? "Professor" : "Assistant";

        return await _context.CourseOfferings
            .Include(x => x.StaffAssignments)
            .FirstOrDefaultAsync(x =>
                x.Id == offeringId &&
                ((assignmentRole == "Professor" && x.PrimaryProfessorId == userId) ||
                 (assignmentRole == "Assistant" && x.AssistantId == userId) ||
                 x.StaffAssignments.Any(a =>
                    a.UserId == userId &&
                    a.IsActive &&
                    a.RoleInOffering == assignmentRole)));
    }

    private async Task<Exam?> FindQuestionBankContainerAsync(Guid offeringId)
    {
        return await _context.Exams.FirstOrDefaultAsync(x =>
            x.CourseOfferingId == offeringId &&
            x.Description == BuildQuestionBankDescription(offeringId));
    }

    private async Task<Exam> GetOrCreateQuestionBankContainerAsync(CourseOffering offering, Guid userId)
    {
        var existing = await FindQuestionBankContainerAsync(offering.Id);
        if (existing != null)
            return existing;

        var exam = new Exam
        {
            Id = Guid.NewGuid(),
            Title = "Question Bank Container",
            Description = BuildQuestionBankDescription(offering.Id),
            StartsAt = DateTime.UtcNow,
            EndsAt = DateTime.UtcNow.AddYears(5),
            DurationMinutes = 0,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            IsPublished = false,
            Status = "Draft",
            CourseOfferingId = offering.Id
        };

        _context.Exams.Add(exam);
        await _context.SaveChangesAsync();
        return exam;
    }

    private static string? ValidateQuestionBankPayload(UpsertQuestionBankQuestionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text))
            return "Question text is required.";

        if (dto.Points <= 0)
            return "Points must be greater than 0.";

        var normalizedType = NormalizeQuestionType(dto.Type);
        if (!AllowedQuestionBankTypes.Contains(normalizedType))
            return "Only MCQ, Text, C#, and SQL questions are supported in this question bank.";

        if (normalizedType == "MCQ")
        {
            var options = NormalizeOptions(dto.Options);
            if (options.Count < 2)
                return "MCQ questions require at least two options.";

            var correctAnswers = GetCorrectAnswers(dto.CorrectAnswer);
            if (correctAnswers.Count == 0)
                return "MCQ questions require a correct answer.";

            if (correctAnswers.Any(correctAnswer => !options.Any(option => string.Equals(option, correctAnswer, StringComparison.OrdinalIgnoreCase))))
                return "Every correct answer must match one of the MCQ options.";
        }

        return null;
    }

    private static string NormalizeQuestionType(string? type)
    {
        var normalized = type?.Trim() ?? string.Empty;
        if (string.Equals(normalized, "Text", StringComparison.OrdinalIgnoreCase))
            return "Text";

        if (string.Equals(normalized, "MCQ", StringComparison.OrdinalIgnoreCase))
            return "MCQ";

        if (string.Equals(normalized, "CSharp", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(normalized, "C#", StringComparison.OrdinalIgnoreCase))
            return "CSharp";

        if (string.Equals(normalized, "SQL", StringComparison.OrdinalIgnoreCase))
            return "SQL";

        return normalized;
    }

    private static string? NormalizeOptionalValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? NormalizeDifficulty(string? difficulty)
    {
        var normalized = NormalizeOptionalValue(difficulty);
        if (normalized == null)
            return null;

        if (string.Equals(normalized, "Easy", StringComparison.OrdinalIgnoreCase))
            return "Easy";

        if (string.Equals(normalized, "Medium", StringComparison.OrdinalIgnoreCase))
            return "Medium";

        if (string.Equals(normalized, "Hard", StringComparison.OrdinalIgnoreCase))
            return "Hard";

        return normalized;
    }

    private static List<string> NormalizeOptions(IEnumerable<string>? options)
    {
        return options?
            .Select(x => x?.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!)
            .ToList() ?? [];
    }

    private static bool IsQuestionBankContainer(Exam exam)
    {
        return exam.Description.StartsWith(QuestionBankMarker, StringComparison.Ordinal);
    }

    private static string BuildQuestionBankDescription(Guid offeringId)
    {
        return $"{QuestionBankMarker}{offeringId}";
    }

    private IQueryable<Question> BuildQuestionBankCandidateQuery(Guid questionBankExamId)
    {
        return _context.Questions.AsQueryable().Where(x => x.ExamId == questionBankExamId);
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
        if (exam.Questions.Count > 0 || !exam.CourseOfferingId.HasValue || IsQuestionBankContainer(exam))
            return;

        var bankExam = await FindQuestionBankContainerAsync(exam.CourseOfferingId.Value);
        if (bankExam == null)
            return;

        var candidates = await BuildQuestionBankCandidateQuery(bankExam.Id)
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

    private static QuestionBankQuestionResponseDto MapToQuestionBankResponse(Question question, Guid offeringId)
    {
        return new QuestionBankQuestionResponseDto
        {
            Id = question.Id,
            CourseOfferingId = offeringId,
            CourseId = question.CourseId,
            Text = question.Text,
            Type = question.Type,
            CorrectAnswer = question.CorrectAnswer,
            Topic = question.Topic,
            Difficulty = question.Difficulty,
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
            // Older questions store a single correct answer as plain text.
        }

        return [normalized];
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
