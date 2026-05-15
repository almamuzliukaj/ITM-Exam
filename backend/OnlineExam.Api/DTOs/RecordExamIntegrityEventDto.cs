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
    public int StudentViolationCount { get; set; }
    public ExamIntegrityPolicyDto Policy { get; set; } = new();
}

public class ExamIntegrityPolicyDto
{
    public int FinalWarningThreshold { get; set; }
    public int AutoActionThreshold { get; set; }
    public string RecommendedAction { get; set; } = "None";
    public bool ShouldShowFinalWarning { get; set; }
    public bool ShouldBlockInteraction { get; set; }
    public bool ShouldAutoSubmit { get; set; }
    public int AttemptViolationCount { get; set; }
    public int StudentViolationCount { get; set; }
    public DateTime? LastViolationAt { get; set; }
    public DateTime? AutoActionTriggeredAt { get; set; }
}
