# Professional Change Workflow

Use this workflow for every sprint branch, bug fix, documentation update, or UI polish change.

## 1. Before Editing

1. Check the current branch:

   ```powershell
   git status -sb
   git branch --show-current
   ```

2. Confirm whether the task should be on a new branch.
3. Pull/rebase only when the workspace is clean or local work is safely stashed.
4. Do not use `git reset --hard` or force push for normal sprint work.

## 2. While Editing

- Modify only files related to the current task.
- Do not create build artifacts inside the repository.
- Keep source changes separate from generated files.
- Update documentation when behavior changes.
- Prefer small, reviewable commits.

## 3. Verification

Use the relevant checks:

```powershell
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj
cd frontend
npm run build
```

If backend build fails because `OnlineExam.Api.exe` is locked, build to a temporary output folder outside normal `bin`:

```powershell
$buildOut = Join-Path $env:TEMP 'OnlineExamApiBuildCheck'
dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj -o $buildOut
```

## 4. Before Commit

1. Run:

   ```powershell
   git status --short
   git diff --stat
   ```

2. Confirm no generated files are staged:
   - `.dll`
   - `.pdb`
   - `.deps.json`
   - `.runtimeconfig.json`
   - `dist/`
   - `bin/`
   - `obj/`
   - `tmp/backend-build/`
   - copied `appsettings*.json`

3. Use a professional commit message:
   - `Refresh project documentation`
   - `Align student result totals`
   - `Polish admin overview layout`
   - `Document exam access workflow`

## 5. Pull Request Notes

Each PR should include:

- Summary of what changed.
- Testing performed.
- Screenshots for UI changes.
- Known limitations.
- Dependencies or merge order if another PR must merge first.

## 6. Conflict Handling

If a conflict appears:

1. Stop and inspect the conflicted file.
2. Keep the newest correct behavior, not just one side blindly.
3. Remove conflict markers.
4. Run build/test again.
5. Continue rebase/merge only after the file is valid.
