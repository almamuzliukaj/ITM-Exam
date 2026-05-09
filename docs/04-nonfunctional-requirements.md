# 4. Non-Functional Requirements

## 4.1 Security

- NFR-01: Passwords must be stored using secure hashing.
- NFR-02: Protected API endpoints must require authentication.
- NFR-03: Authorization must enforce role and ownership boundaries.
- NFR-04: Admin access must not expose academic exam content unless explicitly required.

## 4.2 Academic Integrity

- NFR-05: Exam visibility must depend on enrollment and eligibility.
- NFR-06: Published exam content should be protected from unintended changes.
- NFR-07: Important academic actions should be auditable where possible.

## 4.3 Reliability

- NFR-08: Exam and question workflows should fail with clear validation messages.
- NFR-09: Student submissions must not be lost after final submit.
- NFR-10: Backend validation must prevent invalid academic relationships.

## 4.4 Usability

- NFR-11: The UI must be role-aware and easy to navigate.
- NFR-12: Empty, loading, and error states must be understandable.
- NFR-13: Shared screens should use consistent English terminology.

## 4.5 Maintainability

- NFR-14: The codebase should keep controllers, DTOs, models, and UI pages organized by responsibility.
- NFR-15: Sprint work should be documented in the repository and linked to the Notion board structure.
- NFR-16: Git commits should be small enough to review and tied to clear feature work.

## 4.6 Portability

- NFR-17: The system should run locally with the documented backend, frontend, and database setup.
- NFR-18: Environment-specific settings should remain outside source-controlled secrets.
