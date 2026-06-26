using OnlineExam.Api.Exceptions;

namespace OnlineExam.Api.Services;

public class StudentPhotoStorageService : IStudentPhotoStorageService
{
    private const long MaxPhotoBytes = 2 * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp"
    };

    private static readonly Dictionary<string, string> ExtensionContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
        [".webp"] = "image/webp"
    };

    private readonly string _storageRoot;

    public StudentPhotoStorageService(IWebHostEnvironment environment)
    {
        _storageRoot = Path.Combine(environment.ContentRootPath, "App_Data", "official-student-photos");
        Directory.CreateDirectory(_storageRoot);
    }

    public async Task<StudentPhotoStorageResult> SaveOfficialPhotoAsync(Guid studentId, IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0)
            throw new ExternalServiceException("Photo file is empty.", StatusCodes.Status400BadRequest, "invalid_photo");

        if (file.Length > MaxPhotoBytes)
            throw new ExternalServiceException("Photo file is too large. Maximum allowed size is 2 MB.", StatusCodes.Status400BadRequest, "photo_too_large");

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
            throw new ExternalServiceException("Unsupported photo format. Upload JPEG, PNG, or WebP.", StatusCodes.Status400BadRequest, "unsupported_photo_format");

        var expectedContentType = ExtensionContentTypes[extension];
        if (!string.Equals(file.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
            throw new ExternalServiceException("Photo MIME type does not match the uploaded file extension.", StatusCodes.Status400BadRequest, "photo_mime_mismatch");

        await using var input = file.OpenReadStream();
        var signature = new byte[Math.Min(16, file.Length)];
        var bytesRead = await input.ReadAsync(signature.AsMemory(0, signature.Length), cancellationToken);
        if (!HasValidImageSignature(signature.AsSpan(0, bytesRead), expectedContentType))
            throw new ExternalServiceException("Photo content is not a valid JPEG, PNG, or WebP image.", StatusCodes.Status400BadRequest, "invalid_photo_signature");

        input.Position = 0;
        var safeFileName = $"{studentId:N}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var targetPath = Path.Combine(_storageRoot, safeFileName);
        await using var output = File.Create(targetPath);
        await input.CopyToAsync(output, cancellationToken);

        return new StudentPhotoStorageResult(safeFileName, expectedContentType, file.Length);
    }

    public Task<StudentPhotoReadResult?> ReadOfficialPhotoAsync(string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        var safeFileName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeFileName) || safeFileName != fileName)
            return Task.FromResult<StudentPhotoReadResult?>(null);

        var path = Path.Combine(_storageRoot, safeFileName);
        if (!File.Exists(path))
            return Task.FromResult<StudentPhotoReadResult?>(null);

        Stream stream = File.OpenRead(path);
        return Task.FromResult<StudentPhotoReadResult?>(new StudentPhotoReadResult(stream, contentType));
    }

    public void DeleteOfficialPhoto(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return;

        var safeFileName = Path.GetFileName(fileName);
        if (safeFileName != fileName)
            return;

        var path = Path.Combine(_storageRoot, safeFileName);
        if (File.Exists(path))
            File.Delete(path);
    }

    private static bool HasValidImageSignature(ReadOnlySpan<byte> signature, string contentType)
    {
        if (contentType == "image/jpeg")
            return signature.Length >= 3 && signature[0] == 0xFF && signature[1] == 0xD8 && signature[2] == 0xFF;

        if (contentType == "image/png")
        {
            ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            return signature.Length >= png.Length && signature[..png.Length].SequenceEqual(png);
        }

        if (contentType == "image/webp")
        {
            ReadOnlySpan<byte> riff = [(byte)'R', (byte)'I', (byte)'F', (byte)'F'];
            ReadOnlySpan<byte> webp = [(byte)'W', (byte)'E', (byte)'B', (byte)'P'];
            return signature.Length >= 12 &&
                   signature[..4].SequenceEqual(riff) &&
                   signature.Slice(8, 4).SequenceEqual(webp);
        }

        return false;
    }
}
