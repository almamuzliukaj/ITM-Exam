# 3. Functional Requirements

## 3.1 Authentication and Authorization

- FR-01: Users can log in with valid credentials.
- FR-02: The API protects endpoints using token-based authentication.
- FR-03: Frontend routes are restricted by role.
- FR-04: Users are redirected to the correct workspace after login.

## 3.2 User and Identity Management

- FR-05: Admin can create and update users.
- FR-06: Admin can activate or deactivate accounts.
- FR-07: User email addresses must be unique.
- FR-08: User roles must be validated by the backend.

## 3.3 Academic Structure

- FR-09: Admin can manage academic terms.
- FR-10: Admin can manage course catalog records.
- FR-11: Admin can create course offerings for terms.
- FR-12: Admin can assign professors and assistants to offerings.
- FR-13: Admin can manage semester and course enrollments.
- FR-14: Carry-over eligibility can be tracked for previous-semester courses.

## 3.4 Question Bank

- FR-15: Professors and assistants can manage questions for assigned offerings.
- FR-16: Questions support MCQ, text, C#, and SQL types.
- FR-17: MCQ questions support answer options and a correct answer.
- FR-18: Question bank records are isolated from normal exam records.

## 3.5 Exam Authoring

- FR-19: Staff can create exam drafts.
- FR-20: Staff can manually attach questions to draft exams.
- FR-21: Staff can generate random exam questions from the offering question bank.
- FR-22: Staff can replace draft exam questions with compatible alternatives.
- FR-23: Exams can be published only when required readiness checks pass.

## 3.6 Student Exam Flow

- FR-24: Students see only eligible published exams.
- FR-25: Students can submit exam attempts.
- FR-26: Submitted answers are stored for grading and result calculation.

## 3.7 Grading and Results

- FR-27: MCQ answers can be scored automatically.
- FR-28: Text, C#, and SQL answers can be reviewed by staff.
- FR-29: Results visibility is controlled and should be published only when approved.
