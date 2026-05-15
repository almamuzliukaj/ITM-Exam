namespace OnlineExam.Api.DTOs;

public class ExamLockdownReadinessDto
{
    public Guid ExamId { get; set; }
    public bool RequiresLockdown { get; set; }
    public string AllowedClient { get; set; } = "StandardBrowser";
    public string LockdownMode { get; set; } = "Advisory";
    public string? CurrentClient { get; set; }
    public bool IsAllowedClient { get; set; }
    public bool CanStartAttempt { get; set; }
    public string Status { get; set; } = "Ready";
    public string Message { get; set; } = string.Empty;
}
