using OnlineExam.Api.DTOs;

namespace OnlineExam.Api.Services;

public interface ISmuMappingService
{
    SmuContractSummaryDto BuildContractSummary();
    SmuMappedPreviewDto BuildMappedPreview(SmuSnapshotDto snapshot);
}
