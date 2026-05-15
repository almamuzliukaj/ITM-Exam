using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Models;

namespace OnlineExam.Api.Services;

public class SmuSyncService : ISmuSyncService
{
    private static readonly Guid SystemSyncActorId = Guid.Parse("f9635e15-1d90-4e3b-b722-331a8fc2fbe9");

    private readonly AppDbContext _context;
    private readonly ISmuApiClient _smuApiClient;
    private readonly ISmuMappingService _smuMappingService;
    private readonly IAuditLogService _auditLogService;

    public SmuSyncService(
        AppDbContext context,
        ISmuApiClient smuApiClient,
        ISmuMappingService smuMappingService,
        IAuditLogService auditLogService)
    {
        _context = context;
        _smuApiClient = smuApiClient;
        _smuMappingService = smuMappingService;
        _auditLogService = auditLogService;
    }

    public async Task<SmuSyncResultDto> SyncAsync(CancellationToken cancellationToken = default)
    {
        var snapshot = await _smuApiClient.GetSnapshotAsync(cancellationToken);
        return await SyncAsync(snapshot, cancellationToken);
    }

    public async Task<SmuSyncResultDto> SyncAsync(SmuSnapshotDto snapshot, CancellationToken cancellationToken = default)
    {
        var result = _smuMappingService.InitializeSyncResult();
        var preview = _smuMappingService.BuildMappedPreview(snapshot);
        result.Warnings.AddRange(preview.Warnings);

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        await SyncStudentsAsync(snapshot.Students, result, cancellationToken);
        await SyncStaffAsync(snapshot.Staff, result, cancellationToken);
        await SyncTermsAsync(snapshot.Terms, result, cancellationToken);
        await SyncCoursesAsync(snapshot.Courses, result, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await SyncOfferingsAsync(snapshot.Offerings, result, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await SyncEnrollmentsAsync(snapshot.Enrollments, result, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await _auditLogService.LogAsync("SMU.SyncCompleted", "SMU", null, new
        {
            result.SyncedAt,
            result.StudentsCreated,
            result.StudentsUpdated,
            result.StaffCreated,
            result.StaffUpdated,
            result.TermsCreated,
            result.TermsUpdated,
            result.CoursesCreated,
            result.CoursesUpdated,
            result.OfferingsCreated,
            result.OfferingsUpdated,
            result.SemesterEnrollmentsCreated,
            result.SemesterEnrollmentsUpdated,
            result.CourseEnrollmentsCreated,
            result.CourseEnrollmentsUpdated,
            result.Warnings
        }, "SMUIntegration", cancellationToken);

        return result;
    }

    private async Task SyncStudentsAsync(List<SmuStudentDto> students, SmuSyncResultDto result, CancellationToken cancellationToken)
    {
        foreach (var student in students)
        {
            var existing = await _context.Users.FirstOrDefaultAsync(x => x.Id == student.StudentId, cancellationToken);
            if (existing == null)
            {
                _context.Users.Add(new User
                {
                    Id = student.StudentId,
                    FullName = student.FullName.Trim(),
                    Email = student.Email.Trim().ToLowerInvariant(),
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                    Role = "Student",
                    IsActive = student.IsActive,
                    CreatedAt = DateTime.UtcNow
                });
                result.StudentsCreated++;
                continue;
            }

            existing.FullName = student.FullName.Trim();
            existing.Email = student.Email.Trim().ToLowerInvariant();
            existing.Role = "Student";
            existing.IsActive = student.IsActive;
            result.StudentsUpdated++;
        }
    }

    private async Task SyncStaffAsync(List<SmuStaffDto> staff, SmuSyncResultDto result, CancellationToken cancellationToken)
    {
        foreach (var member in staff)
        {
            var normalizedRole = NormalizeStaffRole(member.Role);
            var existing = await _context.Users.FirstOrDefaultAsync(x => x.Id == member.StaffId, cancellationToken);
            if (existing == null)
            {
                _context.Users.Add(new User
                {
                    Id = member.StaffId,
                    FullName = member.FullName.Trim(),
                    Email = member.Email.Trim().ToLowerInvariant(),
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                    Role = normalizedRole,
                    IsActive = member.IsActive,
                    CreatedAt = DateTime.UtcNow
                });
                result.StaffCreated++;
                continue;
            }

            existing.FullName = member.FullName.Trim();
            existing.Email = member.Email.Trim().ToLowerInvariant();
            existing.Role = normalizedRole;
            existing.IsActive = member.IsActive;
            result.StaffUpdated++;
        }
    }

    private async Task SyncTermsAsync(List<SmuTermDto> terms, SmuSyncResultDto result, CancellationToken cancellationToken)
    {
        foreach (var term in terms)
        {
            var existing = await _context.Terms.FirstOrDefaultAsync(x => x.Id == term.TermId, cancellationToken);
            if (existing == null)
            {
                _context.Terms.Add(new Term
                {
                    Id = term.TermId,
                    Code = term.Code.Trim().ToUpperInvariant(),
                    Name = term.Name.Trim(),
                    Season = term.Season.Trim(),
                    AcademicYearLabel = term.AcademicYearLabel.Trim(),
                    StartDate = term.StartDate,
                    EndDate = term.EndDate,
                    EnrollmentOpenAt = term.EnrollmentOpenAt,
                    EnrollmentCloseAt = term.EnrollmentCloseAt,
                    Status = NormalizeTermStatus(term.Status),
                    IsCurrent = term.IsCurrent
                });
                result.TermsCreated++;
                continue;
            }

            existing.Code = term.Code.Trim().ToUpperInvariant();
            existing.Name = term.Name.Trim();
            existing.Season = term.Season.Trim();
            existing.AcademicYearLabel = term.AcademicYearLabel.Trim();
            existing.StartDate = term.StartDate;
            existing.EndDate = term.EndDate;
            existing.EnrollmentOpenAt = term.EnrollmentOpenAt;
            existing.EnrollmentCloseAt = term.EnrollmentCloseAt;
            existing.Status = NormalizeTermStatus(term.Status);
            existing.IsCurrent = term.IsCurrent;
            result.TermsUpdated++;
        }
    }

    private async Task SyncCoursesAsync(List<SmuCourseDto> courses, SmuSyncResultDto result, CancellationToken cancellationToken)
    {
        foreach (var course in courses)
        {
            var existing = await _context.Courses.FirstOrDefaultAsync(x => x.Id == course.CourseId, cancellationToken);
            if (existing == null)
            {
                _context.Courses.Add(new Course
                {
                    Id = course.CourseId,
                    Code = course.Code.Trim().ToUpperInvariant(),
                    Name = course.Name.Trim(),
                    Credits = course.Credits,
                    YearOfStudy = Math.Max(course.YearOfStudy, 1),
                    DefaultSemesterNo = Math.Max(course.SemesterNo, 1),
                    IsElective = course.IsElective,
                    IsActive = course.IsActive,
                    Description = course.Description.Trim()
                });
                result.CoursesCreated++;
                continue;
            }

            existing.Code = course.Code.Trim().ToUpperInvariant();
            existing.Name = course.Name.Trim();
            existing.Credits = course.Credits;
            existing.YearOfStudy = Math.Max(course.YearOfStudy, 1);
            existing.DefaultSemesterNo = Math.Max(course.SemesterNo, 1);
            existing.IsElective = course.IsElective;
            existing.IsActive = course.IsActive;
            existing.Description = course.Description.Trim();
            result.CoursesUpdated++;
        }
    }

    private async Task SyncOfferingsAsync(List<SmuCourseOfferingDto> offerings, SmuSyncResultDto result, CancellationToken cancellationToken)
    {
        foreach (var offering in offerings)
        {
            if (!await _context.Courses.AnyAsync(x => x.Id == offering.CourseId, cancellationToken))
            {
                result.Warnings.Add($"Skipping offering {offering.OfferingId} because course {offering.CourseId} is missing.");
                continue;
            }

            if (!await _context.Terms.AnyAsync(x => x.Id == offering.TermId, cancellationToken))
            {
                result.Warnings.Add($"Skipping offering {offering.OfferingId} because term {offering.TermId} is missing.");
                continue;
            }

            var primaryProfessorId = offering.PrimaryProfessorId ?? SystemSyncActorId;
            if (!await _context.Users.AnyAsync(x => x.Id == primaryProfessorId, cancellationToken))
            {
                result.Warnings.Add($"Offering {offering.OfferingId} references missing primary professor {primaryProfessorId}. Falling back to system admin.");
                primaryProfessorId = SystemSyncActorId;
            }

            if (offering.AssistantId.HasValue && !await _context.Users.AnyAsync(x => x.Id == offering.AssistantId.Value, cancellationToken))
            {
                result.Warnings.Add($"Offering {offering.OfferingId} references missing assistant {offering.AssistantId.Value}. Assistant assignment skipped.");
                offering.AssistantId = null;
            }

            var existing = await _context.CourseOfferings
                .Include(x => x.StaffAssignments)
                .FirstOrDefaultAsync(x => x.Id == offering.OfferingId, cancellationToken);

            if (existing == null)
            {
                existing = new CourseOffering
                {
                    Id = offering.OfferingId,
                    CourseId = offering.CourseId,
                    TermId = offering.TermId,
                    YearOfStudy = Math.Max(offering.YearOfStudy, 1),
                    SemesterNo = Math.Max(offering.SemesterNo, 1),
                    SectionCode = NormalizeSectionCode(offering.SectionCode),
                    DeliveryType = NormalizeDeliveryType(offering.DeliveryType),
                    Capacity = Math.Max(0, offering.Capacity),
                    Status = NormalizeOfferingStatus(offering.Status),
                    PrimaryProfessorId = primaryProfessorId,
                    AssistantId = offering.AssistantId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.CourseOfferings.Add(existing);
                result.OfferingsCreated++;
            }
            else
            {
                existing.CourseId = offering.CourseId;
                existing.TermId = offering.TermId;
                existing.YearOfStudy = Math.Max(offering.YearOfStudy, 1);
                existing.SemesterNo = Math.Max(offering.SemesterNo, 1);
                existing.SectionCode = NormalizeSectionCode(offering.SectionCode);
                existing.DeliveryType = NormalizeDeliveryType(offering.DeliveryType);
                existing.Capacity = Math.Max(0, offering.Capacity);
                existing.Status = NormalizeOfferingStatus(offering.Status);
                existing.PrimaryProfessorId = primaryProfessorId;
                existing.AssistantId = offering.AssistantId;
                existing.UpdatedAt = DateTime.UtcNow;
                result.OfferingsUpdated++;
            }

            await SyncOfferingAssignmentsAsync(existing, primaryProfessorId, offering.AssistantId);
        }
    }

    private async Task SyncEnrollmentsAsync(List<SmuEnrollmentDto> enrollments, SmuSyncResultDto result, CancellationToken cancellationToken)
    {
        foreach (var enrollment in enrollments)
        {
            if (!await _context.Users.AnyAsync(x => x.Id == enrollment.StudentId, cancellationToken))
            {
                result.Warnings.Add($"Skipping enrollment {enrollment.EnrollmentId} because student {enrollment.StudentId} is missing.");
                continue;
            }

            if (!await _context.Terms.AnyAsync(x => x.Id == enrollment.TermId, cancellationToken))
            {
                result.Warnings.Add($"Skipping enrollment {enrollment.EnrollmentId} because term {enrollment.TermId} is missing.");
                continue;
            }

            if (!await _context.CourseOfferings.AnyAsync(x => x.Id == enrollment.CourseOfferingId, cancellationToken))
            {
                result.Warnings.Add($"Skipping enrollment {enrollment.EnrollmentId} because offering {enrollment.CourseOfferingId} is missing.");
                continue;
            }

            var semesterEnrollment = await _context.SemesterEnrollments
                .FirstOrDefaultAsync(x => x.StudentId == enrollment.StudentId && x.TermId == enrollment.TermId, cancellationToken);

            if (semesterEnrollment == null)
            {
                semesterEnrollment = new SemesterEnrollment
                {
                    Id = Guid.NewGuid(),
                    StudentId = enrollment.StudentId,
                    TermId = enrollment.TermId,
                    YearOfStudy = Math.Max(enrollment.YearOfStudy, 1),
                    SemesterNo = Math.Max(enrollment.SemesterNo, 1),
                    Status = NormalizeSemesterStatus(enrollment.SemesterStatus),
                    EnrolledAt = enrollment.EnrolledAt,
                    ApprovedBy = SystemSyncActorId,
                    Notes = "Synced from SMU"
                };
                _context.SemesterEnrollments.Add(semesterEnrollment);
                result.SemesterEnrollmentsCreated++;
            }
            else
            {
                semesterEnrollment.YearOfStudy = Math.Max(enrollment.YearOfStudy, 1);
                semesterEnrollment.SemesterNo = Math.Max(enrollment.SemesterNo, 1);
                semesterEnrollment.Status = NormalizeSemesterStatus(enrollment.SemesterStatus);
                semesterEnrollment.EnrolledAt = enrollment.EnrolledAt;
                semesterEnrollment.ApprovedBy = SystemSyncActorId;
                semesterEnrollment.Notes = "Synced from SMU";
                result.SemesterEnrollmentsUpdated++;
            }

            var courseEnrollment = await _context.StudentCourseEnrollments
                .FirstOrDefaultAsync(x => x.StudentId == enrollment.StudentId && x.CourseOfferingId == enrollment.CourseOfferingId, cancellationToken);

            if (courseEnrollment == null)
            {
                _context.StudentCourseEnrollments.Add(new StudentCourseEnrollment
                {
                    Id = Guid.NewGuid(),
                    StudentId = enrollment.StudentId,
                    CourseOfferingId = enrollment.CourseOfferingId,
                    LinkedSemesterEnrollmentId = semesterEnrollment.Id,
                    EnrollmentSource = "SMU",
                    Status = NormalizeCourseEnrollmentStatus(enrollment.CourseStatus),
                    EligibleForExam = enrollment.EligibleForExam,
                    CreatedAt = enrollment.EnrolledAt,
                    CreatedBy = SystemSyncActorId
                });
                result.CourseEnrollmentsCreated++;
            }
            else
            {
                courseEnrollment.LinkedSemesterEnrollmentId = semesterEnrollment.Id;
                courseEnrollment.EnrollmentSource = "SMU";
                courseEnrollment.Status = NormalizeCourseEnrollmentStatus(enrollment.CourseStatus);
                courseEnrollment.EligibleForExam = enrollment.EligibleForExam;
                result.CourseEnrollmentsUpdated++;
            }
        }
    }

    private async Task SyncOfferingAssignmentsAsync(CourseOffering offering, Guid primaryProfessorId, Guid? assistantId)
    {
        var assignments = offering.StaffAssignments;

        var professorAssignment = assignments.FirstOrDefault(x => x.RoleInOffering == "Professor");
        if (professorAssignment == null)
        {
            assignments.Add(new CourseOfferingStaffAssignment
            {
                Id = Guid.NewGuid(),
                CourseOfferingId = offering.Id,
                UserId = primaryProfessorId,
                RoleInOffering = "Professor",
                AssignmentType = "Primary",
                PermissionsProfile = "FullTeaching",
                AssignedAt = DateTime.UtcNow,
                AssignedBy = SystemSyncActorId,
                IsActive = true
            });
        }
        else
        {
            professorAssignment.UserId = primaryProfessorId;
            professorAssignment.AssignmentType = "Primary";
            professorAssignment.PermissionsProfile = "FullTeaching";
            professorAssignment.AssignedBy = SystemSyncActorId;
            professorAssignment.AssignedAt = DateTime.UtcNow;
            professorAssignment.IsActive = true;
            professorAssignment.RevokedAt = null;
            professorAssignment.RevokedBy = null;
        }

        var assistantAssignment = assignments.FirstOrDefault(x => x.RoleInOffering == "Assistant");
        if (assistantId.HasValue)
        {
            if (assistantAssignment == null)
            {
                assignments.Add(new CourseOfferingStaffAssignment
                {
                    Id = Guid.NewGuid(),
                    CourseOfferingId = offering.Id,
                    UserId = assistantId.Value,
                    RoleInOffering = "Assistant",
                    AssignmentType = "Secondary",
                    PermissionsProfile = "GradingOnly",
                    AssignedAt = DateTime.UtcNow,
                    AssignedBy = SystemSyncActorId,
                    IsActive = true
                });
            }
            else
            {
                assistantAssignment.UserId = assistantId.Value;
                assistantAssignment.AssignmentType = "Secondary";
                assistantAssignment.PermissionsProfile = "GradingOnly";
                assistantAssignment.AssignedBy = SystemSyncActorId;
                assistantAssignment.AssignedAt = DateTime.UtcNow;
                assistantAssignment.IsActive = true;
                assistantAssignment.RevokedAt = null;
                assistantAssignment.RevokedBy = null;
            }
        }
        else if (assistantAssignment != null)
        {
            assistantAssignment.IsActive = false;
            assistantAssignment.RevokedAt = DateTime.UtcNow;
            assistantAssignment.RevokedBy = SystemSyncActorId;
        }

        await Task.CompletedTask;
    }

    private static string NormalizeStaffRole(string role)
    {
        return role.Trim() switch
        {
            "Assistant" => "Assistant",
            "Admin" => "Admin",
            _ => "Professor"
        };
    }

    private static string NormalizeTermStatus(string status)
    {
        return status.Trim() switch
        {
            "Draft" => "Draft",
            "Closed" => "Closed",
            "Archived" => "Archived",
            "Active" => "Active",
            _ => "Open"
        };
    }

    private static string NormalizeOfferingStatus(string status)
    {
        return status.Trim() switch
        {
            "Draft" => "Draft",
            "Closed" => "Closed",
            "Archived" => "Archived",
            _ => "Published"
        };
    }

    private static string NormalizeDeliveryType(string deliveryType)
    {
        return deliveryType.Trim() switch
        {
            "RetakeOnly" => "RetakeOnly",
            "Special" => "Special",
            _ => "Regular"
        };
    }

    private static string NormalizeSemesterStatus(string status)
    {
        return string.IsNullOrWhiteSpace(status) ? "Approved" : status.Trim();
    }

    private static string NormalizeCourseEnrollmentStatus(string status)
    {
        return string.IsNullOrWhiteSpace(status) ? "Eligible" : status.Trim();
    }

    private static string NormalizeSectionCode(string sectionCode)
    {
        return string.IsNullOrWhiteSpace(sectionCode) ? "A" : sectionCode.Trim().ToUpperInvariant();
    }
}
