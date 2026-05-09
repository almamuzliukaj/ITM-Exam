# 11. Security and Academic Integrity

## 11.1 Current Security Baseline

- Authentication uses token-based access.
- Backend endpoints enforce role-based authorization.
- Staff access is tied to created exams or assigned course offerings.
- Student exam visibility is tied to published exams and eligibility rules.
- Admin access is restricted away from academic authoring where appropriate.

## 11.2 Academic Integrity Rules

- Students should see only eligible published exams.
- Draft exams should never appear in student workspaces.
- Published exams should require a course offering and at least one question.
- Question bank container records should be hidden from normal exam listings.
- Attempts should preserve submitted answers for grading and review.

## 11.3 Future Security Enhancements

The following items are planned for later stabilization work:

- Detailed audit logs for publish, grading, and override actions.
- Exam session monitoring.
- Focus-loss event logging.
- IP, PIN, or QR-based exam entry controls.
- Demo-ready security and test data setup.

## 11.4 Practical Limitations

Browser-based systems cannot fully prevent screenshots or external-device recording. The project should focus on realistic controls, auditability, access boundaries, and clear staff review workflows.
