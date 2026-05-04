using System.Security.Claims;
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

        IQueryable<Exam> query = _context.Exams.Include(x => x.CourseOffering);

        if (User.IsInRole("Professor") || User.IsInRole("Assistant"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            query = query.Where(x =>
                x.CreatedByUserId == userId.Value ||
                (x.CourseOfferingId != null && _context.CourseOfferingStaffAssignments.Any(a =>
                    a.CourseOfferingId == x.CourseOfferingId &&
                    a.UserId == userId.Value &&
                    a.IsActive)));
        }
        else if (User.IsInRole("Student"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

 feat/student-eligibility-dashboard
            query = query.Where(x =>
                x.CourseOfferingId != null &&
                x.IsPublished &&
                x.Status == "Published" &&
                _context.StudentCourseEnrollments.Any(e =>
                    e.StudentId == userId.Value &&
                    e.CourseOfferingId == x.CourseOfferingId &&
                    e.EligibleForExam &&

                    e.Status == "Eligible"));
            var offeringIds = await GetEligibleOfferingIdsAsync(userId.Value);
            query = query.Where(x =>
                x.IsPublished &&
                x.CourseOfferingId.HasValue &&
                offeringIds.Contains(x.CourseOfferingId.Value));
 main
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

        if (User.IsInRole("Professor") || User.IsInRole("Assistant"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var hasAccess = exam.CreatedByUserId == userId.Value ||
                            (exam.CourseOfferingId != null && await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
                                a.CourseOfferingId == exam.CourseOfferingId &&
                                a.UserId == userId.Value &&
                                a.IsActive));

            if (!hasAccess)
                return Forbid();
        }
        else if (User.IsInRole("Student"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

 feat/student-eligibility-dashboard
            var hasAccess = exam.CourseOfferingId != null &&
                            exam.IsPublished &&
                            exam.Status == "Published" &&
                            await _context.StudentCourseEnrollments.AnyAsync(e =>
                                e.StudentId == userId.Value &&
                                e.CourseOfferingId == exam.CourseOfferingId &&
                                e.EligibleForExam &&
                                e.Status == "Eligible");

            if (!hasAccess)

            if (!await CanStudentAccessExamAsync(userId.Value, exam))
 main
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

        if (dto.CourseOfferingId.HasValue)
        {
            var offeringExists = await _context.CourseOfferings.AnyAsync(x => x.Id == dto.CourseOfferingId.Value);
            if (!offeringExists)
                return BadRequest(new { message = "CourseOfferingId is invalid." });

            var hasAssignment = await _context.CourseOfferingStaffAssignments.AnyAsync(a =>
                a.CourseOfferingId == dto.CourseOfferingId.Value &&
                a.UserId == userId.Value &&
                a.IsActive);

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

 feat/student-eligibility-dashboard
        var canAttempt = exam.CourseOfferingId != null &&
                         exam.IsPublished &&
                         exam.Status == "Published" &&
                         await _context.StudentCourseEnrollments.AnyAsync(e =>
                             e.StudentId == userId.Value &&
                             e.CourseOfferingId == exam.CourseOfferingId &&
                             e.EligibleForExam &&
                             e.Status == "Eligible");

        if (!canAttempt)

        if (!await CanStudentAccessExamAsync(userId.Value, exam))
        main
            return Forbid();

        var details = new List<QuestionScoreDetailDto>();
        double score = 0;

        foreach (var answer in dto.Answers)
        {
            var question = exam.Questions.FirstOrDefault(x => x.Id == answer.QuestionId);
            if (question == null)
                continue;

            var awarded = 0d;
            if (string.Equals(question.Type, "MCQ", StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(question.CorrectAnswer) &&
                string.Equals(question.CorrectAnswer.Trim(), answer.Response.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                awarded = question.Points;
            }

            details.Add(new QuestionScoreDetailDto
            {
                QuestionId = question.Id,
                PointsAwarded = awarded,
                MaxPoints = question.Points
            });

            score += awarded;
        }

        var attempt = new ExamAttempt
        {
            Id = Guid.NewGuid(),
            ExamId = examId,
            StudentId = userId.Value,
            SubmittedAt = DateTime.UtcNow,
            AnswersJson = System.Text.Json.JsonSerializer.Serialize(dto.Answers),
            Score = score
        };

        _context.ExamAttempts.Add(attempt);
        await _context.SaveChangesAsync();

        return Ok(new ExamAttemptResultDto
        {
            ExamAttemptId = attempt.Id,
            Score = attempt.Score,
            Questions = details
        });
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> PublishExam(Guid id)
    {
        var exam = await _context.Exams.FindAsync(id);
        if (exam == null)
            return NotFound();

        exam.Status = "Published";
        exam.IsPublished = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Exam published!", examId = id });
    }

    [HttpGet("{id:guid}/gradebook")]
    [Authorize(Roles = "Professor")]
    public async Task<IActionResult> GetGradebook(Guid id)
    {
        var attempts = await _context.ExamAttempts
            .Where(a => a.ExamId == id)
            .Select(a => new
            {
                a.Id,
                a.StudentId,
                a.Score,
                a.SubmittedAt
            })
            .ToListAsync();

        return Ok(attempts);
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

        if (!string.IsNullOrWhiteSpace(dto.Difficulty))
            query = query.Where(q => q.Difficulty != null && q.Difficulty.ToLower() == dto.Difficulty.ToLower());

        if (!string.IsNullOrWhiteSpace(dto.Type))
            query = query.Where(q => q.Type.ToLower() == dto.Type.ToLower());

        var random = await query
            .OrderBy(_ => Guid.NewGuid())
            .Take(dto.NumberOfQuestions)
            .Select(q => new { q.Id, q.Text, q.Points, q.Type })
            .ToListAsync();

        return Ok(random);
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }

    private async Task<List<Guid>> GetEligibleOfferingIdsAsync(Guid userId)
    {
        return await _context.StudentCourseEnrollments
            .Where(x => x.StudentId == userId && x.EligibleForExam && x.Status == "Eligible")
            .Select(x => x.CourseOfferingId)
            .ToListAsync();
    }

    private async Task<bool> CanStudentAccessExamAsync(Guid userId, Exam exam)
    {
        if (!exam.IsPublished || !exam.CourseOfferingId.HasValue)
            return false;

        return await _context.StudentCourseEnrollments.AnyAsync(x =>
            x.StudentId == userId &&
            x.CourseOfferingId == exam.CourseOfferingId.Value &&
            x.EligibleForExam &&
            x.Status == "Eligible");
    }
}
