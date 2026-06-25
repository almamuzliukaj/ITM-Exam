namespace OnlineExam.Api.Models;

public class Question
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public Guid? CourseId { get; set; }
    public string? OptionsJson { get; set; }
    public string? MetadataJson { get; set; }
    public string Type { get; set; } = null!;
    public string? CorrectAnswer { get; set; }
    public string? Topic { get; set; }
    public string? Difficulty { get; set; }
    public string Text { get; set; } = null!;
    public int Points { get; set; }

    public Exam Exam { get; set; } = null!;
}
