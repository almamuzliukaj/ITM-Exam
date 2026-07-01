# Published Result Visibility E2E Report

Owner: Alma

## Scope

This report verifies the student-facing result visibility workflow after grading and publishing.

## Preconditions

- A student is enrolled and eligible for the course offering.
- The exam is published and has at least one submitted attempt.
- A professor or assistant can open the exam gradebook.

## Flow

1. Professor opens the exam gradebook.
2. Professor reviews the submitted attempt.
3. Professor saves grading changes.
4. Refresh the gradebook and confirm the attempt remains graded.
5. Professor publishes graded results.
6. Student opens My Results.
7. Student clicks Refresh if already on the page.
8. Published result appears with score, percentage, grade, published date, and notes.

## Expected Result

- Student sees only published results.
- Pending or unpublished attempts are not listed in My Results.
- Empty state explains that results appear only after staff publication.
- Refresh reloads newly published results without requiring logout.

## Verification Commands

```powershell
cd frontend
npm run lint
npm run build
```

```powershell
$buildOut = Join-Path $env:TEMP 'OnlineExamApiBuildCheck'
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj -o $buildOut
```
