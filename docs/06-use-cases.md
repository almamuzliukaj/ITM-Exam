# 6. Use Cases

## UC-01: User Login

**Primary actors:** Admin, Professor, Assistant, Student

**Preconditions:** The user account exists and is active.

**Main flow:**

1. The user opens the login page.
2. The user enters credentials.
3. The backend validates the credentials.
4. The system returns an authentication token and user role.
5. The frontend redirects the user to the correct workspace.

**Postcondition:** The user is authenticated and can access role-appropriate pages.

## UC-02: Admin Creates Academic Structure

**Primary actor:** Admin

**Main flow:**

1. Admin creates or updates an academic term.
2. Admin creates or updates catalog courses.
3. Admin creates course offerings for a term.
4. Admin assigns professor and assistant staff.
5. Admin publishes the offering when ready.

**Postcondition:** The offering is available for staff assignment and enrollment workflows.

## UC-03: Admin Manages Student Eligibility

**Primary actor:** Admin

**Main flow:**

1. Admin creates semester enrollment for a student.
2. Admin links the student to eligible course offerings.
3. Admin marks whether the student is eligible for exams.
4. Admin manages carry-over eligibility when needed.

**Postcondition:** Student exam visibility can be calculated from enrollment records.

## UC-04: Staff Manages Question Bank

**Primary actors:** Professor, Assistant

**Main flow:**

1. Staff opens the question bank for an assigned offering.
2. Staff creates or edits MCQ, text, C#, or SQL questions.
3. The system validates options, correct answers, type, and ownership.
4. The question is stored for that offering context.

**Postcondition:** The question can be used in exam authoring.

## UC-05: Staff Builds Manual Exam

**Primary actors:** Professor, Assistant

**Main flow:**

1. Staff creates an exam draft.
2. Staff opens the exam details page.
3. Staff manually adds questions.
4. The system keeps the exam as draft until it is published.

**Postcondition:** The exam draft contains selected questions and can move toward publication.

## UC-06: Staff Generates Random Exam Questions

**Primary actors:** Professor, Assistant

**Main flow:**

1. Staff selects a draft exam linked to an offering.
2. Staff chooses count and optional question type.
3. The system selects compatible questions from the offering question bank.
4. Staff reviews or replaces generated questions.

**Postcondition:** The draft exam has generated questions ready for review.

## UC-07: Staff Publishes Exam

**Primary actors:** Professor, Assistant

**Main flow:**

1. Staff clicks publish on a draft exam.
2. The backend validates ownership, offering link, and question presence.
3. The system marks the exam as published.

**Alternative flow:** If the exam has no questions or no offering, publication is rejected.

**Postcondition:** Eligible students can see the published exam.

## UC-08: Student Submits Exam Attempt

**Primary actor:** Student

**Main flow:**

1. Student opens an eligible published exam.
2. Student answers available questions.
3. Student submits the attempt.
4. The system stores answers and score details.

**Postcondition:** The attempt is available for grading or result workflows.
