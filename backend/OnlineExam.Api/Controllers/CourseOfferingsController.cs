using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Models;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api/course-offerings")]
[Authorize]
public class CourseOfferingsController : ControllerBase
{
    private static readonly HashSet<string> AllowedOfferingStatuses = ["Draft", "Published", "Active", "Closed", "Archived"];
    private static readonly HashSet<string> AllowedDeliveryTypes = ["Regular", "RetakeOnly", "Special"];
    private readonly AppDbContext _context;

    public CourseOfferingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetOfferings([FromQuery] Guid? termId, [FromQuery] int? yearOfStudy, [FromQuery] int? semesterNo)
    {
        IQueryable<CourseOffering> query = _context.CourseOfferings
            .AsNoTracking()
            .Include(x => x.Course)
            .Include(x => x.Term)
            .Include(x => x.StaffAssignments.Where(a => a.IsActive));
        System.Linq.Expressions.Expression<Func<CourseOffering, CourseOfferingResponseDto>> responseMap = MapToOfferingResponse();

        if (User.IsInRole("Professor") || User.IsInRole("Assistant"))
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Unauthorized();

            var isProfessor = User.IsInRole("Professor");
            var assignmentRole = isProfessor ? "Professor" : "Assistant";

            query = query.Where(x =>
                (isProfessor && x.PrimaryProfessorId == currentUserId.Value) ||
                (!isProfessor && x.AssistantId == currentUserId.Value) ||
                x.StaffAssignments.Any(a =>
                    a.UserId == currentUserId.Value &&
                    a.IsActive &&
                    a.RoleInOffering == assignmentRole));

            responseMap = MapToStaffOfferingResponse(currentUserId.Value, assignmentRole);
        }

        if (termId.HasValue)
            query = query.Where(x => x.TermId == termId.Value);
        if (yearOfStudy.HasValue)
            query = query.Where(x => x.YearOfStudy == yearOfStudy.Value);
        if (semesterNo.HasValue)
            query = query.Where(x => x.SemesterNo == semesterNo.Value);

        var offerings = await query
            .OrderBy(x => x.YearOfStudy)
            .ThenBy(x => x.SemesterNo)
            .ThenBy(x => x.SectionCode)
            .Select(responseMap)
            .ToListAsync();

        return Ok(offerings);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOffering(Guid id)
    {
        var offering = await _context.CourseOfferings
            .AsNoTracking()
            .Include(x => x.Course)
            .Include(x => x.Term)
            .Include(x => x.StaffAssignments)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (offering == null)
            return NotFound();

        if (User.IsInRole("Professor") || User.IsInRole("Assistant"))
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Unauthorized();

            var isProfessor = User.IsInRole("Professor");
            var assignmentRole = isProfessor ? "Professor" : "Assistant";

            var hasAccess = (isProfessor && offering.PrimaryProfessorId == currentUserId.Value) ||
                            (!isProfessor && offering.AssistantId == currentUserId.Value) ||
                            offering.StaffAssignments.Any(a =>
                                a.UserId == currentUserId.Value &&
                                a.IsActive &&
                                a.RoleInOffering == assignmentRole);

            if (!hasAccess)
                return Forbid();

            return Ok(await BuildOfferingResponseAsync(id, currentUserId.Value, assignmentRole));
        }

        return Ok(await BuildOfferingResponseAsync(id));
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Professor,Assistant")]
    public async Task<IActionResult> GetMyOfferings()
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();

        var isProfessor = User.IsInRole("Professor");
        var assignmentRole = isProfessor ? "Professor" : "Assistant";

        var offerings = await _context.CourseOfferings
            .AsNoTracking()
            .Include(x => x.Course)
            .Include(x => x.Term)
            .Include(x => x.StaffAssignments.Where(a => a.IsActive))
            .Where(x =>
                (isProfessor && x.PrimaryProfessorId == currentUserId.Value) ||
                (!isProfessor && x.AssistantId == currentUserId.Value) ||
                x.StaffAssignments.Any(a =>
                    a.UserId == currentUserId.Value &&
                    a.IsActive &&
                    a.RoleInOffering == assignmentRole))
            .OrderBy(x => x.YearOfStudy)
            .ThenBy(x => x.SemesterNo)
            .Select(MapToStaffOfferingResponse(currentUserId.Value, assignmentRole))
            .ToListAsync();

        return Ok(offerings);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateOffering([FromBody] CreateCourseOfferingDto dto)
    {
        var primaryProfessorId = dto.PrimaryProfessorId != Guid.Empty ? dto.PrimaryProfessorId : dto.ProfessorId ?? Guid.Empty;
        var validationError = await ValidateOfferingAsync(dto.CourseId, dto.TermId, dto.YearOfStudy, dto.SemesterNo, dto.SectionCode, dto.DeliveryType, dto.Capacity, primaryProfessorId, dto.AssistantId);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        var normalizedSectionCode = dto.SectionCode.Trim().ToUpperInvariant();
        if (await _context.CourseOfferings.AnyAsync(x => x.CourseId == dto.CourseId && x.TermId == dto.TermId && x.SectionCode == normalizedSectionCode))
            return Conflict(new { message = "An offering with this course, term, and section already exists." });

        var offering = new CourseOffering
        {
            Id = Guid.NewGuid(),
            CourseId = dto.CourseId,
            TermId = dto.TermId,
            YearOfStudy = dto.YearOfStudy,
            SemesterNo = dto.SemesterNo,
            SectionCode = normalizedSectionCode,
            DeliveryType = dto.DeliveryType.Trim(),
            Capacity = dto.Capacity,
            Status = "Draft",
            PrimaryProfessorId = primaryProfessorId,
            AssistantId = dto.AssistantId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CourseOfferings.Add(offering);
        _context.CourseOfferingStaffAssignments.Add(new CourseOfferingStaffAssignment
        {
            Id = Guid.NewGuid(),
            CourseOfferingId = offering.Id,
            UserId = primaryProfessorId,
            RoleInOffering = "Professor",
            AssignmentType = "Primary",
            PermissionsProfile = "FullTeaching",
            AssignedAt = DateTime.UtcNow,
            AssignedBy = GetCurrentUserId()!.Value,
            IsActive = true
        });

        if (dto.AssistantId.HasValue)
        {
            _context.CourseOfferingStaffAssignments.Add(new CourseOfferingStaffAssignment
            {
                Id = Guid.NewGuid(),
                CourseOfferingId = offering.Id,
                UserId = dto.AssistantId.Value,
                RoleInOffering = "Assistant",
                AssignmentType = "Secondary",
                PermissionsProfile = "GradingOnly",
                AssignedAt = DateTime.UtcNow,
                AssignedBy = GetCurrentUserId()!.Value,
                IsActive = true
            });
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOffering), new { id = offering.Id }, await BuildOfferingResponseAsync(offering.Id));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateOffering(Guid id, [FromBody] UpdateCourseOfferingDto dto)
    {
        var offering = await _context.CourseOfferings
            .Include(x => x.StaffAssignments)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (offering == null)
            return NotFound();

        var validationError = await ValidateOfferingAsync(offering.CourseId, offering.TermId, dto.YearOfStudy, dto.SemesterNo, dto.SectionCode, dto.DeliveryType, dto.Capacity, dto.PrimaryProfessorId, dto.AssistantId);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        if (!AllowedOfferingStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Invalid offering status." });

        var normalizedSectionCode = dto.SectionCode.Trim().ToUpperInvariant();
        if (await _context.CourseOfferings.AnyAsync(x => x.Id != id && x.CourseId == offering.CourseId && x.TermId == offering.TermId && x.SectionCode == normalizedSectionCode))
            return Conflict(new { message = "An offering with this course, term, and section already exists." });

        offering.YearOfStudy = dto.YearOfStudy;
        offering.SemesterNo = dto.SemesterNo;
        offering.SectionCode = normalizedSectionCode;
        offering.DeliveryType = dto.DeliveryType.Trim();
        offering.Capacity = dto.Capacity;
        offering.Status = dto.Status.Trim();
        offering.PrimaryProfessorId = dto.PrimaryProfessorId;
        offering.AssistantId = dto.AssistantId;
        offering.UpdatedAt = DateTime.UtcNow;

        await SyncAssignmentsAsync(offering, dto.PrimaryProfessorId, dto.AssistantId);
        await _context.SaveChangesAsync();

        return Ok(await BuildOfferingResponseAsync(id));
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Publish(Guid id)
    {
        var offering = await _context.CourseOfferings.FindAsync(id);
        if (offering == null)
            return NotFound();

        if (offering.PrimaryProfessorId == Guid.Empty)
            return BadRequest(new { message = "Offering must have an active primary professor before publishing." });

        offering.Status = "Published";
        offering.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(await BuildOfferingResponseAsync(id));
    }

    [HttpPost("{id:guid}/close")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Close(Guid id)
    {
        var offering = await _context.CourseOfferings.FindAsync(id);
        if (offering == null)
            return NotFound();

        offering.Status = "Closed";
        offering.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(await BuildOfferingResponseAsync(id));
    }

    private async Task<CourseOfferingResponseDto?> BuildOfferingResponseAsync(Guid offeringId, Guid? staffUserId = null, string? staffRole = null)
    {
        var responseMap = staffUserId.HasValue && !string.IsNullOrWhiteSpace(staffRole)
            ? MapToStaffOfferingResponse(staffUserId.Value, staffRole)
            : MapToOfferingResponse();

        return await _context.CourseOfferings
            .AsNoTracking()
            .Include(x => x.Course)
            .Include(x => x.Term)
            .Include(x => x.StaffAssignments)
            .Where(x => x.Id == offeringId)
            .Select(responseMap)
            .FirstOrDefaultAsync();
    }

    private static System.Linq.Expressions.Expression<Func<CourseOffering, CourseOfferingResponseDto>> MapToOfferingResponse()
    {
        return offering => new CourseOfferingResponseDto
        {
            Id = offering.Id,
            CourseId = offering.CourseId,
            TermId = offering.TermId,
            YearOfStudy = offering.YearOfStudy,
            SemesterNo = offering.SemesterNo,
            SectionCode = offering.SectionCode,
            DeliveryType = offering.DeliveryType,
            Capacity = offering.Capacity,
            Status = offering.Status,
            PrimaryProfessorId = offering.PrimaryProfessorId,
            AssistantId = offering.AssistantId,
            CreatedAt = offering.CreatedAt,
            UpdatedAt = offering.UpdatedAt,
            Course = offering.Course == null ? null : new CourseOfferingCourseDto
            {
                Id = offering.Course.Id,
                Code = offering.Course.Code,
                Name = offering.Course.Name,
                Credits = offering.Course.Credits,
                YearOfStudy = offering.Course.YearOfStudy,
                DefaultSemesterNo = offering.Course.DefaultSemesterNo,
                IsElective = offering.Course.IsElective,
                IsActive = offering.Course.IsActive,
                Description = offering.Course.Description
            },
            Term = offering.Term == null ? null : new CourseOfferingTermDto
            {
                Id = offering.Term.Id,
                Code = offering.Term.Code,
                Name = offering.Term.Name,
                Season = offering.Term.Season,
                AcademicYearLabel = offering.Term.AcademicYearLabel,
                StartDate = offering.Term.StartDate,
                EndDate = offering.Term.EndDate,
                EnrollmentOpenAt = offering.Term.EnrollmentOpenAt,
                EnrollmentCloseAt = offering.Term.EnrollmentCloseAt,
                Status = offering.Term.Status,
                IsCurrent = offering.Term.IsCurrent
            },
            StaffAssignments = offering.StaffAssignments
                .Select(assignment => new CourseOfferingStaffAssignmentResponseDto
                {
                    Id = assignment.Id,
                    CourseOfferingId = assignment.CourseOfferingId,
                    UserId = assignment.UserId,
                    RoleInOffering = assignment.RoleInOffering,
                    AssignmentType = assignment.AssignmentType,
                    PermissionsProfile = assignment.PermissionsProfile,
                    AssignedAt = assignment.AssignedAt,
                    AssignedBy = assignment.AssignedBy,
                    RevokedAt = assignment.RevokedAt,
                    RevokedBy = assignment.RevokedBy,
                    IsActive = assignment.IsActive
                })
                .ToList()
        };
    }

    private static System.Linq.Expressions.Expression<Func<CourseOffering, CourseOfferingResponseDto>> MapToStaffOfferingResponse(Guid staffUserId, string staffRole)
    {
        return offering => new CourseOfferingResponseDto
        {
            Id = offering.Id,
            CourseId = offering.CourseId,
            TermId = offering.TermId,
            YearOfStudy = offering.YearOfStudy,
            SemesterNo = offering.SemesterNo,
            SectionCode = offering.SectionCode,
            DeliveryType = offering.DeliveryType,
            Capacity = offering.Capacity,
            Status = offering.Status,
            PrimaryProfessorId = Guid.Empty,
            AssistantId = null,
            CreatedAt = offering.CreatedAt,
            UpdatedAt = offering.UpdatedAt,
            Course = offering.Course == null ? null : new CourseOfferingCourseDto
            {
                Id = offering.Course.Id,
                Code = offering.Course.Code,
                Name = offering.Course.Name,
                Credits = offering.Course.Credits,
                YearOfStudy = offering.Course.YearOfStudy,
                DefaultSemesterNo = offering.Course.DefaultSemesterNo,
                IsElective = offering.Course.IsElective,
                IsActive = offering.Course.IsActive,
                Description = offering.Course.Description
            },
            Term = offering.Term == null ? null : new CourseOfferingTermDto
            {
                Id = offering.Term.Id,
                Code = offering.Term.Code,
                Name = offering.Term.Name,
                Season = offering.Term.Season,
                AcademicYearLabel = offering.Term.AcademicYearLabel,
                StartDate = offering.Term.StartDate,
                EndDate = offering.Term.EndDate,
                EnrollmentOpenAt = offering.Term.EnrollmentOpenAt,
                EnrollmentCloseAt = offering.Term.EnrollmentCloseAt,
                Status = offering.Term.Status,
                IsCurrent = offering.Term.IsCurrent
            },
            StaffAssignments = offering.StaffAssignments
                .Where(assignment =>
                    assignment.UserId == staffUserId &&
                    assignment.IsActive &&
                    assignment.RoleInOffering == staffRole)
                .Select(assignment => new CourseOfferingStaffAssignmentResponseDto
                {
                    Id = assignment.Id,
                    CourseOfferingId = assignment.CourseOfferingId,
                    UserId = assignment.UserId,
                    RoleInOffering = assignment.RoleInOffering,
                    AssignmentType = assignment.AssignmentType,
                    PermissionsProfile = assignment.PermissionsProfile,
                    AssignedAt = assignment.AssignedAt,
                    AssignedBy = assignment.AssignedBy,
                    RevokedAt = assignment.RevokedAt,
                    RevokedBy = assignment.RevokedBy,
                    IsActive = assignment.IsActive
                })
                .ToList()
        };
    }

    private Task SyncAssignmentsAsync(CourseOffering offering, Guid primaryProfessorId, Guid? assistantId)
    {
        var currentUserId = GetCurrentUserId()!.Value;
        var activeAssignments = offering.StaffAssignments.Where(x => x.IsActive).ToList();

        foreach (var professorAssignment in activeAssignments.Where(x => x.RoleInOffering == "Professor" && x.UserId != primaryProfessorId))
        {
            professorAssignment.IsActive = false;
            professorAssignment.RevokedAt = DateTime.UtcNow;
            professorAssignment.RevokedBy = currentUserId;
        }

        if (!activeAssignments.Any(x => x.RoleInOffering == "Professor" && x.UserId == primaryProfessorId))
        {
            _context.CourseOfferingStaffAssignments.Add(new CourseOfferingStaffAssignment
            {
                Id = Guid.NewGuid(),
                CourseOfferingId = offering.Id,
                UserId = primaryProfessorId,
                RoleInOffering = "Professor",
                AssignmentType = "Primary",
                PermissionsProfile = "FullTeaching",
                AssignedAt = DateTime.UtcNow,
                AssignedBy = currentUserId,
                IsActive = true
            });
        }

        foreach (var assistantAssignment in activeAssignments.Where(x => x.RoleInOffering == "Assistant" && (!assistantId.HasValue || x.UserId != assistantId.Value)))
        {
            assistantAssignment.IsActive = false;
            assistantAssignment.RevokedAt = DateTime.UtcNow;
            assistantAssignment.RevokedBy = currentUserId;
        }

        if (assistantId.HasValue && !activeAssignments.Any(x => x.RoleInOffering == "Assistant" && x.UserId == assistantId.Value))
        {
            _context.CourseOfferingStaffAssignments.Add(new CourseOfferingStaffAssignment
            {
                Id = Guid.NewGuid(),
                CourseOfferingId = offering.Id,
                UserId = assistantId.Value,
                RoleInOffering = "Assistant",
                AssignmentType = "Secondary",
                PermissionsProfile = "GradingOnly",
                AssignedAt = DateTime.UtcNow,
                AssignedBy = currentUserId,
                IsActive = true
            });
        }
        return Task.CompletedTask;
    }

    private async Task<string?> ValidateOfferingAsync(Guid courseId, Guid termId, int yearOfStudy, int semesterNo, string sectionCode, string deliveryType, int capacity, Guid primaryProfessorId, Guid? assistantId)
    {
        if (courseId == Guid.Empty || !await _context.Courses.AnyAsync(x => x.Id == courseId))
            return "Valid CourseId is required.";
        if (termId == Guid.Empty || !await _context.Terms.AnyAsync(x => x.Id == termId))
            return "Valid TermId is required.";
        if (!IsValidYearSemesterPair(yearOfStudy, semesterNo))
            return "YearOfStudy and SemesterNo are not a valid pair.";
        if (string.IsNullOrWhiteSpace(sectionCode))
            return "SectionCode is required.";
        if (!AllowedDeliveryTypes.Contains(deliveryType.Trim()))
            return "Invalid delivery type.";
        if (capacity < 0)
            return "Capacity cannot be negative.";
        if (primaryProfessorId == Guid.Empty || !await _context.Users.AnyAsync(x => x.Id == primaryProfessorId && x.Role == "Professor" && x.IsActive))
            return "A valid active professor is required.";
        if (assistantId.HasValue && !await _context.Users.AnyAsync(x => x.Id == assistantId.Value && x.Role == "Assistant" && x.IsActive))
            return "AssistantId must reference an active assistant.";

        return null;
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }

    private static bool IsValidYearSemesterPair(int yearOfStudy, int semesterNo)
    {
        if (yearOfStudy < 1)
            return false;

        return semesterNo >= 1;
    }
}
