# Generated Question Review E2E

## Status

This document describes an optional extension workflow for AI/material-generated questions. The current baseline question-bank workflow is manual authoring for MCQ, Text, C#, and SQL questions. Generated-question review should be treated as an extension unless the related UI/API is enabled in the active branch.

## Intended Flow

1. Professor or assistant opens Question Bank.
2. User selects an assigned course offering.
3. Generated draft questions are reviewed before they enter the reusable bank.
4. User edits prompt, type, points, topic, answer data, and explanation.
5. User approves, rejects, or regenerates a draft.
6. Only approved questions are inserted into the question bank.

## Validation Rules

- MCQ questions require at least two alternatives.
- MCQ correct answer must match one available alternative.
- Text questions require a model answer or grading note.
- C# and SQL questions require prompt, starter code/schema where applicable, expected output or grading notes.
- Generated content must never be published directly to students without staff review.

## Current Baseline Alternative

Use the implemented Question Bank pages to create reviewed questions manually:

- `/question-bank`
- `/question-bank/new`
- `/question-bank/questions/:questionId/edit`

## Acceptance Criteria for Future Activation

- Generated drafts are clearly separated from approved question-bank items.
- Rejected drafts cannot be imported.
- Approved drafts preserve staff edits.
- Audit logs capture approval/rejection actions.
- Manual test evidence is added before the feature is considered active.
