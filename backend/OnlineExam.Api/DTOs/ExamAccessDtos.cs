namespace OnlineExam.Api.DTOs;

public class VerifyExamAccessCodeDto
{
    public string Code { get; set; } = string.Empty;
}

public class AllowExamStudentAccessDto
{
    public string? Reason { get; set; }
}

public class RequestExamAccessApprovalDto
{
    public string? Reason { get; set; }
}

public class DeviceChangeRequestDto
{
    public string? Reason { get; set; }
}

public class ExamAccessCodeResponseDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; }
}

public class ExamAccessStatusDto
{
    public bool RequiresCode { get; set; }
    public bool HasAccess { get; set; }
    public string AccessStatus { get; set; } = "NotVerified";
    public DateTime? VerifiedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? RequestedAt { get; set; }
    public string ApprovalReason { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public StudentIdentityDto? StudentIdentity { get; set; }
}

public class StudentIdentityDto
{
    public Guid StudentId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string StudentNumber { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
}

public class ExamLiveMonitorDto
{
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public DateTime? ActiveCodeExpiresAt { get; set; }
    public ExamLiveMonitorSummaryDto Summary { get; set; } = new();
    public List<ExamLiveMonitorStudentDto> Students { get; set; } = [];
}

public class ExamLiveMonitorSummaryDto
{
    public int TotalEnrolled { get; set; }
    public int WaitingForPhysicalVerification { get; set; }
    public int Verified { get; set; }
    public int Active { get; set; }
    public int Submitted { get; set; }
    public int NotJoined { get; set; }
    public int WithViolations { get; set; }
}

public class ExamLiveMonitorStudentDto
{
    public Guid StudentId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string StudentNumber { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string EnrollmentStatus { get; set; } = string.Empty;
    public string AccessStatus { get; set; } = "NotVerified";
    public string AttemptStatus { get; set; } = "NotStarted";
    public DateTime? VerifiedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public string AdmissionReason { get; set; } = string.Empty;
    public bool HasDeviceChangeRequest { get; set; }
    public DateTime? DeviceChangeRequestedAt { get; set; }
    public int DurationUsedMinutes { get; set; }
    public int ViolationCount { get; set; }
    public DateTime? LatestViolationAt { get; set; }
    public string LatestViolationType { get; set; } = string.Empty;
    public string IntegritySeverity { get; set; } = "None";
}
