# 14. Delivery Plan and Sprint Board

## 14.1 Purpose

This document summarizes delivery ownership and review expectations for the ITM Exam project. It replaces older sprint-board snapshots that no longer match the current implementation.

## 14.2 Delivery Principles

- Each sprint feature should be delivered in a separate branch.
- Pull requests should contain one coherent feature or fix.
- Generated artifacts must not be committed.
- Documentation and manual testing notes should be updated with the feature.
- Professor-facing and student-facing workflows require extra QA before merge.

## 14.3 Completed Delivery Tracks

| Track | Main Result | Current Status |
| --- | --- | --- |
| Foundation | Auth, roles, API/database baseline, protected routes | Complete |
| Admin Operations | Users, academic structure, enrollments, carry-over, SMU readiness | Complete baseline |
| Professor Workspace | Assigned offerings, exam authoring, question bank, monitor, gradebook | Complete baseline |
| Assistant Workspace | Assigned support offerings, question support, monitoring/review support | Complete baseline |
| Student Workspace | Eligible exams, rules/access entry, attempt, autosave, submit, results | Complete baseline |
| Technical Questions | SQL/C# authoring and student Monaco workspace with safe Run preview | Complete preview; sandbox pending |
| Grading | AI-assisted suggestions, manual override, final grade, result publication | Complete baseline |
| Integrity | Entry code, approvals, heartbeat, fullscreen/blur events, live stream | Complete baseline |
| UI/i18n | Institutional layout, compact UI, English/Albanian coverage | Ongoing polish |
| Documentation | README, core docs, QA guides, runbooks | Ongoing polish |

## 14.4 Current Branching Recommendation

Suggested branch naming:

- `feature/albiona-docs-professional-refresh`
- `feature/albiona-professional-readme`
- `feature/albiona-student-identity-card-polish`
- `feature/<owner>-<short-feature-name>`

Suggested commit style:

- `Refresh project README`
- `Align student result grading totals`
- `Compact admin overview layout`
- `Document exam access workflow`

## 14.5 Pull Request Checklist

Before opening or merging a PR:

- Confirm `git status --short` shows only intended source/doc changes.
- Run the relevant build:
  - Backend: `dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj`
  - Frontend: `cd frontend; npm run build`
- Run the relevant manual scenario from `test-guide.md`.
- Include screenshots for UI changes.
- Mention known limitations when a feature is a safe preview rather than production implementation.
- Confirm no `tmp/`, `publish/`, `artifacts/`, `dist/`, `bin/`, `obj/`, DLLs, or copied appsettings files are staged.

## 14.6 Final Delivery Checklist

- Admin can manage academic setup and users.
- Professor can create, publish, monitor, grade, and publish results.
- Assistant can support assigned workflows without admin-only access.
- Student can enter, complete, submit, and view published results.
- Gradebook and student result percentages match.
- Access code and revoke/auto-submit scenarios are tested.
- English/Albanian switching is checked on major pages.
- README and docs reflect the current application.
