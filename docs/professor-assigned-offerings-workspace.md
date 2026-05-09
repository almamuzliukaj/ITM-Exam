# Professor Assigned Offerings Workspace

## Scope

- Role: `Professor`
- Goal: show only the logged-in professor's assigned course offerings.
- Data source: `GET /api/course-offerings/mine`

## Baseline Behavior

- The dashboard loads assigned offerings from the backend.
- Offerings are grouped by year and semester.
- Each offering card shows course, term, delivery type, capacity, section, and status.
- Professors cannot load unrelated offerings through the professor workspace endpoint.
- Professor-facing responses should not expose unrelated staff assignments.

## Acceptance Criteria

1. A professor opening `/dashboard` receives assigned offerings from `/api/course-offerings/mine`.
2. Only offerings assigned to the logged-in professor are returned.
3. Offerings are grouped by year and semester.
4. An empty state is shown when the professor has no assigned offerings.
5. A loading state is shown while the request is in progress.
6. Errors are shown clearly without breaking the page.
7. The professor cannot see assistant-only or other professor offerings through this workspace.

## Manual Test Cases

1. Login as a professor with multiple assigned offerings in the same semester.
   Expected: offerings appear in one grouped section.
2. Login as a professor with offerings across different semesters.
   Expected: offerings appear in separate sections.
3. Login as a professor with no assigned offerings.
   Expected: empty-state copy appears.
4. Login as professor A while professor B has other offerings.
   Expected: professor A cannot see professor B's offerings.
