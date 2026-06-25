namespace OnlineExam.Api.Models;

public class ExamStudentAccess
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public Guid StudentId { get; set; }
    public string AccessStatus { get; set; } = "NotVerified";
    public DateTime? VerifiedAt { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string ApprovalReason { get; set; } = string.Empty;
    public DateTime? LastActivityAt { get; set; }

    public Exam Exam { get; set; } = null!;
}
