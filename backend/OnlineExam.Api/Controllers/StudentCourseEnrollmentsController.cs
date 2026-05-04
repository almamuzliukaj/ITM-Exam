using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Models;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class StudentCourseEnrollmentsController : ControllerBase
{
    private static readonly HashSet<string> AllowedSources = ["RegularSemester", "CarryOver", "ManualOverride"];
    private static readonly HashSet<string> AllowedStatuses = ["Eligible", "Locked", "Withdrawn", "Completed"];
    private static readonly HashSet<string> VisibleTermStatuses = ["Open", "Active"];
    private readonly AppDbContext _context;

    public StudentCourseEnrollmentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("students/{studentId:guid}/course-enrollments")]
    public async Task<IActionResult> GetStudentCourseEnrollments(Guid studentId, [FromQuery] Guid? termId)
    {
        if (!User.IsInRole("Admin") && GetCurrentUserId() != studentId)
            return Forbid();

        var query = _context.StudentCourseEnrollments
            .Include(x => x.CourseOffering)!
                .ThenInclude(x => x!.Course)
            .Include(x => x.CourseOffering)!
                .ThenInclude(x => x!.Term)
            .Where(x => x.StudentId == studentId);

        if (termId.HasValue)
            query = query.Where(x => x.CourseOffering!.TermId == termId.Value);

        var enrollments = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return Ok(enrollments);
    }

    [HttpGet("students/me/eligibility")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyEligibilityDashboard()
    {
        var studentId = GetCurrentUserId();
        if (studentId == null)
            return Unauthorized();

        var currentTerm = await _context.Terms
            .Where(x => x.IsCurrent || VisibleTermStatuses.Contains(x.Status))
            .OrderByDescending(x => x.IsCurrent)
            .ThenByDescending(x => x.StartDate)
            .FirstOrDefaultAsync();

        if (currentTerm == null)
        {
            return Ok(new
            {
                currentTerm = (object?)null,
                semesterEnrollment = (object?)null,
                courses = Array.Empty<object>(),
                carryOvers = Array.Empty<object>(),
                exams = Array.Empty<object>(),
                summary = new
                {
                    eligibleCourses = 0,
                    visibleExams = 0,
                    upcomingExams = 0,
                    openCarryOvers = 0
                }
            });
        }

        var semesterEnrollment = await _context.SemesterEnrollments
            .Where(x => x.StudentId == studentId.Value && x.TermId == currentTerm.Id)
            .OrderByDescending(x => x.EnrolledAt)
            .Select(x => new
            {
                x.Id,
                x.YearOfStudy,
                x.SemesterNo,
                x.Status,
                x.EnrolledAt
            })
            .FirstOrDefaultAsync();

        var eligibleEnrollments = await _context.StudentCourseEnrollments
            .Include(x => x.CourseOffering)!
                .ThenInclude(x => x!.Course)
            .Include(x => x.CourseOffering)!
                .ThenInclude(x => x!.Term)
            .Where(x =>
                x.StudentId == studentId.Value &&
                x.CourseOffering != null &&
                x.CourseOffering.TermId == currentTerm.Id &&
                x.EligibleForExam &&
                x.Status == "Eligible")
            .OrderBy(x => x.CourseOffering!.YearOfStudy)
            .ThenBy(x => x.CourseOffering!.SemesterNo)
            .ThenBy(x => x.CourseOffering!.Course!.Code)
            .ToListAsync();

        var visibleOfferingIds = eligibleEnrollments.Select(x => x.CourseOfferingId).ToHashSet();
        var now = DateTime.UtcNow;
        var nextSevenDays = now.AddDays(7);

        var exams = await _context.Exams
            .Include(x => x.CourseOffering)!
                .ThenInclude(x => x!.Course)
            .Where(x =>
                x.CourseOfferingId != null &&
                visibleOfferingIds.Contains(x.CourseOfferingId.Value) &&
                x.IsPublished &&
                x.Status == "Published")
            .OrderBy(x => x.StartsAt)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.StartsAt,
                x.EndsAt,
                x.DurationMinutes,
                CourseCode = x.CourseOffering!.Course!.Code,
                CourseName = x.CourseOffering!.Course!.Name,
                x.CourseOffering.YearOfStudy,
                x.CourseOffering.SemesterNo,
                x.CourseOffering.SectionCode
            })
            .ToListAsync();

        var carryOvers = await _context.CarryOverCourses
            .Include(x => x.Course)
            .Include(x => x.OriginTerm)
            .Where(x => x.StudentId == studentId.Value && (x.Status == "Open" || x.Status == "AssignedToTerm"))
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.Status,
                x.Reason,
                x.OriginSemesterNo,
                OriginTerm = x.OriginTerm == null ? null : x.OriginTerm.Name,
                CourseCode = x.Course == null ? null : x.Course.Code,
                CourseName = x.Course == null ? null : x.Course.Name
            })
            .ToListAsync();

        return Ok(new
        {
            currentTerm = new
            {
                currentTerm.Id,
                currentTerm.Code,
                currentTerm.Name,
                currentTerm.Season,
                currentTerm.AcademicYearLabel,
                currentTerm.Status,
                currentTerm.IsCurrent
            },
            semesterEnrollment,
            courses = eligibleEnrollments.Select(x => new
            {
                EnrollmentId = x.Id,
                x.EnrollmentSource,
                x.Status,
                x.EligibleForExam,
                CourseOfferingId = x.CourseOfferingId,
                CourseCode = x.CourseOffering!.Course!.Code,
                CourseName = x.CourseOffering!.Course!.Name,
                x.CourseOffering.YearOfStudy,
                x.CourseOffering.SemesterNo,
                x.CourseOffering.SectionCode,
                OfferingStatus = x.CourseOffering.Status
            }),
            carryOvers,
            exams,
            summary = new
            {
                eligibleCourses = eligibleEnrollments.Count,
                visibleExams = exams.Count,
                upcomingExams = exams.Count(x => x.StartsAt >= now && x.StartsAt <= nextSevenDays),
                openCarryOvers = carryOvers.Count
            }
        });
    }

    [HttpPost("students/{studentId:guid}/course-enrollments/regularize")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Regularize(Guid studentId, [FromQuery] Guid termId)
    {
        var student = await _context.Users.FirstOrDefaultAsync(x => x.Id == studentId && x.Role == "Student");
        if (student == null)
            return NotFound(new { message = "Student not found." });

        var enrollment = await _context.SemesterEnrollments
            .FirstOrDefaultAsync(x => x.StudentId == studentId && x.TermId == termId && x.Status == "Active");

        if (enrollment == null)
            return BadRequest(new { message = "Student must have an active semester enrollment for the term." });

        var offerings = await _context.CourseOfferings
            .Where(x =>
                x.TermId == termId &&
                x.YearOfStudy == enrollment.YearOfStudy &&
                x.SemesterNo == enrollment.SemesterNo &&
                x.Status != "Archived")
            .ToListAsync();

        var created = new List<StudentCourseEnrollment>();
        var currentUserId = GetCurrentUserId()!.Value;

        foreach (var offering in offerings)
        {
            var alreadyExists = await _context.StudentCourseEnrollments.AnyAsync(x => x.StudentId == studentId && x.CourseOfferingId == offering.Id);
            if (alreadyExists)
                continue;

            var row = new StudentCourseEnrollment
            {
                Id = Guid.NewGuid(),
                StudentId = studentId,
                CourseOfferingId = offering.Id,
                LinkedSemesterEnrollmentId = enrollment.Id,
                EnrollmentSource = "RegularSemester",
                Status = "Eligible",
                EligibleForExam = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = currentUserId
            };

            created.Add(row);
            _context.StudentCourseEnrollments.Add(row);
        }

        await _context.SaveChangesAsync();
        return Ok(new { created = created.Count, enrollments = created });
    }

    [HttpPost("students/{studentId:guid}/course-enrollments")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateStudentCourseEnrollment(Guid studentId, [FromBody] CreateStudentCourseEnrollmentDto dto)
    {
        var validationError = await ValidateStudentCourseEnrollmentAsync(studentId, dto.CourseOfferingId, dto.LinkedSemesterEnrollmentId, dto.EnrollmentSource, dto.Status);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        var exists = await _context.StudentCourseEnrollments.AnyAsync(x => x.StudentId == studentId && x.CourseOfferingId == dto.CourseOfferingId);
        if (exists)
            return Conflict(new { message = "Student already has an enrollment for this course offering." });

        var enrollment = new StudentCourseEnrollment
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            CourseOfferingId = dto.CourseOfferingId,
            LinkedSemesterEnrollmentId = dto.LinkedSemesterEnrollmentId,
            EnrollmentSource = dto.EnrollmentSource.Trim(),
            Status = dto.Status.Trim(),
            EligibleForExam = dto.EligibleForExam,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = GetCurrentUserId()!.Value
        };

        _context.StudentCourseEnrollments.Add(enrollment);
        await _context.SaveChangesAsync();
        return Ok(enrollment);
    }

    [HttpPut("student-course-enrollments/{id:guid}")]
    [Authorize(Roles = "Admin,Professor")]
    public async Task<IActionResult> UpdateStudentCourseEnrollment(Guid id, [FromBody] UpdateStudentCourseEnrollmentDto dto)
    {
        var enrollment = await _context.StudentCourseEnrollments
            .Include(x => x.CourseOffering)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (enrollment == null)
            return NotFound();

        if (!AllowedStatuses.Contains(dto.Status.Trim()))
            return BadRequest(new { message = "Invalid student course enrollment status." });

        if (User.IsInRole("Professor"))
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var canManage = await _context.CourseOfferingStaffAssignments.AnyAsync(x =>
                x.CourseOfferingId == enrollment.CourseOfferingId &&
                x.UserId == userId.Value &&
                x.IsActive &&
                x.RoleInOffering == "Professor");

            if (!canManage)
                return Forbid();
        }

        enrollment.Status = dto.Status.Trim();
        enrollment.EligibleForExam = dto.EligibleForExam;
        await _context.SaveChangesAsync();
        return Ok(enrollment);
    }

    private async Task<string?> ValidateStudentCourseEnrollmentAsync(Guid studentId, Guid courseOfferingId, Guid? linkedSemesterEnrollmentId, string source, string status)
    {
        if (!await _context.Users.AnyAsync(x => x.Id == studentId && x.Role == "Student" && x.IsActive))
            return "StudentId must reference an active student.";
        if (!await _context.CourseOfferings.AnyAsync(x => x.Id == courseOfferingId))
            return "CourseOfferingId is invalid.";
        if (linkedSemesterEnrollmentId.HasValue && !await _context.SemesterEnrollments.AnyAsync(x => x.Id == linkedSemesterEnrollmentId.Value && x.StudentId == studentId))
            return "LinkedSemesterEnrollmentId is invalid for this student.";
        if (!AllowedSources.Contains(source.Trim()))
            return "Invalid enrollment source.";
        if (!AllowedStatuses.Contains(status.Trim()))
            return "Invalid enrollment status.";

        return null;
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
