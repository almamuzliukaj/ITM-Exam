# 13. Project Status and Gap Analysis

## 13.1 Current Implementation Snapshot

The repository currently includes:

- JWT authentication and role-based frontend routing.
- Admin user management.
- Academic terms, courses, course offerings, staff assignments, and enrollment foundations.
- Professor and assistant assigned-offering visibility.
- Question bank APIs and frontend pages.
- Monaco-based technical question authoring.
- Manual exam draft creation and question attachment.
- Random question generation and replacement from the offering question bank.
- Exam publish workflow with readiness checks.
- Student visibility rules for eligible published exams.
- Student attempt screen with draft save, restore after refresh, final submit, and duplicate-submit protection.
- Grading and result publication flow.
- Student result visibility page with pending and published states.
- Baseline exam-integrity event tracking and lockdown readiness configuration.
- SMU integration contract, readiness page, and source-aware admin review mode for synced academic data.
- Student journey validation checkpoints for attempt readiness, autosave, submit safety, and result visibility.
- Role dashboard demo-readiness checkpoints for university presentation flow.

## 13.2 Completed or Mostly Completed Areas

- Sprint 1 through Sprint 10 baseline planning and implementation areas are represented in the repository.
- Sprint 11 has implemented assistant workspace, question bank, and code authoring foundations.
- Sprint 12 has implemented manual exam authoring, random generation, exam delivery, and integration foundations.
- Sprint 13 has implemented AI-assisted review and result publication foundations.
- Sprint 14 has implemented carry-over progression foundation, security stabilization, and final delivery planning.
- Sprint 15 through Sprint 17 have implemented the student exam session UI, autosave safety, and student result visibility for Agnesa's track.
- Sprint 22 through Sprint 23 have implemented SMU readiness and frontend source-of-truth handling for Agnesa's admin screens.
- Sprint 24 has added a repeatable student journey validation guide and visible frontend checkpoints for demo testing.
- Sprint 25 has added role-based university demo readiness checkpoints and a presentation checklist.

## 13.3 Remaining Risks

- Sprint statuses in Notion may not always match implementation status after recent commits.
- Text/code/SQL grading still needs additional polish and edge-case review.
- Integrity features currently capture and display baseline events; stronger policy enforcement and Safe Exam Browser integration remain future work.
- SMU integration still depends on final external API availability and team agreement on production sync scheduling.

## 13.4 Recommended Next Steps

1. Keep each sprint on its own branch and pull request.
2. Use the manual test guide before opening or merging demo-critical pull requests.
3. Continue Sprint 19 with frontend integrity guard improvements.
4. Validate the SMU sync with the external academic-management project before fully removing fallback admin operations.
