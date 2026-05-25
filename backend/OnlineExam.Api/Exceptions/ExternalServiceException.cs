namespace OnlineExam.Api.Exceptions;

public class ExternalServiceException : Exception
{
    public int StatusCode { get; }
    public string ErrorCode { get; }
    public object? Details { get; }

    public ExternalServiceException(
        string message,
        int statusCode = StatusCodes.Status503ServiceUnavailable,
        string errorCode = "external_service_error",
        object? details = null,
        Exception? innerException = null) : base(message, innerException)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
        Details = details;
    }
}
