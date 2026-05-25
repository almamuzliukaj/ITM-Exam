# Work Log (Albiona)

## 2026-05-25
- Completed Sprint 28 backend exam workspace query refinement.
- Expanded `GET /api/exams` with scoped query filters for assigned offerings, draft/published state, and grading queue visibility.
- Added offering-level access validation so professor and assistant filters cannot target offerings outside their assigned scope.
- Preserved the default exam listing behavior for the current frontend while enabling richer workspace queries for the next UI refinement pass.
- Verified the workspace query changes with a backend build.

## 2026-05-25
- Completed Sprint 27 backend validation-message standardization work.
- Added a shared API error response envelope with consistent `status`, `code`, `message`, `traceId`, and optional `details` fields.
- Standardized controller error outputs globally through a result filter so `BadRequest`, `Conflict`, `NotFound`, `Unauthorized`, and `Forbid` responses now follow the same shape.
- Standardized framework-level auth and route failures by returning the same JSON error format for JWT challenge/forbidden responses, invalid model state, and empty status-code responses.
- Preserved the `message` field expected by the current frontend so existing pages keep working while API error handling becomes more consistent.
- Verified the standardization pass with a backend build.

## 2026-05-25
- Completed Sprint 26 backend dashboard aggregate work for the next delivery cycle.
- Expanded `GET /api/dashboard/summary` so role dashboards expose real aggregate counts for active exams, pending results, eligibility, integrity violations, and carry-over load.
- Kept existing dashboard metrics stable for the current frontend while adding the new aggregate fields needed for dashboard professionalization.
- Corrected dashboard exam aggregation so question bank container records are excluded from normal exam counts, while professor question bank totals still come from the scoped bank containers.
- Verified the dashboard API hardening with a backend build.

## 2026-05-25
- Completed Sprint 14 stabilization hardening around exam publishing and result release controls.
- Closed a backend bypass where draft exams could be created or edited as already published without passing the publish workflow readiness checks.
- Tightened result publication so only graded, still-unpublished submitted attempts can be released, and empty publish actions now fail with a clear validation message.
- Corrected the published-exam update validation message so the draft-only editing rule is explicit in API responses.
- Verified the hardening pass with a backend build.

## 2026-05-04
- Completed Sprint 12 task: built random exam generation and replace-question logic.
- Added backend endpoints to generate random exam questions from the assigned offering question bank and replace existing draft questions with compatible alternatives.
- Reused question bank filtering by offering and type so draft exam generation works only inside the correct assigned course context.
- Added draft exam authoring UI controls for random generation by count and type, plus per-question replacement from the same bank.
- Extended exam question responses so authoring screens can show richer question metadata during generation and replacement.
- Verified the Sprint 12 flow with `dotnet build`, `npm run lint`, and `npm run build`.

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
