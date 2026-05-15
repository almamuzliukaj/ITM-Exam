using OnlineExam.Api.DTOs;

namespace OnlineExam.Api.Services;

public interface ISmuSyncService
{
    Task<SmuSyncResultDto> SyncAsync(CancellationToken cancellationToken = default);
    Task<SmuSyncResultDto> SyncAsync(SmuSnapshotDto snapshot, CancellationToken cancellationToken = default);
}
