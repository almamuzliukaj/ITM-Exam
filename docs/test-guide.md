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

1. Log in as `student@onlineexam.com`.
2. Open the student exams area.
3. Start an allowed published exam.
4. Answer MCQ, text, code, and SQL questions when they are present.
5. Refresh the page and confirm draft answers are restored.
6. Submit the attempt.
7. Confirm the exam cannot be submitted a second time.
8. Open the results page and confirm unpublished results stay hidden.
9. After a professor publishes results, confirm the score and feedback are visible.

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
