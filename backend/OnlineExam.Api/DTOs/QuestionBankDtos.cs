namespace OnlineExam.Api.DTOs;

public class UpsertQuestionBankQuestionDto
{
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? CorrectAnswer { get; set; }
    public List<string> Options { get; set; } = [];
    public int Points { get; set; }
}

public class QuestionBankQuestionResponseDto
{
    public Guid Id { get; set; }
    public Guid CourseOfferingId { get; set; }
    public Guid? CourseId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? CorrectAnswer { get; set; }
    public List<string> Options { get; set; } = [];
    public int Points { get; set; }
}
