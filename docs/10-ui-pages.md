# 10. UI Pages

## 10.1 Shared UI

- Login without exposed demo preset buttons.
- AppShell with role-aware sidebar navigation.
- Sticky top actions and compact language switcher.
- Settings page for password change.
- Runtime English/Albanian language support.

## 10.2 Admin Pages

- Dashboard / operational overview.
- User management.
- Academic structure management.
- Enrollment management.
- SMU integration readiness.
- Reports.

Admin pages focus on institutional setup, eligibility, reporting, and operational controls.

## 10.3 Professor Pages

- Dashboard with assigned offering visibility.
- Exams list.
- Create/edit exam.
- Exam details and authoring.
- Question bank.
- Offering roster.
- Live monitor.
- Gradebook index and exam gradebook.
- Reports.

Professor pages focus on assigned offerings, assessment authoring, access control, monitoring, review, and publication.

## 10.4 Assistant Pages

- Assigned/support exam workspace.
- Question bank access for assigned contexts.
- Exam support and monitor pages where role rules allow.
- Assistant gradebook/review support where permitted.

Assistant pages must remain scoped to assigned offerings and must not expose admin-only controls.

## 10.5 Student Pages

- Dashboard.
- Available exams.
- Exam briefing/rules/access entry.
- Secure exam session.
- My results.
- Settings.

Student pages must show only eligible exams and published results.

## 10.6 UI Quality Rules

- Use compact institutional layouts.
- Avoid oversized header/action areas on desktop.
- Keep tables scannable with clear empty/loading/error states.
- Keep critical exam actions visible and unambiguous.
- Do not show removed demo-only panels or mock account presets in production-facing UI.
- Keep English and Albanian UI text consistent.
