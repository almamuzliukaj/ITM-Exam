namespace OnlineExam.Api.Models;

public class ExamSessionBinding
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public Guid StudentId { get; set; }
    public Guid AttemptId { get; set; }
    public Guid? ExamStudentAccessId { get; set; }
    public string SessionReferenceHash { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public DateTime BoundAt { get; set; }
    public DateTime LastHeartbeatAt { get; set; }
    public DateTime? DisconnectedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public Guid? RevokedByUserId { get; set; }
    public string RevocationReason { get; set; } = string.Empty;
    public DateTime? ReplacedAt { get; set; }
    public Guid? ReplacedByBindingId { get; set; }
    public string UserAgent { get; set; } = string.Empty;

    public Exam Exam { get; set; } = null!;
    public ExamAttempt Attempt { get; set; } = null!;
    public ExamStudentAccess? ExamStudentAccess { get; set; }
}
