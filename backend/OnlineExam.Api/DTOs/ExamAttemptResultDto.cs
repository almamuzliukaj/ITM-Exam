using System;
using System.Collections.Generic;

namespace OnlineExam.Api.DTOs
{
    public class ExamAttemptResultDto
    {
        public Guid ExamAttemptId { get; set; }
        public string Status { get; set; } = "Submitted";
        public DateTime? StartedAt { get; set; }
        public DateTime? LastSavedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public string? AttemptVersionSignature { get; set; }
        public double Score { get; set; }
        public List<QuestionScoreDetailDto> Questions { get; set; } = new();
    }

    public class ExamAttemptDraftDto
    {
        public Guid ExamAttemptId { get; set; }
        public string Status { get; set; } = "InProgress";
        public DateTime StartedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? LastSavedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public List<AnswerDto> Answers { get; set; } = new();
    }

    public class QuestionScoreDetailDto
    {
        public Guid QuestionId { get; set; }
        public double PointsAwarded { get; set; }
        public double MaxPoints { get; set; }
    }
}
