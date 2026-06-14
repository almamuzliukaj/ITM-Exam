# SMU Integration Plan

This document defines the frontend and contract plan for connecting Online Exam with the external student-management system.

## Source of Truth

SMU should own and provide:

- Students
- Professors and assistants
- Academic terms
- Courses
- Course offerings
- Semester enrollments
- Course enrollments and exam eligibility

Online Exam should continue to own:

- Exam drafts and publishing
- Question banks
- Student attempts and draft answers
- Grading and result publication
- Exam integrity events
- Lockdown readiness and policy actions

## Required SMU Endpoints

Online Exam expects these API areas from SMU:

| Entity | Endpoint | Purpose |
| --- | --- | --- |
| Students | `/api/students` | Student identity, email, student number, active status |
| Staff | `/api/staff` | Professor and assistant identity and role |
| Terms | `/api/terms` | Academic year, semester dates, current term |
| Courses | `/api/courses` | Course catalog, credits, year, semester |
| Offerings | `/api/offerings` | Course offering per term with staff assignment |
| Enrollments | `/api/enrollments` | Student eligibility for course offerings |

## Frontend Transition

Admin screens should move toward read-only or sync-review mode:

- Users: display SMU-synced students and staff; keep manual creation only as fallback.
- Academic structure: display synced terms, courses, and offerings; avoid duplicate manual ownership.
- Enrollments: display synced eligibility; keep carry-over controls only where Online Exam adds exam-specific unlock behavior.
- SMU page: show contract, preview mapped data, and run sync when configured.

## Sprint 23 Frontend Sync Usage

The frontend now treats SMU as the active source of truth when the SMU contract is configured:

- User management locks student, professor, and assistant creation/import/edit actions and keeps the directory as a synced review view.
- Academic structure locks term, course, and offering creation/actions and labels records as SMU-managed.
- Enrollment control locks manual cohort creation, activation, and regularization while leaving Online Exam carry-over unlock controls available.
- Dropdowns and directory views continue to read Online Exam API data, which becomes the synced local copy after the backend SMU sync runs.

## Sprint 22 Definition of Done

- Admin can open an SMU readiness page.
- Admin can see source-of-truth ownership.
- Admin can review expected SMU endpoints.
- Existing admin pages clearly state that manual operations are fallback until SMU sync is active.

## Sprint 23 Definition of Done

- Admin pages visibly switch between fallback mode and SMU-managed mode.
- Manual creation is locked for records owned by SMU once the integration is configured.
- Synced users, courses, terms, offerings, and enrollments remain visible for review and downstream dropdown selection.
- Exam-specific carry-over controls remain available because they belong to Online Exam.
