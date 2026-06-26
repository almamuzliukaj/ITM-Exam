# Alma - Generated Question Review E2E

## Scope

Sprint I covers the review and approval workspace for generated questions before they enter the reusable Question Bank.

## Flow

1. Professor or assistant opens `Question Bank`.
2. User clicks `Review generated`.
3. User selects the course offering.
4. Generated draft questions appear with source excerpt, status, type, topic, difficulty, points, answer data, and reviewer explanation.
5. User edits the generated content.
6. User can approve, reject, or regenerate one question.
7. Only approved questions can be added to the Question Bank.
8. Pending and rejected questions remain blocked from import.

## Validation

- MCQ questions require at least two alternatives.
- MCQ correct answer must match one available alternative.
- Text, C#, and SQL questions require a model answer or expected output.
- Every approved question requires text, points, difficulty, and reviewer explanation.

## Integration Notes

The current Question Bank API stores prompt, type, points, topic, difficulty, options, and correct answer. The review workspace supports editing reviewer explanation, but it does not inject explanation into the student-visible question text. A dedicated backend field can persist explanations later when the AI orchestration backend is expanded.

## Expected Result

Approved generated questions are added to the selected offering's Question Bank and become available for future exam creation. Pending and rejected questions are not imported.
