namespace OnlineExam.Api.Services;

public interface IAuditLogService
{
    Task LogAsync(
        string action,
        string entityType,
        Guid? entityId,
        object? details = null,
        string? scope = null,
        CancellationToken cancellationToken = default);
}
