namespace OnlineExam.Api.Services;

public interface IStudentPhotoStorageService
{
    Task<StudentPhotoStorageResult> SaveOfficialPhotoAsync(Guid studentId, IFormFile file, CancellationToken cancellationToken = default);
    Task<StudentPhotoReadResult?> ReadOfficialPhotoAsync(string fileName, string contentType, CancellationToken cancellationToken = default);
    void DeleteOfficialPhoto(string? fileName);
}

public record StudentPhotoStorageResult(string FileName, string ContentType, long SizeBytes);

public record StudentPhotoReadResult(Stream Stream, string ContentType);
