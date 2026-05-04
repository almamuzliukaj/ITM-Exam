# Work Log (Albiona)

## 2026-05-04
- Completed Sprint 11 task: built the course-based question bank flow for assigned course offerings.
- Added dedicated backend question bank APIs for professors and assistants to create, list, edit, and delete MCQ and Text questions inside their assigned offering context.
- Added support for MCQ option storage and validation, including correct-answer checks and offering-scoped access rules.
- Added question bank frontend pages with assigned offering selection, filters, list view, create/edit form, and delete flow.
- Added navigation, routes, translations, and UI styling for the new question bank workspace.
- Isolated question bank container records from the normal exams workspace so they do not appear as regular exams.
- Verified the implementation with `dotnet build`, `npm run lint`, and `npm run build`.

## 2026-04-27
- Connected professor dashboard to real assigned offerings data using `GET /api/course-offerings/mine`.
- Added professor-only dashboard rendering for assigned offerings with loading, empty, and error states.
- Grouped professor offerings by year and semester in the React dashboard.
- Tightened course offering access rules so professor and assistant views only load assignments for their own role.
- Limited professor-facing offering responses so they do not expose other staff IDs or unrelated staff assignments.
- Added baseline acceptance criteria and manual test cases in `docs/professor-assigned-offerings-workspace.md`.
