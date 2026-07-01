# Manual Test Guide

This guide is the baseline checklist for local verification before opening or merging pull requests.

## 1. Start Local Services

From the repository root:

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

## 2. Development Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@onlineexam.com` | `Password123!` |
| Professor | `prof@onlineexam.com` | `Password123!` |
| Assistant | `assistant@onlineexam.com` | `Password123!` |
| Student | `student@onlineexam.com` | `Password123!` |

The login UI does not show preset buttons; enter credentials manually.

## 3. Admin Flow

1. Log in as Admin.
2. Open operational overview.
3. Open user management and verify directory/filter/actions.
4. Open academic structure and verify terms, courses, and offerings.
5. Open enrollments and verify student eligibility/carry-over data.
6. Open SMU sync and confirm source-of-truth explanation.
7. Open reports and verify report cards/tables load.

## 4. Professor Flow

1. Log in as Professor.
2. Confirm only assigned offerings are visible.
3. Open question bank and create or review MCQ, Text, C#, and SQL items.
4. Create an exam from an assigned offering.
5. Confirm academic year/semester/title metadata.
6. Attach questions manually or generate from question bank.
7. Publish the exam after readiness validation.
8. Generate an access code from exam details or live monitor.
9. Open gradebook after a student submits.
10. Review answers, adjust points, save review, export CSV if needed, and publish results.

## 5. Assistant Flow

1. Log in as Assistant.
2. Confirm only assigned/support offerings are visible.
3. Open assigned exams or question bank where allowed.
4. Confirm admin-only pages and unrelated offerings are not accessible.
5. Confirm monitor/review support behaves according to assignment rules.

## 6. Student Exam Flow

### Preconditions

- Student has active eligibility for the exam offering.
- Exam is published.
- Exam has at least one question.
- Staff has generated an access code or is ready to approve entry.

### Attempt

1. Log in as Student.
2. Open Available exams.
3. Start an eligible published exam.
4. Enter the active access code or request approval.
5. Confirm rules appear before the timer starts.
6. Continue into the attempt.
7. Confirm timer, progress, autosave, and integrity status are visible.
8. Answer MCQ/text questions.
9. For SQL/C#, use Run Query / Run Code and confirm output/status appears without submitting.
10. Refresh and confirm draft restore behavior where applicable.
11. Submit with the main submit button.

### Expected Result

- Attempt is submitted once.
- Draft is not lost before submit.
- Duplicate submit is prevented or existing attempt state is shown.
- Attempt appears in staff gradebook.

## 7. Integrity and Access Checks

1. During a student attempt, exit fullscreen or switch tabs.
2. Confirm integrity event/warning is recorded.
3. In monitor, verify the event appears in the stream.
4. Test staff revoke access.
5. Confirm the student receives a clear message and the attempt is submitted/closed according to policy.

## 8. Grading and Results

1. Log in as Professor.
2. Open exam gradebook.
3. Open a submitted attempt.
4. Review AI suggestions and student answers.
5. Change at least one per-question score.
6. Save review.
7. Publish graded results.
8. Log in as Student.
9. Open My Results.
10. Confirm final score, percentage, grade, notes, and published date match professor-published values.

## 9. Build Verification

Backend:

```powershell
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj
```

If the local API executable is locked:

```powershell
$buildOut = Join-Path $env:TEMP 'OnlineExamApiBuildCheck'
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj -o $buildOut
```

Frontend:

```powershell
cd frontend
npm run build
```

Generated folders such as `bin/`, `obj/`, `dist/`, `tmp/backend-build/`, `publish/`, and `artifacts/` must not be committed.

## 10. Pull Request Handoff

Before opening a pull request:

1. Confirm branch name describes the feature/fix.
2. Confirm `git status --short` includes only intended files.
3. Add build/manual testing notes to the PR.
4. Add screenshots for UI changes.
5. Mention known limitations clearly.
