# 12. Roadmap and MVP

## 12.1 Implemented MVP Areas

The current repository includes the main MVP workflows:

- Authentication and role-based routing.
- Admin user and academic management.
- Course offerings, staff assignments, enrollments, and carry-over records.
- SMU integration readiness and sync workflow.
- Question bank for MCQ, Text, C#, and SQL.
- Simplified exam creation from offerings.
- Manual question attachment and random question generation.
- Exam publish/unpublish workflow.
- Student access-code/approval entry.
- Student attempt autosave, technical run preview, and submit.
- Live monitor and integrity stream.
- Gradebook review, AI suggestions, manual override, CSV export, and result publication.
- Student published results.
- Reports, audit logs, i18n, and institutional UI polish.

## 12.2 Sprint Grouping

The project delivery can be understood in these implementation groups:

| Group | Focus | Status |
| --- | --- | --- |
| Foundation | Auth, app shell, role guards, API/database baseline | Implemented |
| Academic Operations | Users, terms, courses, offerings, staff, enrollments, carry-over | Implemented |
| Exam Authoring | Question bank, technical questions, exam creation, generation, publish | Implemented |
| Exam Delivery | Access code, rules, timer, autosave, technical run, submit | Implemented with sandbox boundary |
| Monitoring and Integrity | Live monitor, access actions, integrity events, heartbeat | Implemented baseline |
| Grading and Results | Gradebook, AI suggestions, override, publish, student results | Implemented |
| Polish and Documentation | i18n, compact UI, README/docs, QA evidence | In progress |

## 12.3 Remaining Roadmap

- Replace safe SQL/C# run previews with a production sandbox runner.
- Continue moving runtime-translated strings into structured i18n keys.
- Add route-level code splitting for frontend bundle size.
- Finalize external SMU mapping after production contract confirmation.
- Add deeper automated backend/frontend tests around access, grading, and result publication.
- Prepare deployment documentation for the selected hosting environment.

## 12.4 MVP Definition of Done

The MVP is ready for academic review when:

- All four roles can complete their primary workflow.
- Student exam entry and submit are stable.
- Gradebook result publication matches student-visible results.
- Integrity events are visible to staff.
- Documentation and manual QA evidence match the current system.
