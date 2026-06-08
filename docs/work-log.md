# Work Log (Agnesa14)

## 2026-06-08 - Sprint 27
- Added release QA evidence documentation for final demo and release review.
- Added required screenshot, command evidence, role walkthrough, and known release notes.
- Linked the release evidence guide from the master documentation and manual test guide.

## 2026-06-08 - Sprint 26
- Added professional branch, commit, PR, and handoff workflow documentation.
- Added a pull request handoff section to the manual test guide.
- Linked the change workflow from the documentation master index.

## 2026-06-08 - Sprint 25
- Added a university demo readiness panel to role dashboards.
- Documented role-by-role presentation checks in `docs/demo-readiness-checklist.md`.
- Connected the demo readiness checklist from the master docs and manual test guide.

## 2026-05-29 - Sprint 24
- Completed Agnesa's student journey validation pass.
- Added visible validation checkpoints to the student exam session and result pages.
- Expanded the manual test guide with repeatable student attempt, autosave, submit, duplicate-submit, and result visibility checks.

## 2026-05-29
- Completed Sprint 23 frontend task for SMU synced data usage.
- Added source-aware admin behavior for users, academic structure, and enrollment screens.
- Locked manual creation, import, edit, and cohort actions for SMU-owned records when integration is configured.
- Kept synced records visible for review and dropdown selection while preserving Online Exam carry-over controls.

## 2026-05-09
- Completed Sprint 13 baseline task: added AI-assisted text-answer evaluation with required human review.
- Added backend endpoint for text-answer evaluation suggestions and connected it to the staff gradebook workflow.
- Added frontend gradebook review page where staff can request AI suggestions, adjust manual/final scores, save grades, and publish graded results.
- Verified Sprint 13 baseline with `dotnet build` and `npm run build`.
- Updated repository planning documentation to match the Notion task board screenshots.
- Replaced the old six-sprint delivery model with the current Sprint 1 through Sprint 14 board structure.
- Documented Agnesa-owned tasks across Sprint 1 through Sprint 14 in `docs/12-roadmap-and-mvp.md`.
- Noted that Sprint 15 was not visible in the provided screenshots and should be added later if it exists in Notion.
- Confirmed Sprint 12 manual exam authoring work is now represented in Git documentation after implementation.

## 2026-04-03
- Set up local development environment on Windows.
- Added Docker Compose PostgreSQL for local development (onlineexam-postgres).
- Verified DB connectivity with psql SELECT 1.
- Verified backend API runs locally (http://localhost:5045) and Swagger route.
- Added frontend env example (VITE_API_BASE_URL) and acceptance checklist for MVP login.
