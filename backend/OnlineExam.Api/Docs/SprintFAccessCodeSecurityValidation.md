# Sprint F Backend Validation: Exam Access Code Security

## Scope

This validation note covers Agnesa's Sprint F backend work for exam access code lifecycle and security.

## Implemented checks

- Entry codes are generated only for published assessments linked to a course offering.
- Regenerating a code invalidates previous active codes for the same exam.
- Expired active codes are marked inactive before access status, verification, generation, and live monitor responses are returned.
- Code hashes are scoped to the exam id, so the same visible code cannot be reused across different exams.
- Student exam visibility and session access require an eligible `StudentCourseEnrollment` for the exam's `CourseOffering`.
- Manual API calls to attempt, draft save, submit, or run technical answers still pass through the same session access gate.
- Access code responses include `ServerTimeUtc` so frontend countdowns can use server time.
- Generate, regenerate, rejected verification, expired verification, successful verification, and manual approval remain audit logged.

## Manual security checklist

1. Publish an assessment linked to a course offering.
2. Generate an entry code as the assigned professor.
3. Generate another code and confirm the previous active code no longer works.
4. Wait more than three minutes and confirm the code is rejected as expired.
5. Try to verify a code as a student not enrolled in the course offering and confirm access is denied.
6. Try to call the attempt endpoint directly before code verification and confirm access is denied.
7. Verify with the current code as an eligible student and confirm the attempt can start.
8. Confirm audit logs contain access-code generation, regeneration, rejected/expired verification, and successful verification events.

## Build verification

The backend was built successfully using a temporary output path because a running local API process was locking the normal `bin` output files:

```text
dotnet build -o C:\Users\W11\Online-Exam\temp_build_verify_access
```

Result: build succeeded with 0 warnings and 0 errors.
