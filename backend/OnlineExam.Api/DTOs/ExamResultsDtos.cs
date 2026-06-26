namespace OnlineExam.Api.DTOs;

public class GradeExamAttemptDto
{
    public double? ManualScore { get; set; }
    public double? FinalScore { get; set; }
    public string? Notes { get; set; }
    public List<GradeExamAttemptQuestionScoreDto> QuestionScores { get; set; } = [];
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
    public string Status { get; set; } = string.Empty;
    public string GradingStatus { get; set; } = "NotReviewed";
    public DateTime StartedAt { get; set; }
    public DateTime? LastSavedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public double AutoScore { get; set; }
    public double ManualScore { get; set; }
    public double FinalScore { get; set; }
    public double ExamMaxPoints { get; set; }
    public double ScorePercentage { get; set; }
    public int FinalGrade { get; set; }
    public bool IsPassed { get; set; }
    public bool RequiresManualGrading { get; set; }
    public bool IsGraded { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? GradedAt { get; set; }
    public Guid? GradedByUserId { get; set; }
    public string? GradingNotes { get; set; }
    public DateTime? PublishedAt { get; set; }
    public Guid? PublishedByUserId { get; set; }
    public int IntegrityViolationCount { get; set; }
    public DateTime? IntegrityLastViolationAt { get; set; }
    public string IntegrityPolicyAction { get; set; } = "None";
    public DateTime? IntegrityAutoActionTriggeredAt { get; set; }
    public DateTime? IntegrityLastEventAt { get; set; }
    public List<ExamIntegrityEventDto> IntegrityEvents { get; set; } = [];
    public List<ExamAttemptQuestionScoreDto> QuestionScores { get; set; } = [];
    public List<ExamAttemptAnswerReviewDto> Answers { get; set; } = [];
}

public class ExamAttemptAnswerReviewDto
{
    public Guid QuestionId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public string QuestionType { get; set; } = string.Empty;
    public List<string> Options { get; set; } = [];
    public string? CorrectAnswer { get; set; }
    public string Response { get; set; } = string.Empty;
    public int Points { get; set; }
    public bool IsCorrect { get; set; }
    public double AutoPointsAwarded { get; set; }
    public double FinalPointsAwarded { get; set; }
    public bool IsManuallyOverridden { get; set; }
    public string? GradingNotes { get; set; }
}

public class GradeExamAttemptQuestionScoreDto
{
    public Guid QuestionId { get; set; }
    public double PointsAwarded { get; set; }
    public string? Notes { get; set; }
}

public class ExamAttemptQuestionScoreDto
{
    public Guid QuestionId { get; set; }
    public double MaxPoints { get; set; }
    public double AutoPointsAwarded { get; set; }
    public double FinalPointsAwarded { get; set; }
    public bool IsManuallyOverridden { get; set; }
    public string? GradingNotes { get; set; }
}

public class StudentExamResultDto
{
    public Guid AttemptId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public DateTime? SubmittedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public double? FinalScore { get; set; }
    public double? AutoScore { get; set; }
    public double? ExamMaxPoints { get; set; }
    public double? ScorePercentage { get; set; }
    public int? FinalGrade { get; set; }
    public bool? IsPassed { get; set; }
    public string? GradingNotes { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public class StudentExamResultDetailDto
{
    public Guid AttemptId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public DateTime? SubmittedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public double? FinalScore { get; set; }
    public double? AutoScore { get; set; }
    public double? ExamMaxPoints { get; set; }
    public double? ScorePercentage { get; set; }
    public int? FinalGrade { get; set; }
    public bool? IsPassed { get; set; }
    public string? GradingNotes { get; set; }
    public DateTime? PublishedAt { get; set; }
    public bool RequiresManualGrading { get; set; }
    public bool IsGraded { get; set; }
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
    public string QuestionType { get; set; } = string.Empty;
    public string Response { get; set; } = string.Empty;
    public string? ExpectedAnswer { get; set; }
    public double MaxPoints { get; set; }
    public double SuggestedPoints { get; set; }
    public string Confidence { get; set; } = string.Empty;
    public string Rationale { get; set; } = string.Empty;
}

public class CreateExamIntegrityEventDto
{
    public Guid? AttemptId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int ViolationCount { get; set; }
    public string? Message { get; set; }
}

public class ExamIntegrityEventDto
{
    public string EventType { get; set; } = string.Empty;
    public int ViolationCount { get; set; }
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; }
}
