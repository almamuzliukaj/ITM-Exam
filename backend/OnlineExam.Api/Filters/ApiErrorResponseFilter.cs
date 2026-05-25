using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using OnlineExam.Api.DTOs;

namespace OnlineExam.Api.Filters;

public class ApiErrorResponseFilter : IAlwaysRunResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        var httpContext = context.HttpContext;

        switch (context.Result)
        {
            case ForbidResult:
                context.Result = BuildObjectResult(httpContext, StatusCodes.Status403Forbidden, "You do not have permission to perform this action.");
                return;
            case ChallengeResult:
                context.Result = BuildObjectResult(httpContext, StatusCodes.Status401Unauthorized, "Authentication is required to access this resource.");
                return;
            case StatusCodeResult statusCodeResult when statusCodeResult.StatusCode >= 400:
                context.Result = BuildObjectResult(httpContext, statusCodeResult.StatusCode, GetDefaultMessage(statusCodeResult.StatusCode));
                return;
            case ObjectResult objectResult when (objectResult.StatusCode ?? StatusCodes.Status200OK) >= 400:
            {
                var statusCode = objectResult.StatusCode ?? StatusCodes.Status500InternalServerError;
                var response = ApiErrorResponse.FromValue(httpContext, statusCode, objectResult.Value);
                context.Result = new ObjectResult(response) { StatusCode = statusCode };
                return;
            }
        }
    }

    public void OnResultExecuted(ResultExecutedContext context)
    {
    }

    private static ObjectResult BuildObjectResult(HttpContext httpContext, int statusCode, string message)
    {
        return new ObjectResult(ApiErrorResponse.Create(httpContext, statusCode, message))
        {
            StatusCode = statusCode
        };
    }

    private static string GetDefaultMessage(int statusCode)
    {
        return statusCode switch
        {
            StatusCodes.Status400BadRequest => "The request could not be processed.",
            StatusCodes.Status401Unauthorized => "Authentication is required to access this resource.",
            StatusCodes.Status403Forbidden => "You do not have permission to perform this action.",
            StatusCodes.Status404NotFound => "The requested resource was not found.",
            StatusCodes.Status409Conflict => "The request conflicts with the current state of the resource.",
            _ => "The request failed."
        };
    }
}
