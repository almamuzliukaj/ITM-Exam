using System.Text.Json;

namespace OnlineExam.Api.DTOs;

public class RecordExamIntegrityEventDto
{
    public Guid? ExamAttemptId { get; set; }
    public string EventType { get; set; } = null!;
    public DateTime? OccurredAt { get; set; }
    public string? ClientSessionId { get; set; }
    public JsonElement? Metadata { get; set; }
}

public class ExamIntegrityEventResultDto
{
    public Guid EventId { get; set; }
    public Guid ExamAttemptId { get; set; }
    public string EventType { get; set; } = null!;
    public DateTime OccurredAt { get; set; }
    public int AttemptViolationCount { get; set; }
}
