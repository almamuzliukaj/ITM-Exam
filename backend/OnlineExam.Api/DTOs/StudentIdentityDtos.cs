namespace OnlineExam.Api.DTOs;

public class StudentOfficialIdentityDto
{
    public Guid StudentId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string StudentNumber { get; set; } = string.Empty;
    public string PhotoUrl { get; set; } = string.Empty;
    public bool HasOfficialPhoto { get; set; }
    public string Initials { get; set; } = string.Empty;
}

public class StudentPhotoUploadResponseDto
{
    public Guid StudentId { get; set; }
    public string PhotoUrl { get; set; } = string.Empty;
    public bool ReplacedExistingPhoto { get; set; }
    public DateTime UploadedAt { get; set; }
}
