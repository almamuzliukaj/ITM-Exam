using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        if (User.IsInRole("Admin"))
            return Ok(await BuildAdminSummaryAsync());

        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        if (User.IsInRole("Professor"))
            return Ok(await BuildProfessorSummaryAsync(userId.Value));

        if (User.IsInRole("Assistant"))
            return Ok(await BuildAssistantSummaryAsync(userId.Value));

        if (User.IsInRole("Student"))
            return Ok(await BuildStudentSummaryAsync(userId.Value));

        return Forbid();
    }

    private async Task<object> BuildAdminSummaryAsync()
    {
        var activeUsers = await _context.Users.CountAsync(x => x.IsActive);
        var offerings = await _context.CourseOfferings.CountAsync();
        var pendingEnrollments = await _context.SemesterEnrollments.CountAsync(x => x.Status == "Pending");
        var alerts = await _context.CourseOfferings.CountAsync(x => x.Status == "Draft")
                     + await _context.Terms.CountAsync(x => x.Status == "Draft");

        return new
        {
            role = "Admin",
            metrics = new
            {
                activeUsers,
                offerings,
                imports = pendingEnrollments,
                alerts
            }
        };
    }

    private async Task<object> BuildProfessorSummaryAsync(Guid userId)
    {
        var offeringIds = await GetAssignedOfferingIds(userId, "Professor").ToListAsync();
        var assignedCourses = await _context.CourseOfferings
            .Where(x => offeringIds.Contains(x.Id))
            .Select(x => x.CourseId)
            .Distinct()
            .CountAsync();

        var exams = GetAccessibleExamQuery(userId, offeringIds);
        var examIds = await exams.Select(x => x.Id).ToListAsync();
        var draftExams = await exams.CountAsync(x => !x.IsPublished || x.Status == "Draft");
        var questionBank = await _context.Questions.CountAsync(x => examIds.Contains(x.ExamId));
        var grading = await _context.ExamAttempts.CountAsync(x => examIds.Contains(x.ExamId));

        return new
        {
            role = "Professor",
            metrics = new
            {
                assignedCourses,
                draftExams,
                questionBank,
                grading
            }
        };
    }

    private async Task<object> BuildAssistantSummaryAsync(Guid userId)
    {
        var offeringIds = await GetAssignedOfferingIds(userId, "Assistant").ToListAsync();
        var now = DateTime.UtcNow;

        var exams = _context.Exams.Where(x =>
            x.CourseOfferingId.HasValue &&
            offeringIds.Contains(x.CourseOfferingId.Value));

        var examIds = await exams.Select(x => x.Id).ToListAsync();
        var assignedOfferings = offeringIds.Count;
        var supportExams = await exams.CountAsync();
        var reviewTasks = await _context.ExamAttempts.CountAsync(x => examIds.Contains(x.ExamId));
        var activeSessions = await exams.CountAsync(x => x.IsPublished && x.StartsAt <= now && x.EndsAt >= now);

        return new
        {
            role = "Assistant",
            metrics = new
            {
                assignedOfferings,
                supportExams,
                reviewTasks,
                activeSessions
            }
        };
    }

    private async Task<object> BuildStudentSummaryAsync(Guid userId)
    {
        var offeringIds = await GetEligibleOfferingIdsAsync(userId);
        var now = DateTime.UtcNow;
        var nextWeek = now.AddDays(7);

        var eligibleExamsQuery = _context.Exams.Where(x =>
            x.IsPublished &&
            x.CourseOfferingId.HasValue &&
            offeringIds.Contains(x.CourseOfferingId.Value));

        var eligibleExams = await eligibleExamsQuery.CountAsync();
        var upcoming = await eligibleExamsQuery.CountAsync(x => x.StartsAt >= now && x.StartsAt <= nextWeek);
        var results = await _context.ExamAttempts.CountAsync(x => x.StudentId == userId);
        var carryOver = await _context.CarryOverCourses.CountAsync(x => x.StudentId == userId && x.Status == "Open");

        return new
        {
            role = "Student",
            metrics = new
            {
                eligibleExams,
                upcoming,
                results,
                carryOver
            }
        };
    }

    private IQueryable<Guid> GetAssignedOfferingIds(Guid userId, string role)
    {
        var assignmentRole = role == "Professor" ? "Professor" : "Assistant";

        var assignmentIds = _context.CourseOfferingStaffAssignments
            .Where(x => x.UserId == userId && x.IsActive && x.RoleInOffering == assignmentRole)
            .Select(x => x.CourseOfferingId);

        var directIds = role == "Professor"
            ? _context.CourseOfferings.Where(x => x.PrimaryProfessorId == userId).Select(x => x.Id)
            : _context.CourseOfferings.Where(x => x.AssistantId == userId).Select(x => x.Id);

        return assignmentIds.Union(directIds).Distinct();
    }

    private IQueryable<OnlineExam.Api.Models.Exam> GetAccessibleExamQuery(Guid userId, IReadOnlyCollection<Guid> offeringIds)
    {
        return _context.Exams.Where(x =>
            x.CreatedByUserId == userId ||
            (x.CourseOfferingId.HasValue && offeringIds.Contains(x.CourseOfferingId.Value)));
    }

    private async Task<List<Guid>> GetEligibleOfferingIdsAsync(Guid userId)
    {
        return await _context.StudentCourseEnrollments
            .Where(x => x.StudentId == userId && x.EligibleForExam && x.Status == "Eligible")
            .Select(x => x.CourseOfferingId)
            .ToListAsync();
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
