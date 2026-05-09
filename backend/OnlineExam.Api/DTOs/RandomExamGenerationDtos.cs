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

public class ExamQuestionResponseDto
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? CorrectAnswer { get; set; }
    public List<string> Options { get; set; } = [];
    public int Points { get; set; }
}
