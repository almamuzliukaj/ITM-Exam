using System;
using System.Collections.Generic;

namespace OnlineExam.Api.DTOs
{
    public class CreateExamAttemptDto
    {
        public Guid ExamId { get; set; }
        public List<AnswerDto> Answers { get; set; } = new();
    }

    public class AnswerDto
    {
        public Guid QuestionId { get; set; }
        public string Response { get; set; } = null!;
    }

    public class RunTechnicalAnswerDto
    {
        public Guid AttemptId { get; set; }
        public Guid QuestionId { get; set; }
        public string Response { get; set; } = string.Empty;
        public string? ClientSessionId { get; set; }
    }

    public class TechnicalRunResultDto
    {
        public string Status { get; set; } = "NotSupported";
        public string Output { get; set; } = string.Empty;
        public string Errors { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;
        public List<TechnicalRunTestResultDto> TestResults { get; set; } = new();
    }

    public class TechnicalRunTestResultDto
    {
        public string Name { get; set; } = string.Empty;
        public bool Passed { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Visibility { get; set; } = "Public";
    }
}
