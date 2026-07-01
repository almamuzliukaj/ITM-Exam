# Professor Assigned Offerings Workspace

## Scope

- Role: `Professor`
- Goal: show only the logged-in professor's assigned course offerings.
- Data source: `GET /api/course-offerings/mine`

## Current Behavior

- Dashboard loads assigned offerings from the backend.
- Offerings are grouped by academic context where available.
- Offering cards show course, term, section, capacity, status, and roster link.
- Professor cannot see unrelated offerings through the professor workspace.
- Assistant-only and admin-only controls are hidden from professor-only views.

## Acceptance Criteria

1. Professor opening `/dashboard` receives assigned offerings from `/api/course-offerings/mine`.
2. Only offerings assigned to the signed-in professor are returned.
3. Empty state appears when there are no assigned offerings.
4. Loading and error states are clear.
5. Professor can navigate from offering context to exams, roster, question bank, monitor, or gradebook where allowed.

## Manual Test Cases

1. Login as a professor with multiple assigned offerings.
   Expected: all assigned offerings are visible.
2. Login as a professor with no assigned offerings.
   Expected: professional empty state appears.
3. Login as professor A while professor B has other offerings.
   Expected: professor A cannot see professor B's offerings.
4. Try opening a URL for an unassigned offering.
   Expected: backend denies access or UI shows a safe error.
