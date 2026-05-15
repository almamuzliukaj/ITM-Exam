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

    public SmuIntegrationController(ISmuApiClient smuApiClient, ISmuMappingService smuMappingService)
    {
        _smuApiClient = smuApiClient;
        _smuMappingService = smuMappingService;
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
}
