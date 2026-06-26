using System;

namespace OnlineExam.Api.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string StudentNumber { get; set; } = string.Empty;
        public string? OfficialPhotoFileName { get; set; }
        public string? OfficialPhotoContentType { get; set; }
        public long? OfficialPhotoSizeBytes { get; set; }
        public DateTime? OfficialPhotoUploadedAt { get; set; }
        public Guid? OfficialPhotoUpdatedByUserId { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
