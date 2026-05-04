namespace OnlineExam.Api.DTOs;

public class CourseOfferingResponseDto
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Guid TermId { get; set; }
    public int YearOfStudy { get; set; }
    public int SemesterNo { get; set; }
    public string SectionCode { get; set; } = string.Empty;
    public string DeliveryType { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid PrimaryProfessorId { get; set; }
    public Guid? AssistantId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public CourseOfferingCourseDto? Course { get; set; }
    public CourseOfferingTermDto? Term { get; set; }
    public List<CourseOfferingStaffAssignmentResponseDto> StaffAssignments { get; set; } = [];
}

public class CourseOfferingCourseDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Credits { get; set; }
    public int YearOfStudy { get; set; }
    public int DefaultSemesterNo { get; set; }
    public bool IsElective { get; set; }
    public bool IsActive { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class CourseOfferingTermDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Season { get; set; } = string.Empty;
    public string AcademicYearLabel { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public DateTime EnrollmentOpenAt { get; set; }
    public DateTime EnrollmentCloseAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsCurrent { get; set; }
}

public class CourseOfferingStaffAssignmentResponseDto
{
    public Guid Id { get; set; }
    public Guid CourseOfferingId { get; set; }
    public Guid UserId { get; set; }
    public string RoleInOffering { get; set; } = string.Empty;
    public string AssignmentType { get; set; } = string.Empty;
    public string PermissionsProfile { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
    public Guid AssignedBy { get; set; }
    public DateTime? RevokedAt { get; set; }
    public Guid? RevokedBy { get; set; }
    public bool IsActive { get; set; }
}
