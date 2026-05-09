using System;

namespace OnlineExam.Api.DTOs
{
    public class BuildExamParamsDto
    {
        public int NumberOfQuestions { get; set; }
        public string? Type { get; set; }
        public Guid CourseId { get; set; }
    }
}
