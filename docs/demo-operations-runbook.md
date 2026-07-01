# Demo Operations Runbook

This runbook describes how to prepare, start, troubleshoot, and close the Online Exam application before a university demo or sprint review.

## 1. Purpose

Use this guide when the team needs to run the full application reliably from a clean local workspace.

The runbook covers:

- Git readiness before testing.
- PostgreSQL startup checks.
- Backend and frontend startup.
- Common local failures and fixes.
- Demo-day checklist.
- Evidence to capture before a pull request or presentation.

## 2. Before Starting

From the repository root, confirm the workspace is clean:

```powershell
git status
```

Expected result:

- Current branch is the sprint branch being tested, or `main` when preparing a clean demo.
- No uncommitted changes unless they are part of the current sprint.

If preparing from `main`, update it first:

```powershell
git checkout main
git pull --rebase origin main
```

Do not run pull or rebase while unfinished local changes are present.

## 3. Local Startup Sequence

Start PostgreSQL:

```powershell
docker compose up -d db
```

Confirm the database container is running:

```powershell
docker ps
```

Start the backend from the repository root:

```powershell
.\scripts\start-backend.ps1
```

Alternative backend startup:

```powershell
cd backend\OnlineExam.Api
dotnet run
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Expected URLs:

- Backend Swagger: `http://localhost:5045/swagger`
- Frontend: `http://localhost:5173`

## 4. Port and Process Checks

Check whether PostgreSQL is listening on port `5432`:

```powershell
netstat -ano | findstr :5432
```

Check whether the backend port is already used:

```powershell
netstat -ano | findstr :5045
```

Check whether the frontend port is already used:

```powershell
netstat -ano | findstr :5173
```

If a process is stale and blocking a build or startup, identify it first:

```powershell
Get-Process OnlineExam.Api -ErrorAction SilentlyContinue
```

Then stop only the stale backend process:

```powershell
Get-Process OnlineExam.Api -ErrorAction SilentlyContinue | Stop-Process
```

## 5. Common Failures

### PostgreSQL refused connection

Symptom:

```text
Failed to connect to 127.0.0.1:5432
```

Likely cause:

- PostgreSQL is not running locally.
- Docker Desktop is closed.
- The database container did not start.

Fix:

```powershell
docker compose up -d db
docker ps
```

Then restart the backend.

### Backend executable is locked

Symptom:

```text
OnlineExam.Api.exe is being used by another process
```

Likely cause:

- A previous `dotnet run` process is still active.
- The backend is running in another terminal.

Fix:

```powershell
Get-Process OnlineExam.Api -ErrorAction SilentlyContinue | Stop-Process
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj
```

### Vite cannot resolve Monaco

Symptom:

```text
Failed to resolve import "@monaco-editor/react"
```

Likely cause:

- Frontend dependencies are not installed after pulling changes.

Fix:

```powershell
cd frontend
npm install
npm run dev
```

If the package is still missing, check `frontend\package.json` before changing imports.

### Push rejected because remote has new work

Symptom:

```text
Updates were rejected because the remote contains work that you do not have locally
```

Fix when the working tree is clean:

```powershell
git fetch origin
git pull --rebase origin main
git push
```

If the branch has conflicts, resolve them, run:

```powershell
git add -A
git rebase --continue
```

Then rebuild and push again.

### Generated files appear in Git

Generated output must not be committed:

- `backend/**/bin/`
- `backend/**/obj/`
- `frontend/dist/`
- `temp_build*/`
- `tmp/backend-build/`
- `publish/`
- `artifacts/`

If generated files appear in `git status`, remove them from the working tree before committing.

## 6. Environment Checks

Frontend API base URL:

```powershell
Get-Content frontend\.env.local -ErrorAction SilentlyContinue
```

Expected local value:

```text
VITE_API_BASE_URL=http://localhost:5045/api
```

Backend database connection is configured from the backend appsettings or local environment. For local demo, the database host should match the Docker Compose PostgreSQL service or local port mapping.

SMU integration settings should be checked before testing synced academic data. If the external SMU API is not available, the demo should clearly state whether the screen is using synced data, fallback data, or readiness-only configuration.

## 7. Demo-Day Checklist

Before the demo:

1. Pull the latest approved `main`.
2. Start Docker Desktop.
3. Start PostgreSQL with `docker compose up -d db`.
4. Run backend build.
5. Run frontend build.
6. Start backend and frontend.
7. Log in once as Admin, Professor, Assistant, and Student.
8. Confirm student exam attempt, autosave, submit, and results pages open.
9. Confirm `docs/release-qa-evidence.md` has the required screenshots or notes.

During the demo:

1. Keep backend and frontend terminals visible in the background.
2. Do not pull, rebase, or switch branches.
3. Use prepared accounts from `docs/test-guide.md`.
4. Show only stable flows unless a limitation is intentionally being discussed.

After the demo:

1. Stop the frontend dev server.
2. Stop the backend process.
3. Leave Docker running only if more testing is needed.
4. Record any issue in the sprint work log or release QA evidence.

## 8. Evidence To Capture

For demo-critical pull requests, capture:

- `git status` clean result.
- `npm run build` result.
- `dotnet build` result.
- Screenshots listed in `docs/release-qa-evidence.md`.
- Any known limitation that may affect the live presentation.

## 9. Ownership

This operations runbook supports local QA and presentation readiness. Backend-specific failures should be confirmed with the teammate responsible for the API change before they are presented as resolved.
