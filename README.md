# ITM Exam - Online Examination System

ITM Exam is a faculty-focused online examination platform for managing academic structure, question banks, exam delivery, integrity monitoring, grading, and published student results. The system is designed around real university workflows: administrators manage academic data, professors own assessment decisions, assistants support assigned offerings, and students access only the exams and results they are eligible to see.

The application is a full-stack system built with an ASP.NET Core Web API backend, a React/Vite frontend, PostgreSQL persistence, JWT authentication, Entity Framework Core migrations, and role-based workspaces for Admin, Professor, Assistant, and Student users.

## Current Capability Summary

- Role-based authentication and protected navigation for Admin, Professor, Assistant, and Student accounts.
- Academic structure management for terms, courses, course offerings, staff assignments, semester enrollments, course enrollments, and carry-over courses.
- SMU integration readiness with contract review, payload preview, synchronization endpoints, and clear ownership rules for academic data.
- Simplified exam creation from assigned course offerings, with automatic academic metadata and backend title fallback.
- Question bank support for MCQ, text, C#, and SQL questions, including technical metadata such as schema, starter code, expected output, model answer, and grading notes.
- Exam authoring, manual question attachment, random question generation, publish/unpublish workflow, and readiness checks.
- Student exam entry with access code or staff approval, rules/briefing screen, timer, autosave, fullscreen guidance, integrity warnings, and final submission.
- Technical answer workspace for SQL and C# with Monaco Editor and safe run previews that do not execute arbitrary code in the main backend.
- Live exam monitor for professors and assistants with access-code generation, student admission actions, device-change requests, integrity stream, and attempt state visibility.
- Gradebook workflow with attempt review, AI-assisted grading suggestions, manual overrides, per-question scoring, final score calculation, CSV export, and published results.
- Student results page that shows only published results and uses the same grading totals and percentages approved by the professor.
- Institutional UI shell with compact role dashboards, sticky actions, English/Albanian language switching, and responsive desktop polish.
- Audit logging for important administrative, access, exam, attempt, grading, publishing, and integrity actions.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Backend API | ASP.NET Core Web API, .NET 8 |
| Database | PostgreSQL 16 |
| ORM | Entity Framework Core with Npgsql |
| Authentication | JWT Bearer Authentication |
| Frontend | React 19, Vite 8, React Router |
| Editors | Monaco Editor for SQL and C# authoring/answering |
| Internationalization | i18next, react-i18next, runtime Albanian translation support |
| API Documentation | Swagger / OpenAPI in development |
| Local Infrastructure | Docker Compose |

## Repository Structure

```text
Online-Exam/
+-- backend/
|   +-- OnlineExam.Api/
|       +-- Controllers/       HTTP API endpoints
|       +-- Data/              EF Core DbContext
|       +-- DTOs/              Request/response contracts
|       +-- Exceptions/        API exception types
|       +-- Filters/           API error response filters
|       +-- Migrations/        EF Core schema migrations
|       +-- Models/            Domain entities
|       +-- Services/          Audit, SMU sync, student photo storage
+-- frontend/
|   +-- public/                Static frontend assets
|   +-- src/
|       +-- components/        Shared shell, layout, identity, translation components
|       +-- hooks/             Current-user, SMU status, face-proctoring helpers
|       +-- lib/               API clients, auth, permissions, i18n
|       +-- pages/             Admin, exam, question bank, reports, settings pages
|       +-- routes/            Protected routes and role guards
|       +-- styles/            Global application styling
+-- docs/                      Requirements, architecture, QA, roadmap, work logs
+-- scripts/                   Local backend start/stop helpers
+-- docker-compose.yml         Local PostgreSQL container
+-- README.md                  Project overview and setup guide
```

## Role Workspaces

### Admin

Admins manage the institutional configuration of the system. The admin workspace includes user management, academic structure, enrollment control, SMU integration readiness, and institutional reports.

Key capabilities:

- Create, import, activate/deactivate, edit, and reset users.
- Manage terms, courses, course offerings, and offering lifecycle.
- Assign professors and assistants to course offerings.
- Manage semester enrollments, course enrollments, and carry-over course records.
- Review SMU contract status, preview external data, and run sync workflows.
- Access reports for participation, publish status, integrity, and outcomes.

### Professor

Professors own exam creation, publication, monitoring, grading, and result publication for their assigned offerings.

Key capabilities:

- Create exams from assigned course offerings with automatic metadata.
- Add questions manually or from the course question bank.
- Generate random question sets from the bank.
- Publish/unpublish exams after readiness checks.
- Generate 3-minute access codes and approve/reject/revoke student access.
- Monitor active attempts and integrity events.
- Review submitted attempts, adjust per-question points, save human grading, export CSV, and publish final results.

### Assistant

Assistants support assigned offerings while preserving professor ownership of final academic decisions.

Key capabilities:

- View assigned/support offerings.
- Create or manage questions in the question bank for assigned contexts.
- Support exam question authoring and monitoring flows.
- Access assistant gradebook/review workspaces where allowed by role rules.
- Cannot bypass professor ownership rules for final grading/publication where those rules are enforced.

### Student

Students see only eligible exams and published results.

Key capabilities:

- View available exams based on active course enrollment and publication rules.
- Enter an exam through access code verification or staff approval.
- Read rules before starting the timer.
- Answer MCQ, text, SQL, and C# questions.
- Use Run Query / Run Code previews for technical questions without submitting the exam.
- Autosave drafts during an attempt.
- Submit manually or be auto-submitted by policy events.
- View only published grades and feedback in My Results.

## Core Backend API Areas

Backend controllers are located in `backend/OnlineExam.Api/Controllers`.

| Controller | Area |
| --- | --- |
| `AuthController` | Login, current user, password change |
| `UsersController` | User CRUD, CSV import, activation, password reset |
| `TermsController` | Academic term lifecycle |
| `CoursesController` | Course catalog |
| `CourseOfferingsController` | Course offering lifecycle and rosters |
| `CourseOfferingStaffAssignmentsController` | Professor/assistant assignments |
| `SemesterEnrollmentsController` | Student semester enrollment |
| `StudentCourseEnrollmentsController` | Course eligibility and enrollment regularization |
| `CarryOversController` | Carry-over course assignment and lifecycle |
| `QuestionsController` | Exam questions and course question bank |
| `ExamsController` | Exams, attempts, access codes, monitoring, grading, AI suggestions, results |
| `ReportsController` | Institutional reports |
| `AuditLogsController` | Auditable action history |
| `StudentIdentitiesController` | Student identity and protected photo retrieval |
| `SmuIntegrationController` | SMU contract, preview, and sync operations |

Swagger is available in development mode after the backend starts.

## Main Domain Model

The database model is configured in:

```text
backend/OnlineExam.Api/Data/AppDbContext.cs
```

Important entities include:

| Entity | Purpose |
| --- | --- |
| `User` | Admin, professor, assistant, and student accounts |
| `Term` | Academic terms/semesters |
| `Course` | Course catalog records |
| `CourseOffering` | A course instance in a term, year, semester, and section |
| `CourseOfferingStaffAssignment` | Teaching team assignments |
| `SemesterEnrollment` | Student enrollment in an academic term |
| `StudentCourseEnrollment` | Student eligibility for a specific offering |
| `CarryOverCourse` | Courses assigned as carry-over obligations |
| `Exam` | Exam definition, schedule, access policy, publication state |
| `Question` | Exam and question-bank items |
| `ExamAttempt` | Student attempt state, answers, scores, grading, publication |
| `ExamIntegrityEvent` | Integrity/proctoring events for attempts |
| `AuditLog` | System audit trail |

EF Core migrations are stored in:

```text
backend/OnlineExam.Api/Migrations
```

## Exam and Grading Workflow

1. A professor or assistant creates questions in the question bank for an assigned course offering.
2. A professor creates an exam from an offering. Academic year, semester, and title metadata are filled from the offering where possible.
3. Questions are attached manually or generated from the question bank.
4. The professor publishes the exam once the setup is ready.
5. Students enter using a short-lived access code or professor/assistant approval.
6. The student completes the exam with autosave and integrity monitoring.
7. Submitted attempts appear in the gradebook.
8. AI-assisted suggestions are generated for text and technical questions, but the professor can override every score.
9. The professor saves the human review and publishes graded results.
10. Students see only the published result values approved in the gradebook.

## Technical SQL and C# Questions

Technical question support exists in both authoring and student attempt flows.

Professor/assistant authoring fields:

- Prompt
- SQL schema or C# starter code
- Expected output
- Model answer
- Grading notes

Student attempt workspace:

- Monaco Editor for SQL and C#
- Run Query / Run Code button
- Output, error, status, test summary, and run number display
- Autosave of the current answer draft

Security note: the current implementation provides safe run previews and audit logging. It does not execute arbitrary student SQL or C# directly inside the main backend or against the application database. Production-grade execution should be moved to an isolated sandbox/container with strict CPU, memory, network, filesystem, environment, and timeout limits.

## Integrity and Access Control

The exam delivery flow includes:

- Short-lived entry codes for classroom admission.
- Manual allow/reject/revoke actions from the live monitor.
- Device-change request handling.
- Fullscreen and tab/blur integrity events.
- Face/camera status hooks on the frontend.
- Attempt heartbeat and monitor refresh.
- Auto-submit policy behavior for high-risk sessions.
- Audit logs for access and integrity actions.

## Internationalization

The frontend supports English and Albanian language switching. The language preference is persisted locally and applied through i18next plus a runtime Albanian translation layer for remaining static UI text.

## Local Development Setup

### Prerequisites

- .NET 8 SDK
- Node.js and npm
- Docker Desktop
- Optional: pgAdmin, DBeaver, or another PostgreSQL client

### 1. Start PostgreSQL

From the project root:

```powershell
docker compose up -d db
```

Database defaults:

```text
Host: localhost
Port: 5432
Database: onlineexam
Username: onlineexam
Password: onlineexam
Container: onlineexam-postgres
```

To verify the container:

```powershell
docker ps
```

To open psql:

```powershell
docker exec -it onlineexam-postgres psql -U onlineexam -d onlineexam
```

### 2. Run the Backend

Recommended from the project root:

```powershell
.\scripts\start-backend.ps1
```

Manual option:

```powershell
cd backend\OnlineExam.Api
dotnet restore
dotnet run
```

The backend applies pending EF Core migrations during startup. In development, demo users and stable academic seed data can be created by startup seeding rules.

To stop the backend helper process:

```powershell
.\scripts\stop-backend.ps1
```

### 3. Run the Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5045
Swagger:  http://localhost:5045/swagger
```

## Development Accounts

In development, the backend can seed the following baseline accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@onlineexam.com` | `Password123!` |
| Professor | `prof@onlineexam.com` | `Password123!` |
| Assistant | `assistant@onlineexam.com` | `Password123!` |
| Student | `student@onlineexam.com` | `Password123!` |

The login page does not expose demo preset buttons in the UI. Use these accounts manually only for local development and testing.

## Configuration Notes

Backend configuration is read from `appsettings.json`, `appsettings.Development.json`, user secrets, or environment variables.

Important settings:

| Setting | Purpose |
| --- | --- |
| `ConnectionStrings:DefaultConnection` | PostgreSQL connection string |
| `Jwt:Key` | JWT signing key |
| `Jwt:Issuer` | JWT issuer/audience |
| `AllowedOrigins` | Comma-separated frontend origins for CORS |
| `SeedDemoData` | Enables development seed data when true |
| `SmuIntegration:*` | External SMU integration options |

Generated build/publish artifacts should not be committed. Keep `bin/`, `obj/`, `dist/`, `tmp/backend-build/`, publish output, and dependency folders out of Git.

## Useful Commands

Backend build:

```powershell
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj
```

If the API executable is locked because a backend instance is already running, use a temporary output folder:

```powershell
$buildOut = Join-Path $env:TEMP 'OnlineExamApiBuildCheck'
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj -o $buildOut
```

Frontend build:

```powershell
cd frontend
npm run build
```

Frontend lint:

```powershell
cd frontend
npm run lint
```

Database reset for local development:

```powershell
docker compose down
docker rm -f onlineexam-postgres
docker volume rm online-exam_onlineexam_db
docker compose up -d db
```

## Manual QA Checklist

Recommended smoke test after major changes:

- Login as Admin, Professor, Assistant, and Student.
- Verify role-specific navigation and protected routes.
- Create or review academic terms, courses, offerings, and assignments.
- Create a question bank item for MCQ, text, C#, and SQL.
- Create an exam from an offering and confirm metadata is filled correctly.
- Attach/generate questions and publish the exam.
- Generate an access code from the live monitor.
- Enter as a student, verify code/approval behavior, answer questions, run technical previews, and submit.
- Review the attempt in gradebook, adjust points, save review, and publish results.
- Confirm the student result matches the professor-published score, percentage, and grade.
- Check reports and audit logs for expected records.

## Known Boundaries and Future Work

- Technical answer execution currently uses safe previews; a production sandbox/container runner is still required for real SQL/C# execution.
- Integrity controls are advisory and event-based; hard lockdown should be integrated with a secure browser/kiosk solution if required.
- SMU integration support exists at the contract/sync workflow level; production mapping depends on the external SMU API and data ownership rules.
- The runtime translation layer improves coverage, but long-term i18n should continue moving static text into structured translation keys.
- Large frontend bundles may benefit from future route-level code splitting.

## Documentation

Additional documentation is available in `docs/`.

Recommended starting points:

- [System Architecture](docs/08-system-architecture.md)
- [API Overview](docs/09-api-overview.md)
- [Data Model](docs/07-data-model.md)
- [Functional Requirements](docs/03-functional-requirements.md)
- [Security and Proctoring](docs/11-security-proctoring.md)
- [Manual Test Guide](docs/test-guide.md)
- [Project Status and Gap Analysis](docs/13-project-status-gap-analysis.md)
- [SMU Integration Plan](docs/smu-integration-plan.md)
- [Release QA Evidence](docs/release-qa-evidence.md)

## Team

- Agnesa
- Albiona
- Alma
