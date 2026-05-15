namespace OnlineExam.Api.DTOs;

public class StudentExamIntegritySummaryDto
{
    public Guid ExamId { get; set; }
    public Guid ExamAttemptId { get; set; }
    public string AttemptStatus { get; set; } = string.Empty;
    public int AttemptViolationCount { get; set; }
    public int StudentViolationCount { get; set; }
    public DateTime? LastViolationAt { get; set; }
    public DateTime? AutoActionTriggeredAt { get; set; }
    public ExamIntegrityPolicyDto Policy { get; set; } = new();
    public List<ExamIntegrityEventCountDto> EventCounts { get; set; } = [];
    public List<ExamIntegrityTimelineEventDto> Events { get; set; } = [];
}

public class ExamIntegritySummaryDto
{
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public int FinalWarningThreshold { get; set; }
    public int AutoActionThreshold { get; set; }
    public int TotalViolations { get; set; }
    public int StudentsWithViolations { get; set; }
    public List<ExamIntegrityAttemptSummaryDto> Attempts { get; set; } = [];
}

public class ExamIntegrityAttemptSummaryDto
{
    public Guid AttemptId { get; set; }
    public Guid ExamId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public string AttemptStatus { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int AttemptViolationCount { get; set; }
    public int StudentViolationCount { get; set; }
    public DateTime? LastViolationAt { get; set; }
    public DateTime? AutoActionTriggeredAt { get; set; }
    public string CurrentPolicyAction { get; set; } = "None";
    public List<ExamIntegrityEventCountDto> EventCounts { get; set; } = [];
    public List<ExamIntegrityTimelineEventDto> Events { get; set; } = [];
}

public class ExamIntegrityEventCountDto
{
    public string EventType { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class ExamIntegrityTimelineEventDto
{
    public Guid EventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public DateTime RecordedAt { get; set; }
    public int SequenceNumber { get; set; }
    public int AttemptViolationCount { get; set; }
    public int StudentViolationCount { get; set; }
    public string PolicyAction { get; set; } = "None";
    public string? MetadataJson { get; set; }
    public string? ClientSessionId { get; set; }
}
