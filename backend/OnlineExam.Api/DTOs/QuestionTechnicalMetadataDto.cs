using System.Text.Json;
using OnlineExam.Api.Models;

namespace OnlineExam.Api.DTOs;

public class QuestionTechnicalMetadataDto
{
    public string? Schema { get; set; }
    public string? StarterCode { get; set; }
    public string? ExpectedOutput { get; set; }
    public string? ModelAnswer { get; set; }
    public string? GradingNotes { get; set; }
}

public static class QuestionTechnicalMetadataMapper
{
    public static string? SerializeForStorage(string questionType, QuestionTechnicalMetadataDto? metadata)
    {
        if (!IsTechnicalQuestionType(questionType) || metadata == null)
            return null;

        var normalized = Normalize(metadata);
        if (normalized == null)
            return null;

        return JsonSerializer.Serialize(normalized);
    }

    public static QuestionTechnicalMetadataDto? BuildResponseMetadata(Question question, bool includePrivateFields)
    {
        if (!IsTechnicalQuestionType(question.Type))
            return null;

        var stored = ReadStoredMetadata(question);
        var response = new QuestionTechnicalMetadataDto
        {
            Schema = stored?.Schema ?? ExtractStructuredQuestionSection(question.Text, "Schema"),
            StarterCode = stored?.StarterCode ??
                          ExtractStructuredQuestionSection(question.Text, "Starter SQL") ??
                          ExtractStructuredQuestionSection(question.Text, "Starter C# code"),
            ExpectedOutput = stored?.ExpectedOutput ?? ExtractStructuredQuestionSection(question.Text, "Expected output"),
            ModelAnswer = stored?.ModelAnswer ?? NormalizeOptionalValue(question.CorrectAnswer) ?? ExtractStructuredQuestionSection(question.Text, "Model answer"),
            GradingNotes = stored?.GradingNotes ?? ExtractStructuredQuestionSection(question.Text, "Expected answer / grading note")
        };

        response = Normalize(response) ?? new QuestionTechnicalMetadataDto();
        if (!includePrivateFields)
        {
            response.ModelAnswer = null;
            response.GradingNotes = null;
        }

        return HasAnyValue(response) ? response : null;
    }

    public static string ResolvePrompt(Question question)
    {
        if (!IsTechnicalQuestionType(question.Type))
            return question.Text;

        return ExtractStructuredQuestionSection(question.Text, "Prompt") ?? question.Text;
    }

    public static string? ResolveExpectedAnswerOrNotes(Question question)
    {
        var metadata = BuildResponseMetadata(question, includePrivateFields: true);
        return NormalizeOptionalValue(metadata?.ModelAnswer) ??
               NormalizeOptionalValue(metadata?.GradingNotes) ??
               NormalizeOptionalValue(question.CorrectAnswer) ??
               ExtractStructuredQuestionSection(question.Text, "Expected answer / grading note");
    }

    private static QuestionTechnicalMetadataDto? ReadStoredMetadata(Question question)
    {
        var raw = NormalizeOptionalValue(question.MetadataJson);
        if (raw == null)
            return null;

        try
        {
            var parsed = JsonSerializer.Deserialize<QuestionTechnicalMetadataDto>(raw);
            return Normalize(parsed);
        }
        catch
        {
            return null;
        }
    }

    private static QuestionTechnicalMetadataDto? Normalize(QuestionTechnicalMetadataDto? metadata)
    {
        if (metadata == null)
            return null;

        var normalized = new QuestionTechnicalMetadataDto
        {
            Schema = NormalizeOptionalValue(metadata.Schema),
            StarterCode = NormalizeOptionalValue(metadata.StarterCode),
            ExpectedOutput = NormalizeOptionalValue(metadata.ExpectedOutput),
            ModelAnswer = NormalizeOptionalValue(metadata.ModelAnswer),
            GradingNotes = NormalizeOptionalValue(metadata.GradingNotes)
        };

        return HasAnyValue(normalized) ? normalized : null;
    }

    private static bool HasAnyValue(QuestionTechnicalMetadataDto metadata)
    {
        return !string.IsNullOrWhiteSpace(metadata.Schema) ||
               !string.IsNullOrWhiteSpace(metadata.StarterCode) ||
               !string.IsNullOrWhiteSpace(metadata.ExpectedOutput) ||
               !string.IsNullOrWhiteSpace(metadata.ModelAnswer) ||
               !string.IsNullOrWhiteSpace(metadata.GradingNotes);
    }

    private static bool IsTechnicalQuestionType(string? questionType)
    {
        return string.Equals(questionType, "SQL", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(questionType, "CSharp", StringComparison.OrdinalIgnoreCase);
    }

    private static string? ExtractStructuredQuestionSection(string value, string label)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var sections = value
            .Split("\n\n---\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var section in sections)
        {
            var prefix = $"{label}:\n";
            if (section.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                return NormalizeOptionalValue(section[prefix.Length..]);
        }

        return null;
    }

    private static string? NormalizeOptionalValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
