namespace OnlineExam.Api.Models;

public class ExamAccessCode
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public string CodeHash { get; set; } = null!;
    public Guid GeneratedByUserId { get; set; }
    public DateTime GeneratedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public DateTime? RevokedAt { get; set; }
    public Guid? RevokedByUserId { get; set; }

    public Exam Exam { get; set; } = null!;
}
