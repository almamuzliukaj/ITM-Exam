# Manual Test Guide

This guide is the baseline checklist for local verification before opening or merging sprint pull requests.

## 1. Start Local Services

From the project root:

```powershell
docker compose up -d db
.\scripts\start-backend.ps1
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Expected local URLs:

- Backend Swagger: `http://localhost:5045/swagger`
- Frontend: `http://localhost:5173`

## 2. Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@onlineexam.com` | `Password123!` |
| Professor | `prof@onlineexam.com` | `Password123!` |
| Assistant | `assistant@onlineexam.com` | `Password123!` |
| Student | `student@onlineexam.com` | `Password123!` |

## 3. Student Exam Flow

Use this flow for Agnesa's Sprint 24 student journey validation.

### 3.1 Preconditions

Before testing as a student, confirm:

- The student has active semester/course eligibility for the exam offering.
- The exam is published.
- The exam has at least one question.
- If lockdown is required, the configured client rule matches the browser/client being used.

### 3.2 Attempt and Autosave

1. Log in as `student@onlineexam.com`.
2. Open the student exams area.
3. Start an allowed published exam.
4. Confirm the attempt page shows the `Student journey validation` panel.
5. Confirm these checkpoints are ready or understandable:
   - Attempt access
   - Questions
   - Timer
   - Draft safety
   - Integrity
6. Answer MCQ, text, code, and SQL questions when they are present.
7. Confirm the autosave card changes from waiting/saving to saved.
8. Refresh the page.
9. Confirm the restored draft banner appears and answers are still present.
10. Flag and unflag at least one question.
11. Confirm the question navigator updates answered/flagged states.

### 3.3 Submit Safety

1. Click `Submit exam`.
2. Confirm the final review panel shows answered, unanswered, flagged, and time remaining.
3. Cancel once and confirm the student can continue editing.
4. Click `Submit exam` again and confirm submit.
5. Confirm the submission result card appears.
6. Confirm the local draft is cleared after successful submission.
7. Try opening/submitting the same exam again and confirm duplicate submit is rejected or the existing attempt state is shown.

### 3.4 Result Visibility

1. Open `/results` from the submitted state or navigation.
2. Confirm the `Result validation checkpoint` panel is visible.
3. Confirm unpublished/pending attempts do not show scores.
4. Log in as professor and publish the graded result.
5. Log back in as student.
6. Open `/results`.
7. Confirm the published score, auto score, notes, and published date are visible.

Expected result:

- Student can open, answer, refresh, restore, submit, and later view the published result.
- Pending results remain hidden until staff publication.
- Duplicate submit is prevented.
- The UI gives enough visible state for a demo tester to know what passed.

## 4. Professor and Assistant Flow

1. Log in as `prof@onlineexam.com` or `assistant@onlineexam.com`.
2. Confirm only assigned course offerings are visible.
3. Create or review question-bank questions for an assigned offering.
4. Create or review an exam draft.
5. Attach questions manually or generate from the question bank.
6. Publish an exam only after readiness checks pass.
7. Review submitted attempts and publish results when grading is complete.

## 5. Admin Flow

1. Log in as `admin@onlineexam.com`.
2. Confirm users, terms, courses, offerings, staff assignments, and enrollments load correctly.
3. Confirm student eligibility is connected to semester and course enrollment.
4. Review carry-over records when testing progression rules.
5. Confirm audit logs capture critical actions.

## 6. Integrity and Safety Checks

During a student attempt:

1. Enter fullscreen when prompted.
2. Switch tabs or leave the exam window and confirm a warning/event is recorded.
3. Try copy, paste, print, and right-click actions and confirm they are blocked or tracked.
4. Exit fullscreen and confirm the attempt page shows a clear warning.
5. Confirm the exam remains usable on desktop and mobile viewport sizes.

## 7. Build Verification

From the project root:

```powershell
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj
```

From the frontend folder:

```powershell
npm run build
```

Generated folders such as `bin/`, `obj/`, `dist/`, and `temp_build*/` must not be committed.

## 8. University Demo Readiness

Before a final presentation:

1. Open the dashboard as Admin, Professor, Assistant, and Student.
2. Confirm each dashboard shows `University demo readiness`.
3. Confirm any `Review` checkpoint has a clear reason and can be explained.
4. Use `docs/demo-readiness-checklist.md` as the role-by-role walkthrough.
5. Confirm the student flow still passes Section 3 after any setup changes.
