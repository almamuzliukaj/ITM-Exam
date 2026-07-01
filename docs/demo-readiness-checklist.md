# Presentation Readiness Checklist

This checklist is used before presenting the ITM Exam system in a university setting. It focuses on real implemented workflows, not removed demo-only panels.

## Goal

The presentation should prove that ITM Exam supports a complete assessment workflow:

- Admin controls academic setup and eligibility.
- Professor prepares, publishes, monitors, grades, and publishes results.
- Assistant supports assigned offerings without admin-only access.
- Student sees only eligible exams and published results.
- Attempts include access control, timer, autosave, integrity signals, technical Run preview, and safe submission.

## Required Test Data

Before presenting, confirm the database has:

- One active admin account.
- One professor assigned to at least one course offering.
- One assistant assigned to an offering if assistant flow is shown.
- One active student with course eligibility.
- One published exam with MCQ, text, and at least one SQL or C# question where possible.
- One submitted attempt available for gradebook review.
- One published result visible to the student.

## Role Walkthrough

### Admin

1. Open dashboard / operational overview.
2. Open user management.
3. Open academic structure and verify terms/courses/offerings.
4. Open enrollments and verify student eligibility.
5. Open SMU page and explain source-of-truth behavior.
6. Open reports if included in the presentation.

### Professor

1. Open dashboard and verify assigned offerings.
2. Open exams and review a draft or published exam.
3. Open question bank and show MCQ/Text/SQL/C# support.
4. Open exam details and show access-code/live monitoring area.
5. Open gradebook and show review/publish workflow.

### Assistant

1. Open dashboard and verify scoped support access.
2. Open assigned exams or question bank.
3. Confirm admin-only controls are not visible.

### Student

1. Open dashboard and available exams.
2. Start an eligible exam.
3. Complete access-code or approval flow.
4. Confirm rules appear before the timer starts.
5. Answer questions, use Run for SQL/C# if available, and submit.
6. Open My Results and confirm only published results appear.

## Pass Criteria

- No role lands on a blank or misleading page.
- Main workflows have understandable loading, empty, error, and success states.
- Student result values match professor-published gradebook values.
- Integrity/access events are visible to staff.
- Build evidence and screenshots are recorded in `release-qa-evidence.md`.
