using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnlineExam.Api.Data;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "Admin")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuditLogsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] string? actorRole,
        [FromQuery] Guid? entityId,
        [FromQuery] int limit = 200)
    {
        var take = Math.Clamp(limit, 1, 500);
        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(x => x.Action == action.Trim());

        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(x => x.EntityType == entityType.Trim());

        if (!string.IsNullOrWhiteSpace(actorRole))
            query = query.Where(x => x.ActorRole == actorRole.Trim());

        if (entityId.HasValue)
            query = query.Where(x => x.EntityId == entityId.Value);

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .ToListAsync();

        return Ok(items);
    }
}
