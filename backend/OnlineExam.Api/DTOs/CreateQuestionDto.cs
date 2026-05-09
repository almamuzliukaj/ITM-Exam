namespace OnlineExam.Api.DTOs
{
    public class CreateQuestionDto
    {
        public string Text { get; set; } = null!;
        public string Type { get; set; } = null!;
        public Guid? CourseId { get; set; }
        public List<string>? Options { get; set; }
        public string? CorrectAnswer { get; set; }
        public int Points { get; set; }
    }
}
