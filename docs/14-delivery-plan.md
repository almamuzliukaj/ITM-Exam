# 14. Delivery Plan and Notion Sprint Board

This document replaces the older delivery draft. The current project tracking source is the Notion task board shared by the team, with work organized from Sprint 1 through Sprint 14.

Note: the screenshots reviewed for this update show Sprint 1 through Sprint 14. Sprint 15 was not visible in the provided screenshots.

## Sprint 1 - Project Foundation

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Project Foundation | High | Done | Project vision, scope, and main user roles are clearly documented. | Document created, reviewed, and added to project workspace. |
| Albiona | Requirements | High | Done | Role permissions and system business rules are documented. | Requirements page updated and aligned with system logic. |
| Alma | Frontend Architecture | High | Done | Main UI structure and role-based dashboard flow are defined. | Architecture notes and UI flow documented. |

## Sprint 2 - Requirements and UX Planning

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Requirements Engineering | High | Done | Main system requirements and user stories are clearly documented for all four roles. | Requirements document updated and linked to project scope. |
| Albiona | Access Control Design | High | Done | Permissions and ownership boundaries are defined for admin, professor, assistant, and student. | Permissions matrix documented and aligned with business rules. |
| Alma | UX Planning | High | Done | Main navigation and user journeys are defined for each role. | User flow and navigation structure documented in project workspace. |

## Sprint 3 - Architecture and Interface Design

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Architecture | High | Done | System modules and architectural boundaries are clearly defined. | Architecture document created and aligned with project scope. |
| Albiona | Database Design | High | Done | Core entities and relationships are identified for users, courses, offerings, exams, and results. | Database design and ERD notes added to project documentation. |
| Alma | Interface Design | High | Done | Role-specific interface structure is planned for admin, professor, assistant, and student. | UI structure documented and connected to user flows. |

## Sprint 4 - Authentication

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Authentication UX | High | Done | Admin, professor, assistant, and student can log in and be redirected correctly by role. | Login flow implemented, tested, and documented. |
| Albiona | Authentication Backend | High | Done | Protected endpoints require valid token and enforce role-based access. | Backend auth flow works and route protection is verified. |
| Alma | App Shell | High | Done | Shared layout, navigation, and login UI are implemented for the platform. | App shell and login UI are stable and reusable. |

## Sprint 5 - User and Identity Management

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | User Management | High | Done | Admin can create users and manage activation status. | User management flow is implemented and tested. |
| Albiona | Identity Management | High | Done | Email uniqueness, role validation, and password rules are enforced. | Backend validation and related endpoints are complete. |
| Alma | Admin UX | High | Done | Admin can view, filter, and manage users from the interface. | User directory UI is connected and usable. |

## Sprint 6 - Academic Structure

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Academic Structure | High | Done | Admin can create, publish, and close academic terms. | Term workflow works from UI to backend. |
| Albiona | Course Management | High | Done | Courses can be created with valid year, semester, and credit rules. | Course backend logic and validations are complete. |
| Alma | Academic Structure UI | High | Done | Terms and courses can be created and reviewed through the admin interface. | Terms/courses UI is connected and stable. |

## Sprint 7 - Course Offerings

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Offering Management | High | Done | Admin can create course offerings and define year/semester context. | Offering flow is documented and functional. |
| Albiona | Staff Assignment | High | Done | Course offerings store and validate assigned professor and assistant. | Staff assignment endpoints and rules are complete. |
| Alma | Offering UI | High | Done | Admin can assign professor and assistant in the offering form and view them in tables. | Offering UI is connected and testable. |

## Sprint 8 - Exam Foundation

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Exam Planning | High | Done | Question types, difficulty, exam states, and ownership rules are documented. | Exam and question workflow foundation is defined. |
| Albiona | Exam Backend | High | Done | System supports creating questions and exams with basic ownership structure. | Question/exam APIs and core models are available. |
| Alma | Exam UI | High | Done | Initial exam list, exam create, and question create screens exist. | Exam UI foundation is integrated into the frontend. |

## Sprint 9 - Product Alignment and Hardening

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Product Alignment | High | Done | Admin responsibilities are aligned with operational-only access and no academic content exposure. | Scope corrections are reflected in docs and UI behavior. |
| Albiona | Access Control Hardening | High | Done | Admin cannot access exam content and ownership rules are enforced on protected endpoints. | Backend guards are updated and verified. |
| Alma | UI Cleanup | High | Done | Role navigation reflects correct boundaries and duplicate/incorrect UI access is removed. | Shared UI is cleaned and role visibility is corrected. |

## Sprint 10 - Enrollment and Role Workspaces

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Enrollment Management | High | Done | Admin can assign/import students by year and current semester, and registration flow is defined through UI and backend. | Enrollment UI, API flow, and validation rules are documented and implemented in baseline form. |
| Albiona | Professor Workspace | High | Done | Professor sees assigned offerings grouped by year and semester and cannot see other staff content. | Assigned offerings load from backend and render correctly in professor UI. |
| Alma | Student Visibility | High | Done | Student sees only current allowed academic items and no unrelated semester data. | Student dashboard is connected to eligibility-based data model. |
| Team | Integration | High | In Progress | All three features are reviewed together and integration issues are logged. | Team review is completed and blockers are documented. |

## Sprint 11 - Assistant, Question Bank, and Code Authoring

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Assistant Workflow | High | In Progress | Assistant sees only assigned offerings and support responsibilities with correct permissions. | Assistant-facing UI and backend visibility rules are connected. |
| Albiona | Question Bank | High | To Do | Professors and assistants can create and manage MCQ and text questions inside assigned course context. | Question bank APIs and baseline UI flow are working. |
| Alma | Code Question Authoring | High | In Progress | Code and SQL questions use Monaco Editor and support structured input for technical questions. | Monaco integration is stable and connected to question creation forms. |
| Team | Integration | High | To Do | Question bank and role ownership rules are tested together. | Shared review is completed and ownership issues logged. |

## Sprint 12 - Exam Authoring and Delivery

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Manual Exam Authoring | High | To Do | Staff can manually create exam drafts, attach questions, and move exams toward publish state. | Manual exam flow works from UI to backend. |
| Albiona | Random Exam Generation | High | To Do | System can generate exams from question bank by count and difficulty and allow controlled replacement. | Random generator and selection logic are functional. |
| Alma | Exam Delivery | High | To Do | Student can open an allowed exam, answer questions, and submit through a guided session. | Student exam session UI is connected and usable. |
| Team | Integration | High | To Do | Authoring and student delivery flows are tested together end-to-end. | Integrated exam walkthrough is completed. |

## Sprint 13 - Evaluation, Grading, and Results

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | AI Text Evaluation | High | Done | Text answers can be reviewed with AI assistance but remain under academic review control. | AI-assisted text evaluation flow is defined and integrated in baseline form. |
| Albiona | Grading and Results | High | To Do | Results remain hidden until published and role boundaries are enforced in grading access. | Results pipeline and visibility rules are implemented. |
| Alma | Result Experience | High | To Do | Staff can review attempts in queue and students can view published results in a clean interface. | Review queue and result pages are available in UI. |
| Team | Integration | High | To Do | AI evaluation, grading, and result publication are reviewed together. | Team validation pass is completed. |

## Sprint 14 - Finalization and Delivery Readiness

| Owner | Feature | Priority | Status | Acceptance criteria | Definition of Done |
| --- | --- | --- | --- | --- | --- |
| Agnesa | Progression and Carry-Over | High | To Do | System defines how previous-semester eligibility and unlock rules are handled in controlled form. | Carry-over and progression baseline is documented and partially integrated. |
| Albiona | Security and Stabilization | High | To Do | Role boundaries are reinforced, important actions are logged, and demo environment is stable. | Security hardening and demo data setup are complete. |
| Alma | UI Polish | High | To Do | Main screens are visually clean, understandable, and ready for final presentation. | UI polish pass is completed across demo-critical screens. |
| Team | Final Delivery | High | To Do | Final walkthrough is rehearsed and submission package is reviewed by the whole team. | Final delivery package is ready for submission. |
