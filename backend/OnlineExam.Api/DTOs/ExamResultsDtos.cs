namespace OnlineExam.Api.DTOs;

public class GradeExamAttemptDto
{
    public double? ManualScore { get; set; }
    public double? FinalScore { get; set; }
    public string? Notes { get; set; }
}

public class PublishExamResultsDto
{
    public bool PublishAll { get; set; } = true;
    public List<Guid> AttemptIds { get; set; } = [];
}

public class ExamAttemptSummaryDto
{
    public Guid AttemptId { get; set; }
    public Guid ExamId { get; set; }
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public double AutoScore { get; set; }
    public double ManualScore { get; set; }
    public double FinalScore { get; set; }
    public bool RequiresManualGrading { get; set; }
    public bool IsGraded { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? GradedAt { get; set; }
    public string? GradingNotes { get; set; }
}

public class StudentExamResultDto
{
    public Guid AttemptId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public double? FinalScore { get; set; }
    public double? AutoScore { get; set; }
    public string? GradingNotes { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public class AiTextEvaluationResponseDto
{
    public Guid AttemptId { get; set; }
    public Guid ExamId { get; set; }
    public double SuggestedManualScore { get; set; }
    public string ReviewReminder { get; set; } = string.Empty;
    public List<AiTextEvaluationQuestionDto> Questions { get; set; } = [];
}

public class AiTextEvaluationQuestionDto
{
    public Guid QuestionId { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string? ExpectedAnswer { get; set; }
    public double MaxPoints { get; set; }
    public double SuggestedPoints { get; set; }
    public string Confidence { get; set; } = string.Empty;
    public string Rationale { get; set; } = string.Empty;
}
