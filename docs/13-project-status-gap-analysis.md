# 13. Project Status and Gap Analysis

## 13.1 Current Implementation Snapshot

The repository currently includes:

- ASP.NET Core Web API with PostgreSQL and EF Core migrations.
- React/Vite frontend with protected role routes.
- JWT authentication and password change.
- Admin user, academic, enrollment, carry-over, SMU, and report pages.
- Professor/assistant offering-scoped question bank and exam workflows.
- Exam details, question attachment, generation, replacement, publish/unpublish.
- Student exam entry, rules screen, timer, autosave, technical answer run preview, and submit.
- Live monitor with access code, approval/reject/revoke/remove, device request, heartbeat, and integrity stream.
- Gradebook with attempt review, AI-assisted suggestions, manual overrides, final score, percentage, grade, CSV export, and result publication.
- Student results page using professor-published grading values.
- Audit logs and institutional UI polish.

## 13.2 Completed Areas

- Authentication and authorization foundation.
- Academic data model and admin management.
- Assigned offering visibility for professors and assistants.
- Student eligibility filtering.
- Question bank and technical question metadata.
- Simplified exam creation and backend metadata validation.
- Question generation cleanup.
- Access-code exam entry and live monitoring.
- Integrity event capture and policy messaging.
- Gradebook review and result publication.
- Student result visibility.
- SMU readiness and sync endpoints.
- English/Albanian UI support.
- README and documentation refresh.

## 13.3 Remaining Risks

- SQL/C# Run is a safe preview, not a production execution sandbox.
- Browser integrity controls are advisory without secure-browser enforcement.
- Some legacy docs/work logs may describe historical sprint states rather than final behavior.
- External SMU production behavior depends on final API availability and institutional rules.
- Frontend bundle size may require code splitting before production deployment.

## 13.4 Recommended Next Steps

1. Run the manual QA guide before professor review.
2. Verify published gradebook results match student results for multiple score totals.
3. Test access-code expiry, approval, revoke, and auto-submit scenarios.
4. Validate question bank SQL/C# metadata and student technical Run previews.
5. Confirm all visible Albanian/English text on key pages.
6. Prepare screenshots for login, admin, professor, assistant, student exam, gradebook, and results.
7. Keep new changes in small branches with professional PR descriptions.
