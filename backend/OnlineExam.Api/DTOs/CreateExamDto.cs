namespace OnlineExam.Api.DTOs;

public class CreateExamDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DurationMinutes { get; set; } = 60;
    public int MaximumPoints { get; set; } = 100;
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
    public bool IsPublished { get; set; }
    public Guid? CourseOfferingId { get; set; }
    public bool RequiresLockdown { get; set; }
    public string? AllowedClient { get; set; }
    public string? LockdownMode { get; set; }
}
