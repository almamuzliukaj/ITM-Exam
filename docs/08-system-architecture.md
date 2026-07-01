# 8. System Architecture

## 8.1 Components

- **Frontend:** React/Vite application with role-based routes, shared AppShell, i18n, Monaco Editor, and exam/gradebook workflows.
- **Backend:** ASP.NET Core Web API using controllers, DTOs, services, filters, and Entity Framework Core.
- **Database:** PostgreSQL for identity, academic structure, exams, attempts, grading, integrity events, reports, and audit logs.
- **Authentication:** JWT Bearer authentication with role authorization.
- **External Integration:** SMU integration services for academic data contract, preview, and sync readiness.

## 8.2 Request Flow

1. User logs in through the frontend.
2. Backend validates credentials and returns JWT plus user profile.
3. Frontend sends authenticated API requests.
4. Backend enforces role and ownership rules.
5. EF Core reads/writes PostgreSQL data.
6. Frontend renders role-specific state and actions.

## 8.3 Important Boundaries

- Admin manages academic structure but does not own professor grading decisions.
- Staff exam access is scoped by course offering assignments.
- Student exam visibility is scoped by published exams plus eligibility.
- Technical Run actions are safe previews; real arbitrary code execution requires an isolated runner.
- Result publication is a staff-controlled workflow, not automatic student visibility.

## 8.4 Cross-Cutting Services

- Audit logging for traceability.
- API error response filter for consistent error payloads.
- Student photo storage for protected identity images.
- SMU mapping and sync services.
- Runtime schema compatibility checks during startup.
