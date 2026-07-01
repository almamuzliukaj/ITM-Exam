# 7. Data Model

## 7.1 Main Entities

- `User`: account, role, activation state, student number, and identity fields.
- `Term`: academic period.
- `Course`: course catalog record.
- `CourseOffering`: course instance for a term/year/semester/section.
- `CourseOfferingStaffAssignment`: professor/assistant assignment history.
- `SemesterEnrollment`: student's enrollment in a term.
- `StudentCourseEnrollment`: student's eligibility for a course offering.
- `CarryOverCourse`: previous-semester course obligation and assignment.
- `Exam`: exam metadata, offering link, schedule, duration, max points, status, and access settings.
- `Question`: exam question or question-bank item, including options and technical metadata.
- `ExamAttempt`: student attempt, draft/submitted state, answers, scores, grading, publication state.
- `ExamIntegrityEvent`: fullscreen, blur, device, and policy events linked to attempts.
- `AuditLog`: auditable system actions.

## 7.2 Key Relationships

- A `Term` has many `CourseOfferings`.
- A `Course` has many `CourseOfferings`.
- A `CourseOffering` has staff assignments, enrollments, exams, and question-bank questions.
- An `Exam` belongs to a course offering and has many questions and attempts.
- A `StudentCourseEnrollment` controls student exam visibility.
- An `ExamAttempt` belongs to one exam and one student.
- Integrity events and grading records are connected to attempts.

## 7.3 Data Rules

- Referenced academic records should not be hard-deleted.
- Draft exams are hidden from students.
- Question-bank records are reusable and should not appear as ordinary student exams.
- Published result values must be derived from the approved attempt grading state.
- Audit logs should preserve action context for important workflow events.
