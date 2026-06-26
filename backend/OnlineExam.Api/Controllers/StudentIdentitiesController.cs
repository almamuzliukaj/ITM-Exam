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
[Route("api/student-identities")]
[Authorize]
public class StudentIdentitiesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IStudentPhotoStorageService _photoStorage;
    private readonly IAuditLogService _auditLogService;

    public StudentIdentitiesController(
        AppDbContext context,
        IStudentPhotoStorageService photoStorage,
        IAuditLogService auditLogService)
    {
        _context = context;
        _photoStorage = photoStorage;
        _auditLogService = auditLogService;
    }

    [HttpGet("me")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyIdentity()
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
            return Unauthorized();

        var student = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == currentUserId.Value && x.Role == "Student");
        if (student == null)
            return NotFound();

        return Ok(ToIdentityDto(student));
    }

    [HttpGet("{studentId:guid}")]
    public async Task<IActionResult> GetStudentIdentity(Guid studentId, [FromQuery] Guid? examId)
    {
        var authorization = await AuthorizeStudentIdentityAccessAsync(studentId, examId);
        if (authorization != null)
            return authorization;

        var student = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == studentId && x.Role == "Student");
        if (student == null)
            return NotFound();

        return Ok(ToIdentityDto(student));
    }

    [HttpGet("{studentId:guid}/photo", Name = nameof(GetStudentPhoto))]
    public async Task<IActionResult> GetStudentPhoto(Guid studentId, [FromQuery] Guid? examId)
    {
        var authorization = await AuthorizeStudentIdentityAccessAsync(studentId, examId);
        if (authorization != null)
            return authorization;

        var student = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == studentId && x.Role == "Student");
        if (student == null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(student.OfficialPhotoFileName) || string.IsNullOrWhiteSpace(student.OfficialPhotoContentType))
            return BuildPlaceholderPhoto();

        var photo = await _photoStorage.ReadOfficialPhotoAsync(student.OfficialPhotoFileName, student.OfficialPhotoContentType, HttpContext.RequestAborted);
        if (photo == null)
            return BuildPlaceholderPhoto();

        return File(photo.Stream, photo.ContentType);
    }

    [HttpPost("{studentId:guid}/photo")]
    [Authorize(Roles = "Admin")]
    [RequestSizeLimit(3 * 1024 * 1024)]
    public async Task<IActionResult> UploadStudentPhoto(Guid studentId, IFormFile? photo)
    {
        var student = await _context.Users.FirstOrDefaultAsync(x => x.Id == studentId && x.Role == "Student");
        if (student == null)
            return NotFound(new { message = "Student account was not found." });

        if (photo == null)
            return BadRequest(new { message = "Photo file is required." });

        var hadPhoto = !string.IsNullOrWhiteSpace(student.OfficialPhotoFileName);
        try
        {
            var storedPhoto = await _photoStorage.SaveOfficialPhotoAsync(student.Id, photo, HttpContext.RequestAborted);
            var previousFileName = student.OfficialPhotoFileName;

            student.OfficialPhotoFileName = storedPhoto.FileName;
            student.OfficialPhotoContentType = storedPhoto.ContentType;
            student.OfficialPhotoSizeBytes = storedPhoto.SizeBytes;
            student.OfficialPhotoUploadedAt = DateTime.UtcNow;
            student.OfficialPhotoUpdatedByUserId = GetCurrentUserId();

            await _context.SaveChangesAsync();
            _photoStorage.DeleteOfficialPhoto(previousFileName);

            await _auditLogService.LogAsync(
                hadPhoto ? "StudentPhoto.Replaced" : "StudentPhoto.Uploaded",
                "User",
                student.Id,
                new
                {
                    student.Email,
                    student.StudentNumber,
                    ContentType = storedPhoto.ContentType,
                    SizeBytes = storedPhoto.SizeBytes
                },
                "StudentIdentity",
                HttpContext.RequestAborted);

            return Ok(new StudentPhotoUploadResponseDto
            {
                StudentId = student.Id,
                PhotoUrl = BuildPhotoUrl(student.Id),
                ReplacedExistingPhoto = hadPhoto,
                UploadedAt = student.OfficialPhotoUploadedAt.Value
            });
        }
        catch
        {
            await _auditLogService.LogAsync(
                "StudentPhoto.Rejected",
                "User",
                student.Id,
                new
                {
                    student.Email,
                    FileName = Path.GetFileName(photo.FileName),
                    photo.ContentType,
                    photo.Length
                },
                "StudentIdentity",
                HttpContext.RequestAborted);
            throw;
        }
    }

    private async Task<IActionResult?> AuthorizeStudentIdentityAccessAsync(Guid studentId, Guid? examId)
    {
        var currentUserId = GetCurrentUserId();
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        if (currentUserId == null)
            return Unauthorized();

        if (role == "Admin")
            return null;

        if (role == "Student")
        {
            if (currentUserId.Value == studentId)
                return null;

            await LogUnauthorizedIdentityAccessAsync(studentId, examId);
            return Forbid();
        }

        if ((role == "Professor" || role == "Assistant") && examId.HasValue)
        {
            var exam = await _context.Exams.AsNoTracking().FirstOrDefaultAsync(x => x.Id == examId.Value);
            if (exam?.CourseOfferingId == null)
                return NotFound();

            var canManageOffering = await _context.CourseOfferingStaffAssignments.AnyAsync(x =>
                x.CourseOfferingId == exam.CourseOfferingId.Value &&
                x.UserId == currentUserId.Value &&
                x.IsActive &&
                x.RevokedAt == null);

            var studentEnrolled = await _context.StudentCourseEnrollments.AnyAsync(x =>
                x.StudentId == studentId &&
                x.CourseOfferingId == exam.CourseOfferingId.Value &&
                x.EligibleForExam &&
                x.Status == "Eligible");

            if (canManageOffering && studentEnrolled)
                return null;
        }

        await LogUnauthorizedIdentityAccessAsync(studentId, examId);
        return Forbid();
    }

    private async Task LogUnauthorizedIdentityAccessAsync(Guid studentId, Guid? examId)
    {
        await _auditLogService.LogAsync(
            "StudentIdentity.UnauthorizedAccess",
            "User",
            studentId,
            new { ExamId = examId },
            "StudentIdentity",
            HttpContext.RequestAborted);
    }

    private FileContentResult BuildPlaceholderPhoto()
    {
        const string svg = """
            <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
              <rect width="240" height="240" rx="28" fill="#edf4f1"/>
              <circle cx="120" cy="86" r="42" fill="#17446f"/>
              <path d="M42 202c10-44 39-70 78-70s68 26 78 70" fill="#17446f"/>
              <path d="M64 206c14-30 34-45 56-45s42 15 56 45" fill="#2e7d5b" opacity=".35"/>
            </svg>
            """;
        return File(System.Text.Encoding.UTF8.GetBytes(svg), "image/svg+xml");
    }

    private StudentOfficialIdentityDto ToIdentityDto(User student)
    {
        return new StudentOfficialIdentityDto
        {
            StudentId = student.Id,
            FullName = student.FullName,
            Email = student.Email,
            StudentNumber = BuildStudentNumber(student),
            PhotoUrl = !string.IsNullOrWhiteSpace(student.OfficialPhotoFileName) ? BuildPhotoUrl(student.Id) : string.Empty,
            HasOfficialPhoto = !string.IsNullOrWhiteSpace(student.OfficialPhotoFileName),
            Initials = BuildInitials(student.FullName, student.Email)
        };
    }

    private string BuildPhotoUrl(Guid studentId)
    {
        return Url.Action(nameof(GetStudentPhoto), "StudentIdentities", new { studentId }) ?? string.Empty;
    }

    private Guid? GetCurrentUserId()
    {
        var rawValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(rawValue, out var userId) ? userId : null;
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
}
