# 2. Scope and Roles

## 2.1 In Scope

- Authentication, current-user loading, password change, and protected routes.
- Admin management of users, terms, courses, offerings, staff assignments, enrollments, carry-over records, SMU readiness, and reports.
- Professor/assistant management of assigned offerings, question bank content, exams, monitoring, grading, and result workflows.
- Student exam eligibility, access-code/approval entry, attempt autosave, technical answer previews, final submit, and published results.
- Audit logging for critical administrative, access, exam, grading, publishing, and integrity actions.
- English/Albanian language switching and institutional UI polish.

## 2.2 Out of Scope or Known Boundary

- Production execution of arbitrary student C# or SQL inside the main API.
- Legal-grade proctoring or full secure-browser enforcement.
- Fully automated final grading without professor/human review.
- Production SMU deployment without the final external SMU contract and schedule.

## 2.3 Role Responsibilities

### Admin

- Manages platform users and account status.
- Manages academic terms, courses, course offerings, staff assignments, enrollments, and carry-over records.
- Reviews SMU integration status and synchronization outputs.
- Uses reports and audit logs for operational oversight.
- Does not own academic grading decisions.

### Professor

- Works inside assigned course offerings.
- Creates exams and manages exam publication.
- Creates or uses question-bank content.
- Generates access codes and manages student admission during exams.
- Reviews submitted attempts, adjusts points, saves final grading, exports CSV, and publishes results.

### Assistant

- Works only inside assigned/support offerings.
- Supports question authoring, exam preparation, monitoring, and review workflows where permitted.
- Cannot bypass professor ownership boundaries for final academic decisions.

### Student

- Views only eligible published exams.
- Starts exams only through approved access-code or staff approval workflow.
- Completes attempts with autosave and integrity monitoring.
- Views only results that have been published by staff.

## 2.4 Core Business Rules

- Draft exams are hidden from students.
- Students must be eligible through enrollment or carry-over rules.
- Staff access is scoped by offering assignment.
- Published student results must match the gradebook-approved score, percentage, and grade.
- Historical attempts, grades, and audit records should be preserved.
