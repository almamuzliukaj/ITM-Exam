# Online Exam System

Online Exam System is a faculty-focused web application for managing academic courses, role-based users, exam creation, question management, student eligibility, and assessment workflows.

The project is built as a full-stack system with an ASP.NET Core Web API backend, a React frontend, PostgreSQL persistence, JWT authentication, and a growing academic data model that supports administrators, professors, assistants, and students.

## Project Goals

- Provide a centralized platform for managing online exams in a faculty environment.
- Support role-based access for Admins, Professors, Assistants, and Students.
- Model real academic structure: terms, courses, course offerings, staff assignments, enrollments, and carry-over courses.
- Allow professors and assistants to create exams and questions for assigned course offerings.
- Prepare the foundation for secure student exam attempts, grading, result publishing, and proctoring features.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Backend | ASP.NET Core Web API (.NET 8) |
| Database | PostgreSQL |
| ORM | Entity Framework Core |
| Authentication | JWT Bearer Authentication |
| Frontend | React + Vite |
| API Documentation | Swagger / OpenAPI |
| Local Infrastructure | Docker Compose |

## Current Status

The repository currently contains a functional backend foundation, a working React frontend shell, database migrations, and detailed planning documentation.

Implemented areas:

- JWT login flow.
- Role-based authorization foundation.
- Admin user creation and user management.
- Terms, courses, and course offerings.
- Professor and assistant assignment to course offerings.
- Student semester enrollment and course enrollment.
- Carry-over course model.
- Exam CRUD.
- Question CRUD.
- Basic student exam attempt model.
- React login, protected routes, dashboards, admin pages, and exam pages.

Planned or partially implemented areas:

- Complete question bank per course.
- Exam generation from question bank rules.
- Full student exam-taking flow.
- Auto-save and final submission workflow.
- MCQ/code/text grading pipeline.
- Result publishing.
- Security and proctoring features.

## Repository Structure

```text
Online-Exam/
+-- backend/
|   +-- OnlineExam.Api/        ASP.NET Core Web API
|       +-- Controllers/       API endpoints
|       +-- Data/              EF Core DbContext
|       +-- DTOs/              Request/response DTOs
|       +-- Migrations/        Database schema migrations
|       +-- Models/            Entity models / database tables
+-- frontend/                  React + Vite application
|   +-- public/                Static assets
|   +-- src/                   Pages, routes, components, API clients
+-- docs/                      Requirements, architecture, planning docs
+-- docker-compose.yml         Local PostgreSQL setup
+-- README.md                  Project overview
```

## Main Domain Model

The database is managed with Entity Framework Core. Table definitions are represented by model classes and registered in:

```text
backend/OnlineExam.Api/Data/AppDbContext.cs
```

Main tables:

| Table | Purpose |
| --- | --- |
| `Users` | Admins, professors, assistants, and students |
| `Terms` | Academic terms or semesters |
| `Courses` | Course catalog |
| `CourseOfferings` | A course opened in a specific term, section, year, and semester |
| `CourseOfferingStaffAssignments` | Professor/assistant assignments |
| `SemesterEnrollments` | Student enrollment into a semester |
| `StudentCourseEnrollments` | Student eligibility for a specific course offering |
| `CarryOverCourses` | Courses a student must retake or carry over |
| `Exams` | Exams created for course offerings |
| `Questions` | Questions attached to exams |
| `ExamAttempts` | Student submissions and scores |

Database migrations are stored in:

```text
backend/OnlineExam.Api/Migrations
```

## Backend API Areas

Backend controllers are located in:

```text
backend/OnlineExam.Api/Controllers
```

Current controller areas:

- `AuthController` - login and token generation.
- `UsersController` - user creation, import, status, and management.
- `TermsController` - academic term management.
- `CoursesController` - course catalog management.
- `CourseOfferingsController` - course offerings per term.
- `CourseOfferingStaffAssignmentsController` - professor/assistant assignment.
- `SemesterEnrollmentsController` - semester enrollment.
- `StudentCourseEnrollmentsController` - course enrollment and eligibility.
- `CarryOversController` - carry-over course handling.
- `ExamsController` - exam creation and management.
- `QuestionsController` - question creation and management.

Swagger is available when the backend runs in development mode.

## Frontend Areas

The frontend source code is located in:

```text
frontend/src
```

Important areas:

- `pages/Login.jsx` - login page.
- `pages/Dashboard.jsx` - main dashboard.
- `pages/admin/` - admin user and academic structure pages.
- `pages/exams/` - exam list, creation, details, and question creation.
- `routes/` - protected routes and role guards.
- `lib/` - API clients and authentication helpers.
- `components/` - shared application components.

## Prerequisites

Install the following before running the project locally:

- .NET 8 SDK
- Node.js and npm
- Docker Desktop
- Optional: pgAdmin or DBeaver for viewing the PostgreSQL database visually

## Local Setup

### 1. Start PostgreSQL

From the project root:

```powershell
cd C:\Users\24538\OneDrive\Desktop\Online-Exam
docker compose up -d db
```

Database connection details:

```text
Host: localhost
Port: 5432
Database: onlineexam
Username: onlineexam
Password: onlineexam
Container: onlineexam-postgres
```

To check the container:

```powershell
docker ps
```

To open PostgreSQL from the terminal:

```powershell
docker exec -it onlineexam-postgres psql -U onlineexam -d onlineexam
```

Then list tables:

```sql
\dt
```

### 2. Run the Backend

```powershell
cd backend\OnlineExam.Api
dotnet restore
dotnet run
```

The backend automatically applies pending EF Core migrations on startup.

### 3. Run the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend usually runs on:

```text
http://localhost:5173
```

## Demo Users

Seed users are configured in `AppDbContext.cs`.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@onlineexam.com` | `Password123!` |
| Professor | `prof@onlineexam.com` | `Password123!` |
| Student | `student@onlineexam.com` | `Password123!` |

Note: if seeded-user login fails, check password hashing behavior in `AuthController.cs` and seeded password values in `AppDbContext.cs`.

## Core Academic Rules

- There is no public signup.
- Admins create and manage users.
- Admins manage terms, courses, course offerings, staff assignments, and enrollments.
- Professors and assistants work inside assigned course offerings.
- Students should only see exams for courses where they are eligible.
- Carry-over courses are tracked separately from regular semester enrollment.
- Exam results should only be visible to students after publication.
- Historical academic data should generally be preserved instead of hard-deleted.

## Development Notes

- The backend uses Entity Framework Core migrations for schema changes.
- The app currently runs migrations automatically during backend startup.
- The frontend communicates with the backend through API helper files in `frontend/src/lib`.
- CORS is configured for local Vite ports in `Program.cs`.
- Swagger is enabled in development mode for testing API endpoints.

## Roadmap

Near-term priorities:

1. Stabilize authentication and seeded demo users.
2. Finish admin onboarding and bulk user import workflow.
3. Improve role-specific dashboards.
4. Build a course-based question bank with difficulty levels.
5. Add MCQ, text, C#, and SQL question support.
6. Build exam generation and publishing workflow.
7. Implement student exam session, timer, submission, and scoring.
8. Add result publishing and student result visibility rules.
9. Add security/proctoring features such as QR/PIN entry, focus tracking, and audit logs.

## Documentation

Detailed project documentation is available in `docs/`.

Recommended starting points:

- [Project Status and Gap Analysis](docs/13-project-status-gap-analysis.md)
- [Roadmap and MVP](docs/12-roadmap-and-mvp.md)
- [System Architecture](docs/08-system-architecture.md)
- [API Overview](docs/09-api-overview.md)
- [Data Model](docs/07-data-model.md)
- [Functional Requirements](docs/03-functional-requirements.md)
- [Nonfunctional Requirements](docs/04-nonfunctional-requirements.md)

## Team

- Agnesa
- Albiona
- Alma
