# 10. UI Pages

## 10.1 Shared Pages

- Login
- Dashboard
- Protected route handling
- Role-specific navigation
- Language switcher

## 10.2 Admin Pages

- User management
- Academic structure management
- Enrollment management
- Course offering and staff assignment management

Admin pages focus on operational setup and do not expose academic exam authoring content.

## 10.3 Professor Pages

- Assigned offerings dashboard
- Exams list
- Exam create page
- Exam details and authoring page
- Question creation page
- Question bank pages

Professor pages focus on assigned offerings, question authoring, exam preparation, and publish readiness.

## 10.4 Assistant Pages

- Assigned support workspace
- Assigned exams view
- Question authoring where allowed
- Draft exam support where allowed

Assistant visibility must remain limited to assigned offerings.

## 10.5 Student Pages

- Eligible exams list
- Exam details
- Attempt submission flow
- Future result visibility pages

Student pages must show only eligible published academic content.

## 10.6 UI Quality Rules

- Every major page should include loading, error, and empty states.
- Buttons should reflect real workflow state, such as draft versus published.
- Draft exam actions should not be shown after publication unless explicitly supported.
- UI labels should use consistent English terminology.
- Demo-critical dashboards should show role-specific readiness checkpoints before final presentation.
