using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Models;
using OnlineExam.Api.Services;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api/course-offerings/{offeringId:guid}/staff")]
[Authorize]
public class CourseOfferingStaffAssignmentsController : ControllerBase
{
    private static readonly HashSet<string> AllowedRoles = ["Professor", "Assistant"];
    private static readonly HashSet<string> AllowedAssignmentTypes = ["Primary", "Secondary"];
    private static readonly HashSet<string> AllowedPermissionProfiles = ["FullTeaching", "LimitedTeaching", "GradingOnly"];
    private readonly AppDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public CourseOfferingStaffAssignmentsController(AppDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetStaff(Guid offeringId)
    {
        var offering = await _context.CourseOfferings
            .Include(x => x.StaffAssignments)
            .FirstOrDefaultAsync(x => x.Id == offeringId);

        if (offering == null)
            return NotFound();

        if (!await CanManageOrViewAsync(offeringId))
            return Forbid();

        return Ok(offering.StaffAssignments.OrderByDescending(x => x.AssignedAt));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Professor")]
    public async Task<IActionResult> Assign(Guid offeringId, [FromBody] CreateCourseOfferingStaffAssignmentDto dto)
    {
        var offering = await _context.CourseOfferings
            .Include(x => x.StaffAssignments)
            .FirstOrDefaultAsync(x => x.Id == offeringId);

        if (offering == null)
            return NotFound();

        if (!await CanAssignAsync(offering, dto.RoleInOffering))
            return Forbid();

        var validationError = await ValidateAssignmentDtoAsync(dto, offeringId);
        if (validationError != null)
            return BadRequest(new { message = validationError });

        if (dto.RoleInOffering == "Professor" && dto.AssignmentType == "Primary" &&
            offering.StaffAssignments.Any(x => x.IsActive && x.RoleInOffering == "Professor" && x.AssignmentType == "Primary"))
        {
            return BadRequest(new { message = "Offering already has an active primary professor." });
        }

        if (offering.StaffAssignments.Any(x => x.IsActive && x.RoleInOffering == dto.RoleInOffering && x.UserId == dto.UserId))
            return Conflict(new { message = "The user already has an active assignment with this role in the offering." });

        var assignment = new CourseOfferingStaffAssignment
        {
            Id = Guid.NewGuid(),
            CourseOfferingId = offeringId,
            UserId = dto.UserId,
            RoleInOffering = dto.RoleInOffering.Trim(),
            AssignmentType = dto.AssignmentType.Trim(),
            PermissionsProfile = dto.PermissionsProfile.Trim(),
            AssignedAt = DateTime.UtcNow,
            AssignedBy = GetCurrentUserId()!.Value,
            IsActive = true
        };

        _context.CourseOfferingStaffAssignments.Add(assignment);

        if (dto.RoleInOffering == "Professor" && dto.AssignmentType == "Primary")
            offering.PrimaryProfessorId = dto.UserId;
        if (dto.RoleInOffering == "Assistant")
            offering.AssistantId = dto.UserId;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("StaffAssignment.Created", "CourseOfferingStaffAssignment", assignment.Id, new
        {
            assignment.CourseOfferingId,
            assignment.UserId,
            assignment.RoleInOffering,
            assignment.AssignmentType
        }, "AcademicStructure");
        return Ok(assignment);
    }

    [HttpPut("{assignmentId:guid}")]
    [Authorize(Roles = "Admin,Professor")]
    public async Task<IActionResult> Update(Guid offeringId, Guid assignmentId, [FromBody] UpdateCourseOfferingStaffAssignmentDto dto)
    {
        var assignment = await _context.CourseOfferingStaffAssignments
            .Include(x => x.CourseOffering)
            .FirstOrDefaultAsync(x => x.Id == assignmentId && x.CourseOfferingId == offeringId);

        if (assignment == null)
            return NotFound();

        if (!await CanAssignAsync(assignment.CourseOffering!, assignment.RoleInOffering))
            return Forbid();

        if (!AllowedAssignmentTypes.Contains(dto.AssignmentType))
            return BadRequest(new { message = "Invalid assignment type." });
        if (!AllowedPermissionProfiles.Contains(dto.PermissionsProfile))
            return BadRequest(new { message = "Invalid permissions profile." });

        assignment.AssignmentType = dto.AssignmentType.Trim();
        assignment.PermissionsProfile = dto.PermissionsProfile.Trim();
        assignment.IsActive = dto.IsActive;
        if (!dto.IsActive && assignment.RevokedAt == null)
        {
            assignment.RevokedAt = DateTime.UtcNow;
            assignment.RevokedBy = GetCurrentUserId();
        }

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("StaffAssignment.Updated", "CourseOfferingStaffAssignment", assignment.Id, new
        {
            assignment.CourseOfferingId,
            assignment.UserId,
            assignment.RoleInOffering,
            assignment.IsActive,
            assignment.PermissionsProfile
        }, "AcademicStructure");
        return Ok(assignment);
    }

    [HttpPost("{assignmentId:guid}/revoke")]
    [Authorize(Roles = "Admin,Professor")]
    public async Task<IActionResult> Revoke(Guid offeringId, Guid assignmentId)
    {
        var assignment = await _context.CourseOfferingStaffAssignments
            .Include(x => x.CourseOffering)
            .FirstOrDefaultAsync(x => x.Id == assignmentId && x.CourseOfferingId == offeringId);

        if (assignment == null)
            return NotFound();

        if (!await CanAssignAsync(assignment.CourseOffering!, assignment.RoleInOffering))
            return Forbid();

        assignment.IsActive = false;
        assignment.RevokedAt = DateTime.UtcNow;
        assignment.RevokedBy = GetCurrentUserId();

        if (assignment.RoleInOffering == "Assistant" && assignment.CourseOffering!.AssistantId == assignment.UserId)
            assignment.CourseOffering.AssistantId = null;

        await _context.SaveChangesAsync();
        await _auditLogService.LogAsync("StaffAssignment.Revoked", "CourseOfferingStaffAssignment", assignment.Id, new
        {
            assignment.CourseOfferingId,
            assignment.UserId,
            assignment.RoleInOffering
        }, "AcademicStructure");
        return Ok(assignment);
    }

    private async Task<string?> ValidateAssignmentDtoAsync(CreateCourseOfferingStaffAssignmentDto dto, Guid offeringId)
    {
        if (dto.UserId == Guid.Empty)
            return "UserId is required.";
        if (!AllowedRoles.Contains(dto.RoleInOffering.Trim()))
            return "Invalid role in offering.";
        if (!AllowedAssignmentTypes.Contains(dto.AssignmentType.Trim()))
            return "Invalid assignment type.";
        if (!AllowedPermissionProfiles.Contains(dto.PermissionsProfile.Trim()))
            return "Invalid permissions profile.";

        var expectedSystemRole = dto.RoleInOffering.Trim();
        var userExists = await _context.Users.AnyAsync(x => x.Id == dto.UserId && x.Role == expectedSystemRole && x.IsActive);
        if (!userExists)
            return $"User must be an active {expectedSystemRole}.";

        var offeringExists = await _context.CourseOfferings.AnyAsync(x => x.Id == offeringId);
        if (!offeringExists)
            return "Offering was not found.";

        return null;
    }

    private async Task<bool> CanManageOrViewAsync(Guid offeringId)
    {
        if (User.IsInRole("Admin"))
            return true;

        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return false;

        return await _context.CourseOfferingStaffAssignments.AnyAsync(x =>
            x.CourseOfferingId == offeringId &&
            x.UserId == currentUserId.Value &&
            x.IsActive);
    }

    private async Task<bool> CanAssignAsync(CourseOffering offering, string requestedRole)
    {
        if (User.IsInRole("Admin"))
            return true;

        if (!User.IsInRole("Professor"))
            return false;

        if (!string.Equals(requestedRole?.Trim(), "Assistant", StringComparison.Ordinal))
            return false;

        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return false;

        return await _context.CourseOfferingStaffAssignments.AnyAsync(x =>
            x.CourseOfferingId == offering.Id &&
            x.UserId == currentUserId.Value &&
            x.IsActive &&
            x.RoleInOffering == "Professor" &&
            x.AssignmentType == "Primary");
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}
