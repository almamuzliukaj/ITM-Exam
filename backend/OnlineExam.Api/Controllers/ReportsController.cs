using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin,Professor,Assistant")]
public class ReportsController : ControllerBase
{
    private const string QuestionBankMarker = "__QUESTION_BANK__:";
    private const string ExamAttemptSubmittedStatus = "Submitted";
    private readonly AppDbContext _context;

    public ReportsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] Guid? courseOfferingId = null)
    {
        var scope = await BuildScopeAsync(courseOfferingId);
        if (scope.ErrorResult != null)
            return scope.ErrorResult;

        var exams = scope.Exams!;
        var examIds = await exams.Select(x => x.Id).ToListAsync();
        var attempts = _context.ExamAttempts.Where(x => examIds.Contains(x.ExamId));

        var summary = new
        {
            offerings = scope.AccessibleOfferingIds.Count,
            exams = examIds.Count,
            publishedExams = await exams.CountAsync(x => x.IsPublished && x.Status == "Published"),
            submittedAttempts = await attempts.CountAsync(x => x.Status == ExamAttemptSubmittedStatus),
            publishedResults = await attempts.CountAsync(x => x.IsPublished),
            pendingResults = await attempts.CountAsync(x => x.Status == ExamAttemptSubmittedStatus && !x.IsPublished),
            averageScore = await CalculateAverageFinalScoreAsync(attempts),
            integrityViolations = await _context.ExamIntegrityEvents.CountAsync(x => examIds.Contains(x.ExamId))
        };

        return Ok(new
        {
            scope = BuildScopeResponse(scope),
            summary
        });
    }

    [HttpGet("participation")]
    public async Task<IActionResult> GetParticipation([FromQuery] Guid? courseOfferingId = null)
    {
        var scope = await BuildScopeAsync(courseOfferingId);
        if (scope.ErrorResult != null)
            return scope.ErrorResult;

        var exams = scope.Exams!;
        var rows = await exams
            .Select(exam => new
            {
                exam.Id,
                exam.Title,
                exam.Status,
                exam.IsPublished,
                exam.StartsAt,
                exam.EndsAt,
                CourseOfferingId = exam.CourseOfferingId,
                CourseCode = exam.CourseOffering != null && exam.CourseOffering.Course != null ? exam.CourseOffering.Course.Code : null,
                CourseName = exam.CourseOffering != null && exam.CourseOffering.Course != null ? exam.CourseOffering.Course.Name : null,
                AttemptCount = exam.Attempts.Count,
                SubmittedCount = exam.Attempts.Count(a => a.Status == ExamAttemptSubmittedStatus),
                PublishedResultCount = exam.Attempts.Count(a => a.IsPublished),
                AverageFinalScore = exam.Attempts
                    .Where(a => a.Status == ExamAttemptSubmittedStatus && a.IsGraded)
                    .Select(a => (double?)a.FinalScore)
                    .Average()
            })
            .OrderByDescending(x => x.StartsAt)
            .ToListAsync();

        return Ok(new
        {
            scope = BuildScopeResponse(scope),
            items = rows.Select(x => new
            {
                x.Id,
                x.Title,
                x.Status,
                x.IsPublished,
                x.StartsAt,
                x.EndsAt,
                x.CourseOfferingId,
                x.CourseCode,
                x.CourseName,
                x.AttemptCount,
                x.SubmittedCount,
                x.PublishedResultCount,
                AverageFinalScore = x.AverageFinalScore.HasValue ? Math.Round(x.AverageFinalScore.Value, 2) : (double?)null
            })
        });
    }

    [HttpGet("publish-status")]
    public async Task<IActionResult> GetPublishStatus([FromQuery] Guid? courseOfferingId = null)
    {
        var scope = await BuildScopeAsync(courseOfferingId);
        if (scope.ErrorResult != null)
            return scope.ErrorResult;

        var exams = scope.Exams!;
        var rows = await exams
            .Select(exam => new
            {
                exam.Id,
                exam.Title,
                exam.Status,
                exam.IsPublished,
                CourseOfferingId = exam.CourseOfferingId,
                CourseCode = exam.CourseOffering != null && exam.CourseOffering.Course != null ? exam.CourseOffering.Course.Code : null,
                SubmittedCount = exam.Attempts.Count(a => a.Status == ExamAttemptSubmittedStatus),
                GradedCount = exam.Attempts.Count(a => a.Status == ExamAttemptSubmittedStatus && a.IsGraded),
                PublishedCount = exam.Attempts.Count(a => a.IsPublished),
                PendingPublicationCount = exam.Attempts.Count(a => a.Status == ExamAttemptSubmittedStatus && a.IsGraded && !a.IsPublished),
                PendingReviewCount = exam.Attempts.Count(a => a.Status == ExamAttemptSubmittedStatus && !a.IsGraded)
            })
            .OrderBy(x => x.CourseCode)
            .ThenBy(x => x.Title)
            .ToListAsync();

        return Ok(new
        {
            scope = BuildScopeResponse(scope),
            items = rows
        });
    }

    [HttpGet("integrity")]
    public async Task<IActionResult> GetIntegrity([FromQuery] Guid? courseOfferingId = null)
    {
        var scope = await BuildScopeAsync(courseOfferingId);
        if (scope.ErrorResult != null)
            return scope.ErrorResult;

        var exams = scope.Exams!;
        var rows = await exams
            .Select(exam => new
            {
                exam.Id,
                exam.Title,
                CourseOfferingId = exam.CourseOfferingId,
                CourseCode = exam.CourseOffering != null && exam.CourseOffering.Course != null ? exam.CourseOffering.Course.Code : null,
                AttemptsWithViolations = exam.Attempts.Count(a => a.IntegrityViolationCount > 0),
                TotalViolationCount = exam.Attempts.Sum(a => a.IntegrityViolationCount),
                HighestAttemptViolationCount = exam.Attempts.Select(a => (int?)a.IntegrityViolationCount).Max() ?? 0,
                AutoActionCount = exam.Attempts.Count(a => a.IntegrityPolicyAction == "AutoSubmit"),
                EventCount = exam.Attempts.SelectMany(a => a.IntegrityEvents).Count()
            })
            .OrderByDescending(x => x.TotalViolationCount)
            .ThenBy(x => x.CourseCode)
            .ThenBy(x => x.Title)
            .ToListAsync();

        return Ok(new
        {
            scope = BuildScopeResponse(scope),
            items = rows
        });
    }

    private async Task<ReportScopeResult> BuildScopeAsync(Guid? courseOfferingId)
    {
        if (User.IsInRole("Admin"))
        {
            var exams = BuildExamQuery(courseOfferingId, null);
            var accessibleOfferingIds = courseOfferingId.HasValue
                ? [courseOfferingId.Value]
                : await exams.Where(x => x.CourseOfferingId.HasValue).Select(x => x.CourseOfferingId!.Value).Distinct().ToListAsync();

            return new ReportScopeResult
            {
                Exams = exams,
                AccessibleOfferingIds = accessibleOfferingIds,
                RequestedOfferingId = courseOfferingId
            };
        }

        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return new ReportScopeResult
            {
                ErrorResult = Unauthorized()
            };
        }

        var assignmentRole = User.IsInRole("Professor") ? "Professor" : "Assistant";
        var accessibleOfferingIdsForStaff = await GetAssignedOfferingIdsAsync(userId.Value, assignmentRole);

        if (courseOfferingId.HasValue && !accessibleOfferingIdsForStaff.Contains(courseOfferingId.Value))
        {
            return new ReportScopeResult
            {
                ErrorResult = Forbid()
            };
        }

        return new ReportScopeResult
        {
            Exams = BuildExamQuery(courseOfferingId, accessibleOfferingIdsForStaff),
            AccessibleOfferingIds = courseOfferingId.HasValue ? [courseOfferingId.Value] : accessibleOfferingIdsForStaff,
            RequestedOfferingId = courseOfferingId
        };
    }

    private IQueryable<OnlineExam.Api.Models.Exam> BuildExamQuery(Guid? courseOfferingId, IReadOnlyCollection<Guid>? accessibleOfferingIds)
    {
        var query = _context.Exams
            .AsNoTracking()
            .Include(x => x.CourseOffering)!
                .ThenInclude(x => x!.Course)
            .Include(x => x.Attempts)
                .ThenInclude(x => x.IntegrityEvents)
            .Where(x => !x.Description.StartsWith(QuestionBankMarker));

        if (accessibleOfferingIds != null)
        {
            query = query.Where(x =>
                x.CourseOfferingId.HasValue &&
                accessibleOfferingIds.Contains(x.CourseOfferingId.Value));
        }

        if (courseOfferingId.HasValue)
            query = query.Where(x => x.CourseOfferingId == courseOfferingId.Value);

        return query;
    }

    private static object BuildScopeResponse(ReportScopeResult scope)
    {
        return new
        {
            courseOfferingId = scope.RequestedOfferingId,
            accessibleOfferings = scope.AccessibleOfferingIds.Count
        };
    }

    private async Task<double?> CalculateAverageFinalScoreAsync(IQueryable<OnlineExam.Api.Models.ExamAttempt> attempts)
    {
        var average = await attempts
            .Where(x => x.Status == ExamAttemptSubmittedStatus && x.IsGraded)
            .Select(x => (double?)x.FinalScore)
            .AverageAsync();

        return average.HasValue ? Math.Round(average.Value, 2) : null;
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

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }

    private sealed class ReportScopeResult
    {
        public IActionResult? ErrorResult { get; set; }
        public IQueryable<OnlineExam.Api.Models.Exam>? Exams { get; set; }
        public List<Guid> AccessibleOfferingIds { get; set; } = [];
        public Guid? RequestedOfferingId { get; set; }
    }
}
