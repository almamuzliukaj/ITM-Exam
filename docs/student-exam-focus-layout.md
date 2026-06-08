# Student Exam Focus Layout

This document records the Sprint 30 frontend focus pass for the student exam attempt screen.

## 1. Goal

The student attempt page must feel like a controlled university exam workspace. A student should immediately understand session status, progress, autosave state, exam safety, and how to submit.

## 2. Added UI Behavior

The attempt screen now includes a focused exam workspace panel with:

- Exam title and student identity.
- Attempt identifier when available.
- Answer progress percentage.
- Remaining unanswered count.
- Flagged question count.
- Autosave state and last saved time.
- Network/fullscreen status.
- Integrity policy state.

The question navigator now includes:

- Progress bar.
- Status legend for open, answered, and flagged questions.
- A secondary `Review and submit` action near the question list.

## 3. Student Experience Rules

- The main submit action remains available in the top action area.
- The navigator submit action opens the same submit review flow.
- Empty exams show a clear professional empty state instead of plain text.
- The layout remains readable on desktop and collapses cleanly on mobile.
- The page does not introduce new backend requirements.

## 4. Manual Test Checklist

Use a student account with an eligible published exam:

1. Open the student exam attempt page.
2. Confirm the focused workspace panel is visible above the question list.
3. Answer one question and confirm the progress percentage changes.
4. Flag one question and confirm the flagged count changes.
5. Confirm autosave status updates after editing.
6. Use the navigator legend to distinguish open, answered, and flagged questions.
7. Click `Review and submit` from the navigator and confirm the submit review panel opens.
8. Resize to mobile width and confirm the panel, navigator, and submit controls do not overlap.

## 5. Acceptance Criteria

- Student can understand exam progress without scanning the whole page.
- Student can reach submit review from both the top action area and the question navigator.
- Mobile layout remains clean and readable.
- Frontend build passes.
