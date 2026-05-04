# Professor Assigned Offerings Workspace

## Scope
- Role: `Professor`
- Goal: show only the logged-in professor's assigned course offerings in the dashboard workspace
- Data source: `GET /api/course-offerings/mine`

## Baseline behavior
- Dashboard loads assigned offerings from the backend instead of placeholder content.
- Offerings are grouped by `YearOfStudy` and `SemesterNo`.
- Each card shows course title, term, delivery type, capacity, section, and offering status.
- Professors cannot load unrelated offerings through the professor workspace endpoint.
- Staff-only response for professors does not expose other staff assignments or linked staff IDs.

## Acceptance criteria
1. When a professor opens `/dashboard`, assigned offerings are fetched from `/api/course-offerings/mine`.
2. Only offerings assigned to the logged-in professor are returned and rendered.
3. Offerings are grouped in the UI by year and semester.
4. An empty state is shown when the professor has no assigned offerings.
5. A loading state is shown while the assigned offerings request is in flight.
6. If loading fails, the dashboard shows an error message without breaking the rest of the page.
7. A professor cannot use the professor workspace flow to view assistant-only or other professor offerings.
8. The professor-facing response does not expose `PrimaryProfessorId`, `AssistantId`, or unrelated `StaffAssignments`.

## Manual test cases
1. Login as a professor with two assigned offerings in the same semester:
   Expected: both appear under one year/semester group.
2. Login as a professor with offerings across different semesters:
   Expected: offerings are split into separate grouped sections.
3. Login as a professor with no assigned offerings:
   Expected: empty-state copy is shown.
4. Remove or invalidate the API token, then open the dashboard:
   Expected: assigned offerings fail gracefully and an error message is visible.
5. Login as professor A while professor B has other offerings:
   Expected: professor A cannot see professor B offerings in the dashboard.
6. Inspect the `/api/course-offerings/mine` response for a professor:
   Expected: no unrelated staff assignment objects, `PrimaryProfessorId` is empty, and `AssistantId` is null.
