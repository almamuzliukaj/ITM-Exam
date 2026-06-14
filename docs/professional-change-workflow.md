# Professional Change Workflow

This guide defines how sprint work should be prepared, committed, pushed, and handed off for review.

## Branch Naming

Use one branch per sprint or feature.

Recommended pattern:

```text
feature/<owner>-<clear-feature-name>
```

Examples:

- `feature/agnesa-student-journey-validation`
- `feature/agnesa-university-demo-readiness`
- `feature/albiona-result-publication-hardening`
- `feature/alma-final-ui-polish`

Avoid vague names:

- `sprint-next`
- `fix`
- `changes`
- `new-work`

## Commit Message Style

Use a short professional sentence that explains the outcome, not the activity.

Recommended pattern:

```text
<Verb> <area> <outcome>
```

Good examples:

- `Add student journey validation checkpoints`
- `Improve SMU-managed admin data handling`
- `Document university demo readiness workflow`
- `Harden result publication validation`

Avoid:

- `done`
- `fix stuff`
- `changes`
- `sprint`
- `final final`

## Pull Request Description

Each PR should include:

- Sprint or task name.
- What changed.
- How it was tested.
- Any known limitation.
- Whether it depends on another branch or PR.

Suggested PR template:

```markdown
## Summary
- 

## Testing
- [ ] npm run build
- [ ] dotnet build
- [ ] Manual flow checked

## Notes
- 
```

## Handoff Checklist

Before asking for review:

1. Confirm `git status` is clean after commit.
2. Confirm the branch contains only the current sprint.
3. Run the relevant build/test command.
4. Update `docs/work-log.md`.
5. Push the branch.
6. Open a PR with a clear title.
7. Do not start the next sprint in the same branch after pushing.

## When a Sprint Depends on a Previous Sprint

If Sprint B depends on Sprint A and Sprint A is not merged yet:

1. Create Sprint B from Sprint A's branch.
2. Mention the dependency in the PR.
3. Merge Sprint A first.
4. Rebase or update Sprint B onto `main` after Sprint A is merged.

This keeps review history understandable and prevents duplicated commits.
