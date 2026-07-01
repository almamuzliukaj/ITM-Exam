# 4. Non-Functional Requirements

## 4.1 Security

- NFR-01: Passwords must be stored with secure hashing.
- NFR-02: JWT validation must protect API endpoints.
- NFR-03: Role and ownership boundaries must be enforced by the backend, not only by UI.
- NFR-04: Student access must be based on eligibility and exam access state.
- NFR-05: Technical answer execution must not run arbitrary code or SQL inside the main backend.

## 4.2 Reliability

- NFR-06: Student attempts must preserve submitted answers.
- NFR-07: Draft autosave should reduce loss from refresh or navigation.
- NFR-08: Backend validation must reject invalid academic relationships.
- NFR-09: Publish and grade actions must return clear validation errors.

## 4.3 Auditability

- NFR-10: Important actions should write audit logs.
- NFR-11: Published results should remain traceable to an attempt and grading decision.
- NFR-12: Access-code, approval, revoke, integrity, grading, and publish events should be reviewable.

## 4.4 Usability

- NFR-13: Each role should have a focused workspace and compact navigation.
- NFR-14: Loading, empty, success, and error states must be understandable.
- NFR-15: UI text should be professional and consistent in English and Albanian.
- NFR-16: Desktop layouts should remain readable and avoid oversized action areas.

## 4.5 Maintainability

- NFR-17: Controllers, DTOs, services, models, pages, and API clients should remain separated by responsibility.
- NFR-18: Documentation should be updated when implemented behavior changes.
- NFR-19: Generated build artifacts must not be committed to Git.
- NFR-20: Pull requests should be small enough to review and should include testing notes.

## 4.6 Portability

- NFR-21: The system should run locally with Docker PostgreSQL, .NET 8, and Node/npm.
- NFR-22: Environment-specific secrets should be supplied through configuration or environment variables, not hard-coded for production.
