using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace OnlineExam.Api.DTOs;

public class ApiErrorResponse
{
    public int Status { get; set; }
    public string Code { get; set; } = "api_error";
    public string Message { get; set; } = "An unexpected API error occurred.";
    public string? TraceId { get; set; }
    public object? Details { get; set; }

    public static ApiErrorResponse Create(HttpContext httpContext, int status, string message, object? details = null, string? code = null)
    {
        return new ApiErrorResponse
        {
            Status = status,
            Code = code ?? InferCode(status),
            Message = string.IsNullOrWhiteSpace(message) ? "An unexpected API error occurred." : message,
            TraceId = httpContext.TraceIdentifier,
            Details = details
        };
    }

    public static ApiErrorResponse FromValue(HttpContext httpContext, int status, object? value)
    {
        if (value is ApiErrorResponse apiErrorResponse)
        {
            apiErrorResponse.Status = status;
            apiErrorResponse.Code = string.IsNullOrWhiteSpace(apiErrorResponse.Code) ? InferCode(status) : apiErrorResponse.Code;
            apiErrorResponse.TraceId ??= httpContext.TraceIdentifier;
            apiErrorResponse.Message = string.IsNullOrWhiteSpace(apiErrorResponse.Message)
                ? "An unexpected API error occurred."
                : apiErrorResponse.Message;
            return apiErrorResponse;
        }

        if (value is HttpValidationProblemDetails validationProblemDetails)
        {
            return Create(
                httpContext,
                status,
                "Validation failed.",
                validationProblemDetails.Errors,
                "validation_error");
        }

        if (value is ProblemDetails problemDetails)
        {
            return Create(
                httpContext,
                status,
                problemDetails.Detail ?? problemDetails.Title ?? "Request failed.",
                problemDetails.Extensions.Count > 0 ? problemDetails.Extensions : null);
        }

        if (value is string stringValue)
            return Create(httpContext, status, stringValue);

        if (TryExtractMessage(value, out var message, out var details))
            return Create(httpContext, status, message, details);

        return Create(httpContext, status, "Request failed.", value);
    }

    private static bool TryExtractMessage(object? value, out string message, out object? details)
    {
        message = string.Empty;
        details = null;

        if (value is null)
            return false;

        try
        {
            var element = JsonSerializer.SerializeToElement(value);
            if (element.ValueKind != JsonValueKind.Object)
                return false;

            string? extractedMessage = null;
            Dictionary<string, object?>? detailMap = null;

            foreach (var property in element.EnumerateObject())
            {
                if (string.Equals(property.Name, "message", StringComparison.OrdinalIgnoreCase))
                {
                    extractedMessage = property.Value.ValueKind == JsonValueKind.String
                        ? property.Value.GetString()
                        : property.Value.ToString();
                    continue;
                }

                detailMap ??= new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                detailMap[property.Name] = JsonSerializer.Deserialize<object?>(property.Value.GetRawText());
            }

            if (string.IsNullOrWhiteSpace(extractedMessage))
                return false;

            message = extractedMessage!;
            details = detailMap is { Count: > 0 } ? detailMap : null;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string InferCode(int status)
    {
        return status switch
        {
            StatusCodes.Status400BadRequest => "bad_request",
            StatusCodes.Status401Unauthorized => "unauthorized",
            StatusCodes.Status403Forbidden => "forbidden",
            StatusCodes.Status404NotFound => "not_found",
            StatusCodes.Status409Conflict => "conflict",
            StatusCodes.Status422UnprocessableEntity => "validation_error",
            StatusCodes.Status500InternalServerError => "server_error",
            _ => "api_error"
        };
    }
}
