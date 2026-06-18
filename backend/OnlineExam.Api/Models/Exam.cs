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
    public DateTime? UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? UnpublishedAt { get; set; }
    public bool IsPublished { get; set; }
    public string Status { get; set; } = "Draft";
    public string AssessmentType { get; set; } = "Provim";
    public string ExamPeriod { get; set; } = "Custom";
    public string AcademicYear { get; set; } = string.Empty;
    public string SemesterLabel { get; set; } = string.Empty;
    public string CohortLabel { get; set; } = string.Empty;
    public bool RequiresLockdown { get; set; }
    public string AllowedClient { get; set; } = "StandardBrowser";
    public string LockdownMode { get; set; } = "Advisory";

    public Guid? CourseOfferingId { get; set; }
    public CourseOffering? CourseOffering { get; set; }

    public List<Question> Questions { get; set; } = new();
    public List<ExamAttempt> Attempts { get; set; } = new();
}
