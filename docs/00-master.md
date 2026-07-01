# ITM Exam Documentation Index

This folder contains the technical and delivery documentation for the ITM Exam online examination system. The documentation is aligned with the current repository state: ASP.NET Core API, React/Vite frontend, PostgreSQL persistence, role-based workspaces, exam delivery, grading, monitoring, SMU readiness, and English/Albanian UI support.

## Core Documents

1. [Introduction](01-introduction.md)
2. [Scope and Roles](02-scope-and-roles.md)
3. [Functional Requirements](03-functional-requirements.md)
4. [Non-Functional Requirements](04-nonfunctional-requirements.md)
5. [User Stories](05-user-stories.md)
6. [Use Cases](06-use-cases.md)
7. [Data Model](07-data-model.md)
8. [System Architecture](08-system-architecture.md)
9. [API Overview](09-api-overview.md)
10. [UI Pages](10-ui-pages.md)
11. [Security and Academic Integrity](11-security-proctoring.md)
12. [Roadmap and MVP](12-roadmap-and-mvp.md)
13. [Project Status and Gap Analysis](13-project-status-gap-analysis.md)
14. [Delivery Plan and Sprint Board](14-delivery-plan.md)

## QA and Operations

- [Manual Test Guide](test-guide.md)
- [Release QA Evidence](release-qa-evidence.md)
- [Demo Operations Runbook](demo-operations-runbook.md)
- [Professional Change Workflow](professional-change-workflow.md)
- [University UI Consistency Review](university-ui-consistency-review.md)

## Feature Notes

- [SMU Integration Plan](smu-integration-plan.md)
- [Student Exam Focus Layout](student-exam-focus-layout.md)
- [Professor Assigned Offerings Workspace](professor-assigned-offerings-workspace.md)
- [Login Acceptance Checklist](acceptance-login.md)
- [Generated Question Review E2E](alma-generated-question-review-e2e.md)
- [Published Result E2E](alma-published-result-e2e.md)

## Work Logs and Contribution Evidence

- [General Work Log](work-log.md)
- [Albiona Work Log](work-log-albiona.md)
- [Alma Work Log](work-log-alma.md)
- [Contribution Analysis](contribution-analysis.md)
- `contribution-commit-inventory.csv`
- `contribution-file-stats.csv`

## Maintenance Rule

When a feature changes, update the related document in the same pull request. Documentation should describe implemented behavior, known boundaries, and manual verification steps. Avoid stale demo-only text, unsupported claims, and references to removed UI panels.
