# Work Log (Albiona)

## 2026-04-27
- Connected professor dashboard to real assigned offerings data using `GET /api/course-offerings/mine`.
- Added professor-only dashboard rendering for assigned offerings with loading, empty, and error states.
- Grouped professor offerings by year and semester in the React dashboard.
- Tightened course offering access rules so professor and assistant views only load assignments for their own role.
- Limited professor-facing offering responses so they do not expose other staff IDs or unrelated staff assignments.
- Added baseline acceptance criteria and manual test cases in `docs/professor-assigned-offerings-workspace.md`.
