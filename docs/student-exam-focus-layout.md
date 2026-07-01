# Student Exam Focus Layout

## Goal

The student attempt page must feel like a controlled university exam workspace. A student should immediately understand exam status, access approval, timer, answer progress, autosave, integrity state, technical Run output, and how to submit.

## Current UI Behavior

The attempt screen includes:

- Exam title and verified student identity.
- Timer and answered-question progress.
- Fullscreen/network/draft-save status.
- Integrity warning and policy state.
- Question workspace for MCQ, text, SQL, and C#.
- Monaco Editor for SQL/C# questions.
- Run Query / Run Code button that does not submit the exam.
- Run output/status/errors/test-summary panel.
- Submit exam action.
- Clear empty state when no questions are attached.

## Student Experience Rules

- Rules must appear before the timer starts.
- Run actions must save/preview the current technical draft but never submit the exam.
- Submit must be explicit unless policy auto-submit is triggered.
- If access is revoked or policy auto-submit occurs, the student should receive a clear explanation and leave the active exam workspace.
- The UI must not allow a student to continue working after final submit.

## Manual Test Checklist

1. Open an eligible published exam as a student.
2. Complete access-code or staff approval flow.
3. Confirm rules appear before timer.
4. Answer a text/MCQ question.
5. Answer a SQL or C# question and click Run.
6. Confirm Run output appears and the exam is not submitted.
7. Refresh and confirm draft restore where applicable.
8. Submit with the main submit button.
9. Confirm the attempt appears in gradebook.

## Acceptance Criteria

- Student understands progress and safety state without searching the page.
- Technical Run is clearly separate from Submit.
- Submit works from the main action.
- Empty/no-question exams show a professional message.
- Frontend build passes.
