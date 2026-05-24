using OnlineExam.Api.DTOs;

namespace OnlineExam.Api.Services;

public class SmuMappingService : ISmuMappingService
{
    private readonly SmuIntegrationOptions _options;

    public SmuMappingService(Microsoft.Extensions.Options.IOptions<SmuIntegrationOptions> options)
    {
        _options = options.Value;
    }

    public SmuContractSummaryDto BuildContractSummary()
    {
        return new SmuContractSummaryDto
        {
            BaseUrl = _options.BaseUrl,
            IsConfigured = !string.IsNullOrWhiteSpace(_options.BaseUrl),
            Endpoints =
            [
                new SmuEndpointContractDto { Entity = "Students", RelativePath = _options.StudentsEndpoint, Purpose = "Student identities and active status come from SMU." },
                new SmuEndpointContractDto { Entity = "Staff", RelativePath = _options.StaffEndpoint, Purpose = "Professor and assistant identities come from SMU staff feeds." },
                new SmuEndpointContractDto { Entity = "Terms", RelativePath = _options.TermsEndpoint, Purpose = "Terms and semester windows are sourced from SMU." },
                new SmuEndpointContractDto { Entity = "Courses", RelativePath = _options.CoursesEndpoint, Purpose = "Course catalogue data is sourced from SMU." },
                new SmuEndpointContractDto { Entity = "Offerings", RelativePath = _options.OfferingsEndpoint, Purpose = "Course offering structure comes from SMU." },
                new SmuEndpointContractDto { Entity = "Enrollments", RelativePath = _options.EnrollmentsEndpoint, Purpose = "Student enrollment eligibility is sourced from SMU." }
            ],
            SourceOfTruth =
            [
                new SmuSourceOwnershipDto { Entity = "Students", SourceSystem = "SMU", Notes = "Online Exam consumes student identity, email, and active flag as read-only sync data." },
                new SmuSourceOwnershipDto { Entity = "Staff", SourceSystem = "SMU", Notes = "Professor and assistant identities should be synchronized from SMU instead of manually maintained." },
                new SmuSourceOwnershipDto { Entity = "Terms", SourceSystem = "SMU", Notes = "Academic term labels, dates, and current-term state come from SMU." },
                new SmuSourceOwnershipDto { Entity = "Courses", SourceSystem = "SMU", Notes = "Course code, name, credits, and semester positioning come from SMU." },
                new SmuSourceOwnershipDto { Entity = "Course Offerings", SourceSystem = "SMU", Notes = "Offering capacity, section, term, and lifecycle are synchronized from SMU." },
                new SmuSourceOwnershipDto { Entity = "Semester and Course Enrollments", SourceSystem = "SMU", Notes = "Eligibility to sit an exam is derived from SMU enrollment data." }
            ],
            RemainsInOnlineExam =
            [
                new SmuSourceOwnershipDto { Entity = "Exam Definitions", SourceSystem = "Online Exam", Notes = "Exam authoring, question banks, timing, and publication remain local." },
                new SmuSourceOwnershipDto { Entity = "Exam Attempts and Grades", SourceSystem = "Online Exam", Notes = "Attempts, grading workflow, and published results stay in Online Exam." },
                new SmuSourceOwnershipDto { Entity = "Integrity and Lockdown Events", SourceSystem = "Online Exam", Notes = "Proctoring signals and policy actions remain local to exam delivery." },
                new SmuSourceOwnershipDto { Entity = "Professor/Assistant Assignment Overrides", SourceSystem = "Online Exam", Notes = "Teaching-team assignment logic can stay local unless SMU exposes staff assignment feeds." }
            ]
        };
    }

    public SmuMappedPreviewDto BuildMappedPreview(SmuSnapshotDto snapshot)
    {
        var warnings = new List<string>();

        var terms = snapshot.Terms
            .Select(term => new SmuMappedTermDto
            {
                TermId = term.TermId,
                Code = NormalizeCode(term.Code),
                Name = term.Name.Trim(),
                Status = NormalizeTermStatus(term.Status),
                IsCurrent = term.IsCurrent
            })
            .ToList();

        var courses = snapshot.Courses
            .Select(course => new SmuMappedCourseDto
            {
                CourseId = course.CourseId,
                Code = NormalizeCode(course.Code),
                Name = course.Name.Trim(),
                Credits = Math.Max(course.Credits, 0),
                YearOfStudy = Math.Max(course.YearOfStudy, 1),
                DefaultSemesterNo = Math.Max(course.SemesterNo, 1),
                IsElective = course.IsElective,
                IsActive = course.IsActive
            })
            .ToList();

        var students = snapshot.Students
            .Select(student => new SmuMappedStudentDto
            {
                StudentId = student.StudentId,
                FullName = student.FullName.Trim(),
                Email = student.Email.Trim().ToLowerInvariant(),
                Role = "Student",
                IsActive = student.IsActive
            })
            .ToList();

        var staff = snapshot.Staff
            .Select(member => new SmuMappedStaffDto
            {
                StaffId = member.StaffId,
                FullName = member.FullName.Trim(),
                Email = member.Email.Trim().ToLowerInvariant(),
                Role = NormalizeStaffRole(member.Role),
                IsActive = member.IsActive
            })
            .ToList();

        var offerings = snapshot.Offerings
            .Select(offering => new SmuMappedOfferingDto
            {
                OfferingId = offering.OfferingId,
                CourseId = offering.CourseId,
                TermId = offering.TermId,
                SectionCode = string.IsNullOrWhiteSpace(offering.SectionCode) ? "A" : offering.SectionCode.Trim().ToUpperInvariant(),
                Status = NormalizeOfferingStatus(offering.Status),
                Capacity = Math.Max(0, offering.Capacity),
                PrimaryProfessorId = offering.PrimaryProfessorId,
                AssistantId = offering.AssistantId
            })
            .ToList();

        var enrollments = snapshot.Enrollments
            .Select(enrollment => new SmuMappedEnrollmentDto
            {
                EnrollmentId = enrollment.EnrollmentId,
                StudentId = enrollment.StudentId,
                TermId = enrollment.TermId,
                CourseOfferingId = enrollment.CourseOfferingId,
                SemesterStatus = NormalizeEnrollmentStatus(enrollment.SemesterStatus, fallback: "Approved"),
                CourseStatus = NormalizeEnrollmentStatus(enrollment.CourseStatus, fallback: "Eligible"),
                EligibleForExam = enrollment.EligibleForExam,
                EnrollmentSource = "SMU"
            })
            .ToList();

        warnings.AddRange(FindReferentialWarnings(snapshot));

        return new SmuMappedPreviewDto
        {
            Contract = BuildContractSummary(),
            Students = students,
            Staff = staff,
            Terms = terms,
            Courses = courses,
            Offerings = offerings,
            Enrollments = enrollments,
            Warnings = warnings
        };
    }

    public SmuSyncResultDto InitializeSyncResult()
    {
        return new SmuSyncResultDto
        {
            SyncedAt = DateTime.UtcNow
        };
    }

    private static IEnumerable<string> FindReferentialWarnings(SmuSnapshotDto snapshot)
    {
        var courseIds = snapshot.Courses.Select(x => x.CourseId).ToHashSet();
        var termIds = snapshot.Terms.Select(x => x.TermId).ToHashSet();
        var offeringIds = snapshot.Offerings.Select(x => x.OfferingId).ToHashSet();
        var studentIds = snapshot.Students.Select(x => x.StudentId).ToHashSet();
        var staffIds = snapshot.Staff.Select(x => x.StaffId).ToHashSet();

        foreach (var offering in snapshot.Offerings.Where(x => !courseIds.Contains(x.CourseId)))
            yield return $"Offering {offering.OfferingId} references missing course {offering.CourseId}.";

        foreach (var offering in snapshot.Offerings.Where(x => !termIds.Contains(x.TermId)))
            yield return $"Offering {offering.OfferingId} references missing term {offering.TermId}.";

        foreach (var offering in snapshot.Offerings.Where(x => x.PrimaryProfessorId.HasValue && !staffIds.Contains(x.PrimaryProfessorId.Value)))
            yield return $"Offering {offering.OfferingId} references missing professor {offering.PrimaryProfessorId}.";

        foreach (var offering in snapshot.Offerings.Where(x => x.AssistantId.HasValue && !staffIds.Contains(x.AssistantId.Value)))
            yield return $"Offering {offering.OfferingId} references missing assistant {offering.AssistantId}.";

        foreach (var enrollment in snapshot.Enrollments.Where(x => !studentIds.Contains(x.StudentId)))
            yield return $"Enrollment {enrollment.EnrollmentId} references missing student {enrollment.StudentId}.";

        foreach (var enrollment in snapshot.Enrollments.Where(x => !termIds.Contains(x.TermId)))
            yield return $"Enrollment {enrollment.EnrollmentId} references missing term {enrollment.TermId}.";

        foreach (var enrollment in snapshot.Enrollments.Where(x => !offeringIds.Contains(x.CourseOfferingId)))
            yield return $"Enrollment {enrollment.EnrollmentId} references missing offering {enrollment.CourseOfferingId}.";
    }

    private static string NormalizeCode(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    private static string NormalizeTermStatus(string value)
    {
        return value.Trim() switch
        {
            "Draft" => "Draft",
            "Closed" => "Closed",
            "Archived" => "Archived",
            "Active" => "Active",
            _ => "Open"
        };
    }

    private static string NormalizeOfferingStatus(string value)
    {
        return value.Trim() switch
        {
            "Draft" => "Draft",
            "Closed" => "Closed",
            _ => "Published"
        };
    }

    private static string NormalizeEnrollmentStatus(string value, string fallback)
    {
        var normalized = value.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? fallback : normalized;
    }

    private static string NormalizeStaffRole(string value)
    {
        return value.Trim() switch
        {
            "Assistant" => "Assistant",
            "Admin" => "Admin",
            _ => "Professor"
        };
    }
}
