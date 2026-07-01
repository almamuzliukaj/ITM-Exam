# 6. Use Cases

## UC-01: Login and Role Routing

**Actors:** Admin, Professor, Assistant, Student

1. User enters email and password.
2. API validates credentials and account status.
3. API returns JWT and user profile.
4. Frontend stores auth data and redirects to the role workspace.

**Result:** User sees only routes allowed by role guards.

## UC-02: Admin Maintains Academic Structure

**Actor:** Admin

1. Admin creates or updates terms and courses.
2. Admin creates course offerings with academic year, semester, year of study, section, and capacity.
3. Admin assigns professor and assistant staff.
4. Admin publishes or closes offerings.

**Result:** Staff and students can use offering-linked workflows.

## UC-03: Admin Manages Eligibility

**Actor:** Admin

1. Admin creates semester enrollment.
2. Admin creates or regularizes student course enrollments.
3. Admin manages carry-over records when needed.
4. System uses these records to calculate student visibility.

**Result:** Students see only eligible exams.

## UC-04: Staff Creates Technical Question

**Actors:** Professor, Assistant

1. Staff opens question bank for an assigned offering.
2. Staff selects MCQ, Text, C#, or SQL.
3. For SQL/C#, staff enters prompt, schema or starter code, expected output, model answer, and grading notes.
4. Backend validates role, offering access, and question type.

**Result:** Question is stored and can be reused in exams.

## UC-05: Professor Creates and Publishes Exam

**Actor:** Professor

1. Professor selects an assigned course offering.
2. System fills academic metadata and generates a title fallback if needed.
3. Professor attaches questions manually or generates a random set.
4. Professor publishes the exam after readiness validation.

**Result:** Eligible students can see the exam.

## UC-06: Student Starts Exam

**Actor:** Student

1. Student opens an eligible published exam.
2. Student enters the active access code or requests staff approval.
3. System displays rules before starting the timer.
4. Student continues into the attempt workspace.

**Result:** Timer starts only after approved entry.

## UC-07: Student Answers and Submits Exam

**Actor:** Student

1. Student answers MCQ/text/SQL/C# questions.
2. Technical Run validates the current draft without submitting.
3. Autosave stores progress.
4. Student submits manually or system auto-submits by policy.

**Result:** Attempt is stored for grading.

## UC-08: Staff Monitors Exam

**Actors:** Professor, Assistant

1. Staff opens live monitor.
2. Staff generates an entry code.
3. Staff reviews student status, approvals, device requests, and integrity events.
4. Staff can allow, reject, revoke, or remove access.

**Result:** Classroom entry and attempt state remain visible.

## UC-09: Professor Grades and Publishes Results

**Actor:** Professor

1. Professor opens gradebook for a submitted attempt.
2. Professor reviews answers, AI suggestions, and integrity flags.
3. Professor adjusts per-question points and feedback.
4. Professor saves review and publishes results.

**Result:** Student sees the published score, percentage, and grade exactly as approved.
