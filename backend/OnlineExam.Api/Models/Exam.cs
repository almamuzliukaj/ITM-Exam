namespace OnlineExam.Api.Models;

public class Exam
{
    public Guid Id { get; set; }
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public int DurationMinutes { get; set; }
    public int MaximumPoints { get; set; } = 100;
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsPublished { get; set; }
    public string Status { get; set; } = "Draft";
    public bool RequiresLockdown { get; set; }
    public string AllowedClient { get; set; } = "StandardBrowser";
    public string LockdownMode { get; set; } = "Advisory";

    public Guid? CourseOfferingId { get; set; }
    public CourseOffering? CourseOffering { get; set; }

    public List<Question> Questions { get; set; } = new();
    public List<ExamAttempt> Attempts { get; set; } = new();
}
