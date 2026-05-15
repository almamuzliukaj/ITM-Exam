# Sprint 24 Backend Validation

Date: 2026-05-15

Scope:
- Authentication
- Student eligibility and attempt access
- Draft autosave
- Proctoring and integrity policy
- Grading and result publishing
- SMU sync

## Summary

Backend validation was executed end-to-end against the local API on `http://localhost:5045`.

All target areas passed after one backend fix:
- `SaveDraftAttempt` now loads exam questions before validating submitted answers.

## Validation Scenarios

### 1. Authentication

Validated:
- `POST /auth/login`
- `GET /auth/me`
- `GET /auth/admin/ping`

Verified with:
- `admin@onlineexam.com`
- `prof@onlineexam.com`
- `student@onlineexam.com`

Result:
- JWT login succeeded for all three roles.
- Role-protected admin endpoint returned success for admin.

### 2. Eligibility and Attempt Access

Validation setup:
- Created validation student `validation.student24@onlineexam.com`
- Created active semester enrollment for term `DEMO-WS26`
- Created eligible course enrollment for offering `7b236ee5-92ad-4bd4-ae0e-4897ef16dcb6`

Validated:
- `GET /api/exams/{examId}/attempt`
- `GET /api/exams/{examId}/questions`

Result:
- Student could start an in-progress attempt.
- Exam questions were returned correctly.
- Submit path worked for eligible student.

### 3. Draft Autosave

Validation setup:
- Created clean validation student `validation.student24b@onlineexam.com`

Validated:
- `PUT /api/exams/{examId}/attempt/draft`

Result:
- Draft save returned `Status = InProgress`
- Two answers were persisted
- `LastSavedAt` was updated successfully

Backend fix made during validation:
- `ExamsController.SaveDraftAttempt` was loading the exam without `Questions`
- Answer validation therefore rejected valid answers as not belonging to the exam
- Fixed by loading `Questions` before calling `ValidateAttemptAnswers`

### 4. Proctoring and Integrity Policy

Validated:
- `POST /api/exams/{examId}/attempt/integrity-events`
- `GET /api/exams/{examId}/attempt/integrity-summary`
- `GET /api/exams/{examId}/integrity-summary`

Events tested:
- `TabHidden`
- `WindowBlur`
- `FullscreenExit`
- `CopyAttempt`
- `PasteAttempt`

Result:
- Violation events were persisted successfully
- Student integrity summary returned recorded timeline
- Professor integrity summary aggregated attempts and total violations
- Auto-action threshold behavior was reflected through policy flags such as `ShouldAutoSubmit`

### 5. Grading and Results

Validated:
- `POST /api/exams/attempts/{attemptId}/grade`
- `POST /api/exams/{examId}/results/publish`
- `GET /api/exams/results/me`
- `GET /api/exams/results/me/{attemptId}`
- `GET /api/exams/{examId}/gradebook`

Result:
- Validation attempt `977e476b-961c-45c0-a002-dd2885fd8e25` was graded successfully
- Final score saved as `22`
- Results were published successfully
- Student result detail showed:
  - `Status = Published`
  - `FinalScore = 22`
  - `AutoScore = 10`
  - `RequiresManualGrading = true`

### 6. SMU Sync

Validated:
- `GET /api/smu-integration/contract`
- `POST /api/smu-integration/sync-from-payload`

Result:
- Contract endpoint returned 6 configured integration endpoints
- Sample SMU payload synced successfully with:
  - `StudentsCreated = 1`
  - `StaffCreated = 1`
  - `OfferingsCreated = 1`
  - `CourseEnrollmentsCreated = 1`
  - `Warnings = 0`

## Overall Result

Sprint 24 backend validation passed for:
- auth
- eligibility
- autosave
- grading
- proctoring
- result publishing
- SMU sync

The only issue found during validation was a backend draft-save regression, and it was fixed in the same sprint validation pass.
