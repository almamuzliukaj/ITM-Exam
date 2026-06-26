namespace OnlineExam.Api.DTOs
{
    public class ImportUsersDto
    {
        public string? DefaultPassword { get; set; }
        public bool GeneratePasswords { get; set; } = true;
        public List<ImportUserRowDto> Users { get; set; } = new();
    }

    public class ImportUserRowDto
    {
        public string Email { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string? StudentNumber { get; set; }
        public bool IsActive { get; set; } = true;
        public string? Password { get; set; }
    }
}
