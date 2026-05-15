using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Services;

namespace OnlineExam.Api.Controllers;

[ApiController]
[Route("api/smu-integration")]
[Authorize(Roles = "Admin")]
public class SmuIntegrationController : ControllerBase
{
    private readonly ISmuApiClient _smuApiClient;
    private readonly ISmuMappingService _smuMappingService;
    private readonly ISmuSyncService _smuSyncService;

    public SmuIntegrationController(
        ISmuApiClient smuApiClient,
        ISmuMappingService smuMappingService,
        ISmuSyncService smuSyncService)
    {
        _smuApiClient = smuApiClient;
        _smuMappingService = smuMappingService;
        _smuSyncService = smuSyncService;
    }

    [HttpGet("contract")]
    public ActionResult<SmuContractSummaryDto> GetContract()
    {
        return Ok(_smuMappingService.BuildContractSummary());
    }

    [HttpPost("map-preview")]
    public ActionResult<SmuMappedPreviewDto> MapPreview([FromBody] SmuSnapshotDto snapshot)
    {
        return Ok(_smuMappingService.BuildMappedPreview(snapshot));
    }

    [HttpGet("live-preview")]
    public async Task<ActionResult<SmuMappedPreviewDto>> GetLivePreview(CancellationToken cancellationToken)
    {
        try
        {
            var snapshot = await _smuApiClient.GetSnapshotAsync(cancellationToken);
            return Ok(_smuMappingService.BuildMappedPreview(snapshot));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sync")]
    public async Task<ActionResult<SmuSyncResultDto>> Sync(CancellationToken cancellationToken)
    {
        try
        {
            return Ok(await _smuSyncService.SyncAsync(cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("sync-from-payload")]
    public async Task<ActionResult<SmuSyncResultDto>> SyncFromPayload([FromBody] SmuSnapshotDto snapshot, CancellationToken cancellationToken)
    {
        return Ok(await _smuSyncService.SyncAsync(snapshot, cancellationToken));
    }
}
