# 3. Functional Requirements

## 3.1 Authentication and Access

- FR-01: Users can log in with valid credentials and receive a JWT.
- FR-02: The API protects endpoints with authentication and role authorization.
- FR-03: The frontend protects routes with role guards.
- FR-04: Users can change their password from settings.
- FR-05: Inactive or unauthorized users cannot access protected workflows.

## 3.2 Admin and Academic Management

- FR-06: Admin can create, import, update, activate, deactivate, and reset users.
- FR-07: Admin can manage terms, courses, course offerings, and offering lifecycle.
- FR-08: Admin can assign professors and assistants to offerings.
- FR-09: Admin can manage semester enrollments, course enrollments, and carry-over records.
- FR-10: Admin can review SMU contract status, preview data, and run synchronization workflows.

## 3.3 Question Bank

- FR-11: Professors and assistants can manage question-bank items for assigned offerings.
- FR-12: Supported question types are MCQ, Text, CSharp, and SQL.
- FR-13: Technical questions can store schema/starter code, expected output, model answer, and grading notes.
- FR-14: Question-bank questions are reusable and can be attached to exams.

## 3.4 Exam Authoring

- FR-15: Staff can create an exam from a course offering with automatic academic metadata.
- FR-16: Backend can generate a title fallback if the frontend does not provide one.
- FR-17: Staff can attach questions manually or generate a random set from the bank.
- FR-18: Staff can replace draft questions with compatible bank questions.
- FR-19: Exams can be published only after readiness validation.

## 3.5 Student Exam Delivery

- FR-20: Students see only eligible published exams.
- FR-21: Students must pass access-code verification or staff approval before starting.
- FR-22: Exam rules are shown before the timer starts.
- FR-23: Student answers autosave as drafts during the attempt.
- FR-24: SQL/C# Run actions preview the current draft but do not submit the exam.
- FR-25: Manual submit and policy auto-submit store the student's answers for review.

## 3.6 Monitoring and Integrity

- FR-26: Staff can generate short-lived entry codes.
- FR-27: Staff can allow, reject, revoke, or remove student access.
- FR-28: The system records integrity events such as fullscreen/blur/device issues.
- FR-29: Live monitor displays attempt state, integrity stream, and student access status.

## 3.7 Grading and Results

- FR-30: MCQ answers can be scored automatically.
- FR-31: Text and technical answers receive AI-assisted suggestions where available.
- FR-32: Staff can override per-question points and feedback.
- FR-33: Final score, percentage, grade, and pass/fail are calculated from the approved gradebook totals.
- FR-34: Students see results only after staff publication.
- FR-35: Published student results must use the same approved values shown in gradebook.
