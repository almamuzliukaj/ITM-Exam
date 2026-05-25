using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using OnlineExam.Api.DTOs;
using OnlineExam.Api.Exceptions;

namespace OnlineExam.Api.Services;

public class SmuApiClient : ISmuApiClient
{
    private readonly HttpClient _httpClient;
    private readonly SmuIntegrationOptions _options;

    public SmuApiClient(HttpClient httpClient, IOptions<SmuIntegrationOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<SmuSnapshotDto> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        var students = await GetRequiredListAsync<SmuStudentDto>(_options.StudentsEndpoint, cancellationToken);
        var staff = await GetRequiredListAsync<SmuStaffDto>(_options.StaffEndpoint, cancellationToken);
        var terms = await GetRequiredListAsync<SmuTermDto>(_options.TermsEndpoint, cancellationToken);
        var courses = await GetRequiredListAsync<SmuCourseDto>(_options.CoursesEndpoint, cancellationToken);
        var offerings = await GetRequiredListAsync<SmuCourseOfferingDto>(_options.OfferingsEndpoint, cancellationToken);
        var enrollments = await GetRequiredListAsync<SmuEnrollmentDto>(_options.EnrollmentsEndpoint, cancellationToken);

        return new SmuSnapshotDto
        {
            Students = students,
            Staff = staff,
            Terms = terms,
            Courses = courses,
            Offerings = offerings,
            Enrollments = enrollments
        };
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.BaseUrl))
            throw new InvalidOperationException("SMU integration is not configured. BaseUrl is missing.");
    }

    private async Task<List<T>> GetRequiredListAsync<T>(string relativePath, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _httpClient.GetAsync(relativePath, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                throw new ExternalServiceException(
                    $"SMU request failed for '{relativePath}' with status {(int)response.StatusCode}.",
                    StatusCodes.Status503ServiceUnavailable,
                    "smu_upstream_error",
                    new
                    {
                        endpoint = relativePath,
                        statusCode = (int)response.StatusCode
                    });
            }

            var payload = await response.Content.ReadFromJsonAsync<List<T>>(cancellationToken: cancellationToken);
            return payload ?? [];
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ExternalServiceException(
                $"SMU request timed out for '{relativePath}'.",
                StatusCodes.Status504GatewayTimeout,
                "smu_timeout",
                new { endpoint = relativePath, timeoutSeconds = _options.TimeoutSeconds > 0 ? _options.TimeoutSeconds : 15 },
                ex);
        }
        catch (HttpRequestException ex)
        {
            throw new ExternalServiceException(
                $"SMU request failed for '{relativePath}'.",
                StatusCodes.Status503ServiceUnavailable,
                "smu_network_error",
                new { endpoint = relativePath },
                ex);
        }
        catch (NotSupportedException ex)
        {
            throw new ExternalServiceException(
                $"SMU returned an unsupported payload for '{relativePath}'.",
                StatusCodes.Status502BadGateway,
                "smu_payload_error",
                new { endpoint = relativePath },
                ex);
        }
        catch (System.Text.Json.JsonException ex)
        {
            throw new ExternalServiceException(
                $"SMU returned invalid JSON for '{relativePath}'.",
                StatusCodes.Status502BadGateway,
                "smu_payload_error",
                new { endpoint = relativePath },
                ex);
        }
    }
}
