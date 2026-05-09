using System.ComponentModel.DataAnnotations;

namespace OnlineExam.Api.Models;

public class AuditLog
{
    public Guid Id { get; set; }

    public Guid? ActorUserId { get; set; }

    [MaxLength(200)]
    public string ActorEmail { get; set; } = "system";

    [MaxLength(50)]
    public string ActorRole { get; set; } = "System";

    [MaxLength(120)]
    public string Action { get; set; } = null!;

    [MaxLength(80)]
    public string EntityType { get; set; } = null!;

    public Guid? EntityId { get; set; }

    [MaxLength(120)]
    public string Scope { get; set; } = "Application";

    public string? DetailsJson { get; set; }

    public DateTime CreatedAt { get; set; }
}
