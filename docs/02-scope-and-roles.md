# 2. Scope and Roles

## 2.1 System Scope

The system includes:

- Authentication and role-based authorization.
- Admin management of users, academic terms, courses, course offerings, staff assignments, and student enrollments.
- Professor and assistant workspaces for assigned course offerings.
- Course-based question bank management.
- Manual and random exam authoring.
- Exam publish workflow.
- Student exam visibility based on enrollment eligibility.
- Baseline support for grading, results, carry-over, and security workflows.

## 2.2 Out of Scope for the Current MVP

- Advanced webcam proctoring.
- Production-grade AI grading decisions without human review.
- Full deployment automation and institution-wide scaling.
- Final legal compliance workflows beyond baseline security documentation.

## 2.3 Roles

### Admin

The admin manages platform operations and academic setup:

- Creates and manages users.
- Creates terms, courses, offerings, and enrollments.
- Assigns professors and assistants to offerings.
- Manages account status and operational corrections.
- Does not author academic exam content.

### Professor

The professor manages academic exam content for assigned offerings:

- Views assigned course offerings.
- Manages question bank content.
- Creates draft exams.
- Adds or generates exam questions.
- Publishes exams when ready.
- Reviews grading and result workflows.

### Assistant

The assistant supports assigned offerings:

- Views only assigned offerings.
- Supports question authoring where allowed.
- Supports draft exam preparation where allowed.
- Assists with grading and review workflows according to assigned permissions.

### Student

The student accesses only eligible academic content:

- Views current eligible exams.
- Opens published exams only when eligibility rules allow it.
- Submits answers through the exam workflow.
- Views results only after publication.

## 2.4 Core Business Rules

- Admin access is operational, not academic-content ownership.
- Staff access is limited to assigned course offerings.
- Exam access for students depends on `StudentCourseEnrollment` eligibility.
- Draft exams are not visible to students.
- Published exams should have a linked offering and at least one question.
