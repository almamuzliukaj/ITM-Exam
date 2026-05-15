namespace OnlineExam.Api.Models;

public class ExamIntegrityEvent
{
    public Guid Id { get; set; }
    public Guid ExamAttemptId { get; set; }
    public Guid ExamId { get; set; }
    public Guid StudentId { get; set; }
    public string EventType { get; set; } = null!;
    public DateTime OccurredAt { get; set; }
    public string? MetadataJson { get; set; }
    public string? ClientSessionId { get; set; }
    public string? UserAgent { get; set; }
    public int SequenceNumber { get; set; }
    public int AttemptViolationCount { get; set; }
    public int StudentViolationCount { get; set; }
    public string PolicyAction { get; set; } = "None";
    public DateTime RecordedAt { get; set; }

    public ExamAttempt ExamAttempt { get; set; } = null!;
}
