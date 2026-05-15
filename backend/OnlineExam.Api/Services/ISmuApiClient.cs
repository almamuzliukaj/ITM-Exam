using OnlineExam.Api.DTOs;

namespace OnlineExam.Api.Services;

public interface ISmuApiClient
{
    Task<SmuSnapshotDto> GetSnapshotAsync(CancellationToken cancellationToken = default);
}
