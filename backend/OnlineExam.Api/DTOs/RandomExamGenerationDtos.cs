namespace OnlineExam.Api.DTOs;

public class GenerateRandomExamQuestionsDto
{
    public int NumberOfQuestions { get; set; }
    public string? Type { get; set; }
}

public class ReplaceExamQuestionDto
{
    public string? Type { get; set; }
}

public class AddSelectedExamQuestionsDto
{
    public List<Guid> QuestionBankQuestionIds { get; set; } = [];
}

public class ReplaceWithBankQuestionDto
{
    public Guid QuestionBankQuestionId { get; set; }
}

public class ExamQuestionResponseDto
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? CorrectAnswer { get; set; }
    public string? Topic { get; set; }
    public string? Difficulty { get; set; }
    public int CorrectAnswerCount { get; set; } = 1;
    public List<string> Options { get; set; } = [];
    public int Points { get; set; }
}

public class GenerateRandomExamQuestionsResponseDto
{
    public List<ExamQuestionResponseDto> Questions { get; set; } = [];
    public int TargetPoints { get; set; }
    public int TotalPoints { get; set; }
    public int Difference { get; set; }
    public bool IsExactMatch { get; set; }
    public string Message { get; set; } = string.Empty;
}
