# Release QA Evidence

This document records the evidence expected before a demo or release branch is considered ready.

## Evidence Summary

| Area | Evidence to Capture | Status |
| --- | --- | --- |
| Authentication | Login works for Admin, Professor, Assistant, and Student demo accounts. | Pending |
| Admin workspace | Dashboard readiness, SMU source view, users, academic structure, and enrollments load. | Pending |
| Staff workspace | Assigned offerings, exams, question bank, publish readiness, and gradebook load. | Pending |
| Student workspace | Eligibility dashboard, exam attempt, autosave, submit review, and results page load. | Pending |
| Integrity controls | Fullscreen, tab-hidden warning, copy/paste/right-click tracking, and policy state are visible. | Pending |
| Build checks | Frontend and backend build commands are recorded. | Pending |

## Required Screenshots

Capture these screens for final project evidence:

1. Login page.
2. Admin dashboard with University demo readiness.
3. SMU integration readiness page.
4. Enrollment control page showing student eligibility.
5. Professor dashboard with assigned offerings.
6. Exam details page with publish/readiness controls.
7. Student dashboard with eligible courses and exams.
8. Student exam session with journey validation panel.
9. Student results page with pending and published result states.
10. Reports page if reporting is included in the presentation.

## Command Evidence

Record the command output in the pull request notes:

```powershell
npm run build
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj
git status --short --branch
```

Expected:

- Frontend build completes.
- Backend build completes when database-independent build verification is needed.
- Git status is clean after commit.

## Manual QA Flow

### Admin

- Confirm role dashboard opens without blank sections.
- Confirm University demo readiness panel is visible.
- Confirm SMU page explains source-of-truth ownership.
- Confirm enrollment control can show selected student eligibility and carry-over state.

### Professor

- Confirm assigned offerings are scoped to the signed-in professor.
- Confirm exams can be reviewed from the staff workspace.
- Confirm publish readiness, lockdown readiness, gradebook, and result publication are visible.

### Assistant

- Confirm assistant can access only assigned support work.
- Confirm assistant does not see admin-only controls.

### Student

- Confirm eligibility dashboard shows only visible academic content.
- Start an eligible exam.
- Confirm autosave and student journey validation.
- Submit and verify the result queue.
- Confirm scores are hidden until publication.

## Known Release Notes

- Browser-based integrity controls are advisory and auditable; they do not fully lock the operating system.
- SMU sync depends on the external academic-management system being available and configured.
- Sprint branches that depend on earlier unmerged sprint branches should be merged in order.
