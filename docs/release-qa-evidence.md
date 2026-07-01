# Release QA Evidence

This document defines the evidence expected before a demo or release branch is considered ready.

## Evidence Summary

| Area | Evidence to Capture | Status |
| --- | --- | --- |
| Authentication | Login works for Admin, Professor, Assistant, and Student. | Pending |
| Admin workspace | Operational overview, users, academic structure, enrollments, SMU, and reports load. | Pending |
| Professor workspace | Assigned offerings, exams, question bank, live monitor, and gradebook load. | Pending |
| Assistant workspace | Scoped support pages load without admin-only access. | Pending |
| Student workspace | Available exams, access entry, attempt, autosave, submit, and results load. | Pending |
| Integrity controls | Fullscreen/blur/device/access events are visible to staff. | Pending |
| Build checks | Frontend and backend build results are recorded. | Pending |

## Required Screenshots

Capture these screens for final project evidence:

1. Login page.
2. Admin operational overview.
3. Admin user management.
4. Admin academic structure or enrollment control.
5. SMU integration readiness page.
6. Professor dashboard with assigned offerings.
7. Question bank with technical question fields.
8. Exam details page with publish/access controls.
9. Live monitor with access-code area.
10. Gradebook review modal/drawer.
11. Student exam entry/rules screen.
12. Student exam session with timer/autosave.
13. Student results page with published result.
14. Reports page.

## Command Evidence

Record command output in PR notes:

```powershell
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj
cd frontend
npm run build
git status --short --branch
```

Expected:

- Backend build completes or uses a temporary output folder if the local API executable is locked.
- Frontend build completes.
- Git status shows only intended committed changes after the PR commit.

## Manual QA Flow

### Admin

- Confirm operational overview opens without oversized or blank sections.
- Confirm user, academic, enrollment, SMU, and report pages load.
- Confirm student eligibility and carry-over data can be reviewed.

### Professor

- Confirm assigned offerings are scoped to the signed-in professor.
- Confirm exam creation, question attachment/generation, access code, monitor, gradebook, and result publication are visible.

### Assistant

- Confirm assistant can access only assigned support work.
- Confirm assistant does not see admin-only controls.

### Student

- Confirm eligible exams are visible.
- Start an exam through access code or approval.
- Confirm rules, timer, autosave, technical Run preview, and submit.
- Confirm scores remain hidden until publication.
- Confirm published result values match gradebook.

## Known Release Notes

- Browser integrity controls are advisory and auditable; they do not fully lock the operating system.
- SQL/C# Run is a safe preview until a production sandbox runner is added.
- SMU production behavior depends on the external academic system configuration.
