namespace OnlineExam.Api.Models;

public class ExamAttempt
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public Guid StudentId { get; set; }
    public string Status { get; set; } = "InProgress";
    public DateTime StartedAt { get; set; }
    public DateTime? LastSavedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string AnswersJson { get; set; } = null!;
    public double AutoScore { get; set; }
    public double ManualScore { get; set; }
    public double FinalScore { get; set; }
    public bool RequiresManualGrading { get; set; }
    public bool IsGraded { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? GradedAt { get; set; }
    public Guid? GradedByUserId { get; set; }
    public string? GradingNotes { get; set; }
    public DateTime? PublishedAt { get; set; }
    public Guid? PublishedByUserId { get; set; }

    public Exam Exam { get; set; } = null!;
    public List<ExamIntegrityEvent> IntegrityEvents { get; set; } = new();
}
