namespace OnlineExam.Api.DTOs;

public class SmuIntegrationOptions
{
    public string BaseUrl { get; set; } = string.Empty;
    public string StudentsEndpoint { get; set; } = "/api/students";
    public string TermsEndpoint { get; set; } = "/api/terms";
    public string CoursesEndpoint { get; set; } = "/api/courses";
    public string OfferingsEndpoint { get; set; } = "/api/offerings";
    public string EnrollmentsEndpoint { get; set; } = "/api/enrollments";
    public int TimeoutSeconds { get; set; } = 15;
}

public class SmuStudentDto
{
    public Guid StudentId { get; set; }
    public string StudentNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class SmuTermDto
{
    public Guid TermId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Season { get; set; } = string.Empty;
    public string AcademicYearLabel { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public DateTime EnrollmentOpenAt { get; set; }
    public DateTime EnrollmentCloseAt { get; set; }
    public string Status { get; set; } = "Open";
    public bool IsCurrent { get; set; }
}

public class SmuCourseDto
{
    public Guid CourseId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Credits { get; set; }
    public int YearOfStudy { get; set; }
    public int SemesterNo { get; set; }
    public bool IsElective { get; set; }
    public bool IsActive { get; set; } = true;
    public string Description { get; set; } = string.Empty;
}

public class SmuCourseOfferingDto
{
    public Guid OfferingId { get; set; }
    public Guid CourseId { get; set; }
    public Guid TermId { get; set; }
    public int YearOfStudy { get; set; }
    public int SemesterNo { get; set; }
    public string SectionCode { get; set; } = "A";
    public string DeliveryType { get; set; } = "Regular";
    public int Capacity { get; set; }
    public string Status { get; set; } = "Published";
}

public class SmuEnrollmentDto
{
    public Guid EnrollmentId { get; set; }
    public Guid StudentId { get; set; }
    public Guid TermId { get; set; }
    public Guid CourseOfferingId { get; set; }
    public int YearOfStudy { get; set; }
    public int SemesterNo { get; set; }
    public string SemesterStatus { get; set; } = "Approved";
    public string CourseStatus { get; set; } = "Eligible";
    public bool EligibleForExam { get; set; } = true;
    public DateTime EnrolledAt { get; set; }
}

public class SmuSnapshotDto
{
    public List<SmuStudentDto> Students { get; set; } = [];
    public List<SmuTermDto> Terms { get; set; } = [];
    public List<SmuCourseDto> Courses { get; set; } = [];
    public List<SmuCourseOfferingDto> Offerings { get; set; } = [];
    public List<SmuEnrollmentDto> Enrollments { get; set; } = [];
}

public class SmuContractSummaryDto
{
    public string IntegrationName { get; set; } = "SMU";
    public string BaseUrl { get; set; } = string.Empty;
    public bool IsConfigured { get; set; }
    public List<SmuEndpointContractDto> Endpoints { get; set; } = [];
    public List<SmuSourceOwnershipDto> SourceOfTruth { get; set; } = [];
    public List<SmuSourceOwnershipDto> RemainsInOnlineExam { get; set; } = [];
}

public class SmuEndpointContractDto
{
    public string Entity { get; set; } = string.Empty;
    public string RelativePath { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
}

public class SmuSourceOwnershipDto
{
    public string Entity { get; set; } = string.Empty;
    public string SourceSystem { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}

public class SmuMappedPreviewDto
{
    public SmuContractSummaryDto Contract { get; set; } = new();
    public List<SmuMappedStudentDto> Students { get; set; } = [];
    public List<SmuMappedTermDto> Terms { get; set; } = [];
    public List<SmuMappedCourseDto> Courses { get; set; } = [];
    public List<SmuMappedOfferingDto> Offerings { get; set; } = [];
    public List<SmuMappedEnrollmentDto> Enrollments { get; set; } = [];
    public List<string> Warnings { get; set; } = [];
}

public class SmuMappedStudentDto
{
    public Guid StudentId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "Student";
    public bool IsActive { get; set; }
    public string SourceTag { get; set; } = "SMU";
}

public class SmuMappedTermDto
{
    public Guid TermId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsCurrent { get; set; }
}

public class SmuMappedCourseDto
{
    public Guid CourseId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Credits { get; set; }
    public int YearOfStudy { get; set; }
    public int DefaultSemesterNo { get; set; }
    public bool IsElective { get; set; }
    public bool IsActive { get; set; }
}

public class SmuMappedOfferingDto
{
    public Guid OfferingId { get; set; }
    public Guid CourseId { get; set; }
    public Guid TermId { get; set; }
    public string SectionCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Capacity { get; set; }
}

public class SmuMappedEnrollmentDto
{
    public Guid EnrollmentId { get; set; }
    public Guid StudentId { get; set; }
    public Guid TermId { get; set; }
    public Guid CourseOfferingId { get; set; }
    public string SemesterStatus { get; set; } = string.Empty;
    public string CourseStatus { get; set; } = string.Empty;
    public bool EligibleForExam { get; set; }
    public string EnrollmentSource { get; set; } = "SMU";
}
