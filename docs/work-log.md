# General Work Log

This document summarizes the main project-level work completed in the repository. Individual owner notes are kept in `work-log-albiona.md` and `work-log-alma.md`.

## Current Delivery Summary

- Built the role-based application shell for Admin, Professor, Assistant, and Student.
- Implemented authentication, protected routes, and settings/password workflow.
- Added admin management for users, academic structure, enrollments, carry-over records, SMU readiness, and reports.
- Added professor/assistant assigned-offering workspaces.
- Added question bank workflows for MCQ, Text, C#, and SQL.
- Added simplified exam creation with offering-derived metadata.
- Added exam details, manual question attachment, random generation, replacement, publish/unpublish, and access-code management.
- Added student exam entry, rules, attempt workspace, autosave, technical Run preview, integrity signals, and submit behavior.
- Added live monitor with attempt state, student access actions, device request handling, and integrity stream.
- Added gradebook review, AI-assisted suggestions, manual scoring override, CSV export, result publication, and student results.
- Added audit logging, SMU integration readiness, English/Albanian UI support, and institutional UI polish.
- Refreshed README and documentation to match the current implementation.

## Verification Practices

- Backend changes should be verified with `dotnet build backend\OnlineExam.Api\OnlineExam.Api.csproj`.
- Frontend changes should be verified with `cd frontend; npm run build`.
- UI changes should include screenshots in PR notes.
- Grading/result changes must be checked from both professor gradebook and student My Results.
- Generated files and build artifacts must stay out of Git.

## Known Boundaries

- SQL/C# Run is a safe preview and not a production code-execution sandbox.
- Browser integrity signals are advisory and auditable but not equivalent to a secure browser.
- SMU production behavior depends on final external API contract and data ownership rules.
