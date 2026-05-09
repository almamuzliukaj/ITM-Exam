using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using OnlineExam.Api.Data;
using OnlineExam.Api.Models;

namespace OnlineExam.Api.Services;

public class AuditLogService : IAuditLogService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditLogService(AppDbContext context, IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(
        string action,
        string entityType,
        Guid? entityId,
        object? details = null,
        string? scope = null,
        CancellationToken cancellationToken = default)
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var actorUserIdRaw = user?.FindFirstValue(ClaimTypes.NameIdentifier);
        var actorEmail = user?.FindFirstValue(ClaimTypes.Name) ?? "system";
        var actorRole = user?.FindFirstValue(ClaimTypes.Role) ?? "System";

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorUserId = Guid.TryParse(actorUserIdRaw, out var parsedUserId) ? parsedUserId : null,
            ActorEmail = actorEmail,
            ActorRole = actorRole,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Scope = string.IsNullOrWhiteSpace(scope) ? "Application" : scope.Trim(),
            DetailsJson = details == null ? null : JsonSerializer.Serialize(details, JsonOptions),
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
    }
}
