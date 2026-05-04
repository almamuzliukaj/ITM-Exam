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
public class QuestionsController : ControllerBase
{
    private const string QuestionBankMarker = "__QUESTION_BANK__:";
    private static readonly string[] AllowedQuestionBankTypes = ["MCQ", "Text", "CSharp", "SQL"];
    private readonly AppDbContext _context;

    public QuestionsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Question>> Get(Guid id)
    {
        var question = await _context.Questions.FindAsync(id);
        if (question == null)
            return NotFound();

        return question;
    }

    [HttpPost("/api/exams/{examId:guid}/questions")]
    [Authorize(Roles = "Admin,Professor,Assistant")]
    public async Task<IActionResult> Post(Guid examId, [FromBody] CreateQuestionDto dto)
    {
        var exam = await _context.Exams.FindAsync(examId);
        if (exam == null)
            return NotFound("Exam not found");

        var role = User.FindFirstValue(ClaimTypes.Role);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (role != "Admin" && exam.CreatedByUserId.ToString() != userId)
            return Forbid();

        var options = NormalizeOptions(dto.Options);
        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = dto.Text,
            Type = dto.Type,
            CourseId = dto.CourseId,
            OptionsJson = options.Count > 0 ? JsonSerializer.Serialize(options) : null,
            CorrectAnswer = dto.CorrectAnswer,
            Points = dto.Points,
            ExamId = examId
        };

        _context.Questions.Add(question);
        await _context.SaveChangesAsync();

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
    [Authorize(Roles = "Admin,Professor,Assistant")]
    public async Task<IActionResult> Put(Guid id, [FromBody] CreateQuestionDto dto)
    {
        var existing = await _context.Questions.FindAsync(id);
        if (existing == null)
            return NotFound();

        var exam = await _context.Exams.FindAsync(existing.ExamId);
        if (exam == null)
            return NotFound("Exam not found");

        var role = User.FindFirstValue(ClaimTypes.Role);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (role != "Admin" && exam.CreatedByUserId.ToString() != userId)
            return Forbid();

        var options = NormalizeOptions(dto.Options);
        existing.Text = dto.Text;
        existing.Type = dto.Type;
        existing.CourseId = dto.CourseId;
        existing.OptionsJson = options.Count > 0 ? JsonSerializer.Serialize(options) : null;
        existing.CorrectAnswer = dto.CorrectAnswer;
        existing.Points = dto.Points;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Professor,Assistant")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var existing = await _context.Questions.FindAsync(id);
        if (existing == null)
            return NotFound();

        var exam = await _context.Exams.FindAsync(existing.ExamId);
        if (exam == null)
            return NotFound("Exam not found");

        var role = User.FindFirstValue(ClaimTypes.Role);
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (role != "Admin" && exam.CreatedByUserId.ToString() != userId)
            return Forbid();

        _context.Questions.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("/api/exams/{examId:guid}/questions")]
    public async Task<IActionResult> GetByExam(Guid examId)
    {
        var exam = await _context.Exams.AsNoTracking().FirstOrDefaultAsync(x => x.Id == examId);
        if (exam == null)
            return NotFound();

        if (!await CanAccessExamAsync(exam))
            return Forbid();

        var questions = await _context.Questions
            .Where(q => q.ExamId == examId)
            .ToListAsync();

        return Ok(questions.Select(q => new ExamQuestionResponseDto
        {
            Id = q.Id,
            ExamId = q.ExamId,
            Text = q.Text,
            Type = q.Type,
            CorrectAnswer = q.CorrectAnswer,
            Options = ParseOptions(q.OptionsJson),
            Points = q.Points
        }));
    }

    [HttpGet("/api/question-bank/{offeringId:guid}/questions")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> GetQuestionBankQuestions(Guid offeringId, [FromQuery] string? type, [FromQuery] string? search)
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

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(x =>
                x.Text.ToLower().Contains(normalizedSearch) ||
                (x.CorrectAnswer != null && x.CorrectAnswer.ToLower().Contains(normalizedSearch)));
        }

        var items = await query
            .OrderBy(x => x.Type)
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
            OptionsJson = options.Count > 0 ? JsonSerializer.Serialize(options) : null,
            Points = dto.Points
        };

        _context.Questions.Add(question);
        await _context.SaveChangesAsync();

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
        question.OptionsJson = options.Count > 0 ? JsonSerializer.Serialize(options) : null;
        question.Points = dto.Points;
        question.CourseId = offering.CourseId;

        await _context.SaveChangesAsync();
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
        return NoContent();
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
            if (exam.CreatedByUserId == userId.Value)
                return true;

            if (!exam.CourseOfferingId.HasValue)
                return false;

            return await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
                a.CourseOfferingId == exam.CourseOfferingId.Value &&
                a.UserId == userId.Value &&
                a.IsActive);
        }

        if (User.IsInRole("Student"))
        {
            return exam.IsPublished &&
                exam.CourseOfferingId.HasValue &&
                await _context.StudentCourseEnrollments.AnyAsync(x =>
                    x.StudentId == userId.Value &&
                    x.CourseOfferingId == exam.CourseOfferingId.Value &&
                    x.EligibleForExam &&
                    x.Status == "Eligible");
        }

        return false;
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

            var correctAnswer = NormalizeOptionalValue(dto.CorrectAnswer);
            if (string.IsNullOrWhiteSpace(correctAnswer))
                return "MCQ questions require a correct answer.";

            if (!options.Any(x => string.Equals(x, correctAnswer, StringComparison.OrdinalIgnoreCase)))
                return "Correct answer must match one of the MCQ options.";
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

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
