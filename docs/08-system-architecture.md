# 8. System Architecture

## 8.1 Components

- **Frontend:** React and Vite application with role-based routes and reusable UI components.
- **Backend:** ASP.NET Core Web API using controllers, DTOs, models, and Entity Framework Core.
- **Database:** PostgreSQL for users, academic structure, exams, questions, attempts, and enrollments.
- **Authentication:** JWT-based login flow.
- **Documentation:** Markdown files aligned with the Notion sprint board.

## 8.2 Request Flow

1. User logs in through the frontend.
2. Backend validates credentials and returns a token.
3. Frontend sends authenticated API requests.
4. Backend applies role and ownership rules.
5. Data is stored or queried through Entity Framework Core.
6. Frontend renders role-specific workspaces.

## 8.3 Architecture Principles

- Keep admin workflows separate from academic authoring workflows.
- Tie staff access to assigned offerings.
- Tie student access to eligibility records.
- Keep question bank logic separate from normal exam records.
- Prefer explicit validation over implicit UI-only restrictions.
