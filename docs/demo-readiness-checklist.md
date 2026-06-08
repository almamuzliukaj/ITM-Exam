# University Demo Readiness Checklist

This checklist is used before presenting the Online Exam system in a university setting.

## Demo Goal

The demo should show that Online Exam supports a complete assessment workflow:

- Academic setup is controlled and aligned with SMU-synced data.
- Staff can prepare, publish, and grade exams.
- Students only see eligible published exams.
- Attempts include timer, autosave, integrity warnings, and safe submission.
- Results remain hidden until staff publication.

## Required Demo Data

Before presenting, confirm the local or shared demo database has:

- One active admin account.
- One professor assigned to at least one course offering.
- One assistant assigned to at least one offering when assistant flow is shown.
- One active student with current-term course eligibility.
- One published exam with at least one MCQ and one text or technical question.
- One submitted attempt that can be graded and published.

## Role Walkthrough

### Admin

1. Open dashboard.
2. Confirm the University demo readiness panel is visible.
3. Open SMU sync and confirm source-of-truth ownership is understandable.
4. Open enrollments and confirm student eligibility can be reviewed.

### Professor

1. Open dashboard.
2. Confirm assigned offerings are scoped to the professor.
3. Open exams and review an exam draft or published exam.
4. Open gradebook and confirm grading/result publication workflow.

### Assistant

1. Open dashboard.
2. Confirm assistant sees support offerings and not admin-only controls.
3. Confirm question/exam support remains scoped to assigned offerings.

### Student

1. Open dashboard.
2. Confirm eligible courses and visible exams.
3. Start an exam attempt.
4. Confirm the student journey validation panel, autosave, timer, and submit review.
5. Open results and confirm pending versus published states are clear.

## Pass Criteria

- Every role lands on a clear dashboard.
- No demo-critical screen is blank without an explanation.
- Main workflows have loading, empty, error, and success states.
- The student path from eligibility to results can be explained without hidden steps.
- Screenshots and build evidence are recorded in `docs/release-qa-evidence.md` before final delivery.
