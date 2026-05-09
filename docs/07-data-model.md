# 7. Data Model

## 7.1 Core Entities

- `User`: platform account with role and activation status.
- `Term`: academic delivery period.
- `Course`: catalog course definition.
- `CourseOffering`: term-specific course delivery with year, semester, section, and staff assignments.
- `CourseOfferingStaffAssignment`: professor or assistant assignment history for an offering.
- `SemesterEnrollment`: student's academic placement for a term.
- `StudentCourseEnrollment`: student's eligibility for a specific offering.
- `CarryOverCourse`: controlled record for previous-semester eligibility.
- `Exam`: assessment record linked to a course offering.
- `Question`: question record linked either to an exam or a question bank container.
- `ExamAttempt`: submitted student attempt and score summary.

## 7.2 Key Relationships

- `Term` has many `CourseOfferings`.
- `Course` has many `CourseOfferings`.
- `CourseOffering` has many staff assignments, enrollments, exams, and question bank records.
- `User` may be an admin, professor, assistant, or student.
- `Exam` has many `Questions`.
- `Exam` has many `ExamAttempts`.
- `StudentCourseEnrollment` controls exam visibility for students.

## 7.3 Data Rules

- Historical academic records should not be hard-deleted when referenced by exams or attempts.
- Staff assignments should preserve history when staff changes.
- Students should not see exams without eligible enrollment.
- Question bank container records should not appear as normal exams.
