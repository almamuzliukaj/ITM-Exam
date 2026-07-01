# Contribution Analysis for Retrospective Reports

Date prepared: 2026-07-01

This document is an evidence base for later individual retrospective reports. It is not itself a retrospective report.

## Methodology

- Repository inspected from local Git history after `git fetch --all --prune`.
- Scope: all reachable local and remote refs, including `origin/main` and feature branches.
- Primary attribution is based on Git author names and emails, not on assumptions.
- Merge commits are counted separately from implementation commits. Feature ownership below is based mostly on non-merge commits, because merge commits often only represent PR integration.
- Bot commits from `copilot-swe-agent[bot]` are not assigned to any student.
- Full commit inventory is saved in `docs/contribution-commit-inventory.csv`.
- Per-file contribution stats are saved in `docs/contribution-file-stats.csv`.

## Author Mapping Used

| Member | Git author names mapped |
| --- | --- |
| Agnesa Maxhuni | `Agnesa Maxhuni`, `Agnesa14` |
| Albiona Maxhuni | `Albiona Maxhuni`, `AlbionaMaxhuni` |
| Alma Muzliukaj | `Alma`, `Alma Muzliukaj` |

## High-Level Commit Statistics

These numbers are from `git log --all` after fetching remote branches.

| Member | All commits | Non-merge implementation commits | Merge commits | Non-merge insertions | Non-merge deletions |
| --- | ---: | ---: | ---: | ---: | ---: |
| Agnesa Maxhuni | 120 | 57 | 63 | 22,947 | 10,852 |
| Albiona Maxhuni | 128 | 114 | 14 | 69,729 | 8,809 |
| Alma Muzliukaj | 132 | 72 | 60 | 20,121 | 5,204 |

Important: insertions/deletions include generated files such as EF migrations/snapshots and large UI files, so they should not be used alone to grade contribution quality.

## Agnesa Maxhuni

### Main Contribution Areas

- Frontend and UI/UX: professional shell, admin user management, workspace header behavior, student exam focus layout, gradebook reliability, professor exam list actions, and institutional UI consistency.
- Backend and exam security: question/exam EF relationship fixes, DTO cleanup, secure exam access code lifecycle, secure exam session binding, student exam lifecycle security, and proctoring/access revocation fixes.
- Academic and enrollment workflows: admin enrollment management, academic structure support, carry-over/progression unlock workflow.
- Exam authoring and grading workflows: manual exam authoring workflow, professor assessment workflow, question generation workflow stabilization, grading review and result publication UI/workflow refinements.
- Documentation and QA: documentation skeleton, intro/scope/NFR/security roadmap, work logs, release QA evidence, operations runbook, professional handoff workflow, and presentation readiness materials.

### Most-Touched Files

- `frontend/src/styles/ui.css`
- `backend/OnlineExam.Api/Controllers/ExamsController.cs`
- `frontend/src/pages/exams/StudentExamSessionPage.jsx`
- `frontend/src/lib/examsApi.js`
- `frontend/src/pages/exams/ExamsListPage.jsx`
- `frontend/src/pages/exams/ExamDetailsPage.jsx`
- `frontend/src/pages/exams/ExamGradebookPage.jsx`
- `frontend/src/components/AppShell.jsx`
- `frontend/src/components/RoleDashboardPanels.jsx`
- `frontend/src/pages/admin/AdminEnrollmentsPage.jsx`
- `docs/00-master.md`, `docs/work-log.md`, `docs/test-guide.md`, `docs/13-project-status-gap-analysis.md`

### Representative Implementation Commits

- `2141713` - added solution file and included API project.
- `2456068`, `b7d0481` - documentation skeleton, scope, NFR/security and roadmap.
- `03f4453`, `d12f44b` - fixed Questions create/list and EF Question-Exam relationship.
- `58b042a` - added admin enrollment management.
- `8f6cb27`, `65d87d6` - AI-assisted text evaluation and manual exam authoring workflow.
- `e85495f` / `3c1eabf` - carry-over unlock workflow.
- `3ab52de`, `e789250`, `c389bd7` - student exam focus and university UI consistency.
- `f7b22b0`, `5ae770f`, `c4ae95b` - exam access, question generation, and gradebook reliability.
- `e50c0c0`, `ed85863`, `c38a6fa` - access code lifecycle and secure student exam/session enforcement.
- `0b5ca01` - professor live exam monitoring dashboard.
- `c907b45` - stabilized exam integrity and grading review workflows.

### Overall Assessment

Agnesa's work is spread across UI polish, academic/admin workflows, exam security, gradebook reliability, and documentation/QA. She appears to have handled many workflow-hardening tasks and several integration/merge cleanup fixes. Her contribution is not limited to frontend; she also touched backend controllers, question/exam relationships, access workflows, and security-related exam session behavior.

## Albiona Maxhuni

### Main Contribution Areas

- Backend/API: academic structure backend modules, dashboard metrics from database, exam/session backend rules, attempt draft flow, grading calculations, result publication backend, access code enforcement, live session control, assistant ownership controls, official student identity, and AI grading/material generation.
- Database/model work: EF migrations, `AppDbContext`, exam/result models, question metadata, student identity/photo-related data, grading and session persistence.
- Question bank and generation: question bank workflow, random exam generation, question types, metadata, technical question metadata, AI material generation workspace, concept-based AI grading, strict AI grading review.
- Authentication/security: frontend auth flow, protected dashboard, bearer token API helper, permission hardening, audit logging, security hardening for exam attempts, access code enforcement, live session control.
- i18n/language: app-wide English/Albanian translation coverage, runtime translator cleanup, dynamic text update fixes.
- Frontend support: login/dashboard UI, professor assigned offerings workspace, professor access code UI, gradebook parse fixes, gradebook frontend support.

### Most-Touched Files

- `backend/OnlineExam.Api/Controllers/ExamsController.cs`
- `backend/OnlineExam.Api/Program.cs`
- `backend/OnlineExam.Api/Migrations/AppDbContextModelSnapshot.cs`
- `backend/OnlineExam.Api/Controllers/QuestionsController.cs`
- `backend/OnlineExam.Api/DTOs/ExamResultsDtos.cs`
- `backend/OnlineExam.Api/Models/ExamAttempt.cs`
- `backend/OnlineExam.Api/Data/AppDbContext.cs`
- `frontend/src/lib/examsApi.js`
- `frontend/src/lib/i18n.js`
- `frontend/src/components/RuntimeAlbanianTranslator.jsx`
- `frontend/src/pages/exams/ExamGradebookPage.jsx`
- `frontend/src/pages/exams/ExamDetailsPage.jsx`
- `frontend/src/pages/exams/QuestionCreatePage.jsx`
- `docs/work-log-albiona.md`

### Representative Implementation Commits

- `6328422`, `0bd57b3`, `2c673c8`, `b3044df` - frontend scaffold, API helper, login/dashboard polish, and early authentication wiring.
- `db881db`, `59391b9` - academic structure backend modules and login/CORS setup.
- `677caef` - dashboard metrics from database.
- `a9719bc`, `8661576`, `29ea4cd` - question bank workflow, random exam generation, question type changes.
- `81984ca`, `8ea568b`, `91c3b92`, `a4c560b` - exam session backend rules, draft attempt flow, result visibility, security hardening.
- `932f8de` - exam integrity events API.
- `dfcfdda`, `7457426`, `096ac8b` - max points, grading persistence, final grading publication backend.
- `7515891`, `20aeda3` - access code enforcement and live session control backend.
- `23b945b` - secure student identity and official photo management.
- `3025905`, `132c026`, `8f040f3`, `8bb4cdb` - i18n coverage and runtime translation fixes.
- `d5abeb3`, `edcf4d2`, `1655570`, `3a8dfd7` - AI grading improvements, strict review, and grade recalculation.

### Overall Assessment

Albiona has the strongest evidence of sustained backend/API and database-focused contribution. Her work repeatedly touches controllers, DTOs, models, migrations, session rules, grading, access control, and i18n support. She also contributed frontend pieces where needed, especially authentication, professor/access-code UI, gradebook support, and translation behavior.

## Alma Muzliukaj

### Main Contribution Areas

- Project foundation and authentication: initial repository structure, backend scaffold, EF Core/user/JWT authentication, `/auth/me` fixes, frontend API URL handling, admin-only user provisioning, authorization rules for offerings.
- Student exam experience: student eligibility dashboard, student exam attempt route, secure exam session UI, integrity flow, question display, results experience, published result visibility, student live session states, manual admission workflow, student result organization, attempt randomization.
- Question/review workflows: Monaco/technical question authoring, technical answer workspace, attempt review and CSV export, generated question review workflow, question bank/exam delivery fixes.
- UI/UX and responsiveness: app branding, responsive polish, sidebar/navigation layout, sticky header behavior, language switching responsiveness, professor exam creation UI and overview card updates.
- Deployment and production fixes: Railway/Vercel deployment preparation, Docker/Vercel config, deployment build fixes, migration order fixes, frontend deployment runtime fixes.
- Exam/gradebook/proctoring: gradebook review workflow, integrity workflow, physical exam admission monitoring, live session states, published result E2E visibility.

### Most-Touched Files

- `frontend/src/styles/ui.css`
- `backend/OnlineExam.Api/Controllers/ExamsController.cs`
- `backend/OnlineExam.Api/Program.cs`
- `frontend/src/lib/examsApi.js`
- `frontend/src/pages/exams/ExamDetailsPage.jsx`
- `frontend/src/pages/exams/StudentExamSessionPage.jsx`
- `frontend/src/pages/exams/ExamGradebookPage.jsx`
- `frontend/src/pages/exams/ExamCreatePage.jsx`
- `frontend/src/pages/exams/ExamsListPage.jsx`
- `frontend/src/lib/i18n.js`
- `backend/OnlineExam.Api/Controllers/AuthController.cs`
- `frontend/src/pages/Login.jsx`
- `frontend/src/components/AppShell.jsx`
- `frontend/src/components/RoleDashboardPanels.jsx`
- `frontend/src/pages/exams/ExamMonitorPage.jsx`

### Representative Implementation Commits

- `f9266df`, `8f13b02`, `118a640` - initial structure, backend scaffold, EF Core, user model, JWT authentication, seed users.
- `9cd3c45`, `5dd9a51`, `a0ef2e4` - auth fixes, API URL handling, exams/questions CRUD, authorization and validation.
- `8fe99c8`, `a4c47e6` - admin user provisioning and offering authorization rules.
- `15bb933`, `73b6820` - app-wide UI polish/branding and student eligibility dashboard.
- `479780f`, `d6ff643`, `9277748`, `959686b` - Monaco/technical authoring, student exam session flow, attempt route, results experience.
- `6027a59`, `b20a2a3`, `123b6df` - exam delivery/question bank/results workflow and secure exam session UI.
- `67f5b1d`, `55035f9`, `f3faa60`, `601bec7` - question generation UX, technical answer workspace, attempt review, CSV export, integrity workflow.
- `c52192c`, `5f69f25`, `b644d91`, `6889dca` - manual admission workflow, student live session states, published results, generated question review.
- `5f4d247`, `225799b`, `de3938c` - physical admission monitoring, student results organization, exam visibility, attempt randomization.
- `f08ce91`, `2e42fe3`, `6429ad4`, `1957f7f`, `13fcdf5`, `d176504` - deployment preparation, build fixes, language responsiveness, default enrollment values, professor exam creation UI and overview cards.

### Overall Assessment

Alma's contribution is strongest in student-facing exam workflows, UI/UX, authentication foundation, deployment readiness, and integration fixes. Git history also shows Alma frequently handled merge integration and production/deployment fixes. Her work connects frontend student/professor experiences with backend exam and auth behavior.

## Shared or Cross-Cutting Work

Some project areas were clearly shared and should not be assigned to only one person:

- Exam integrity and secure sessions:
  - Albiona: backend integrity/session rules, access enforcement, live session control.
  - Agnesa: secure lifecycle, access workflow, binding enforcement, proctoring/revocation stabilization.
  - Alma: student-facing integrity UI, fullscreen/session UX, live session states.
- Gradebook and results:
  - Albiona: grading persistence/calculation/publishing backend and AI grading logic.
  - Agnesa: gradebook reliability, save/publish UI, review workflow refinements.
  - Alma: attempt review modal/export, student published result visibility, student results organization.
- Question generation and question bank:
  - Agnesa: authoring workflow and generation workflow stabilization.
  - Albiona: metadata, random generation, AI material generation, validation/backend support.
  - Alma: question generation UX, generated-question review, technical answer workspace.
- i18n:
  - Albiona: broad translation coverage and runtime translator behavior.
  - Alma: language switching responsiveness and syntax/build fixes.
- Deployment:
  - Alma: main Railway/Vercel deployment preparation and production build troubleshooting.
  - Agnesa/Albiona: supporting config/backend fixes appear in adjacent security/backend work.

## Evidence Files Generated

- `docs/contribution-commit-inventory.csv`
  - Every mapped commit for Agnesa, Albiona, and Alma.
  - Includes hash, short hash, date, Git author, email, merge/implementation classification, and subject.
- `docs/contribution-file-stats.csv`
  - Non-merge file touch counts with insertions/deletions by member and file.

## Notes for Later Retrospective Reports

- Do not write that a member implemented a feature unless the commit history supports it.
- Use non-merge commits as the strongest evidence for actual implementation.
- Use merge commits only to describe PR integration or coordination.
- Be careful with generated migration files and large CSS files; line counts alone can exaggerate contribution size.
- Mention shared ownership where features were delivered through multiple branches.
