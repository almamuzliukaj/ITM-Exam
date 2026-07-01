# SMU Integration Plan

## Purpose

SMU integration defines how ITM Exam can consume academic data from an external student-management system while keeping exam-specific workflows local.

## Source of Truth

SMU should own:

- Student identities and active status.
- Professor and assistant identities.
- Terms and academic periods.
- Courses and course metadata.
- Course offerings.
- Semester enrollments.
- Course enrollments and exam eligibility.

ITM Exam should own:

- Exam drafts and publication.
- Question banks.
- Student attempts and draft answers.
- Grading and result publication.
- Exam integrity events.
- Access codes and classroom admission state.
- Carry-over controls that are exam-specific.

## Expected SMU Data Areas

| Data Area | Purpose |
| --- | --- |
| Students | Identity, email, student number, active status |
| Staff | Professor/assistant identity and role |
| Terms | Academic year, dates, current term |
| Courses | Course code, name, credits, year/semester |
| Offerings | Term-specific course delivery and section |
| Assignments | Staff assigned to offerings |
| Enrollments | Student eligibility for offerings |

## Implemented Readiness

The repository includes:

- SMU contract endpoint.
- Mapping preview endpoint.
- Live preview endpoint.
- Sync and sync-from-payload endpoints.
- Admin SMU page.
- Admin pages that can switch between manual fallback and SMU-managed mode.
- Source labels that explain whether data is local/fallback or SMU-managed.

## UI Rules

- When SMU is configured, SMU-owned records should be displayed for review rather than manually recreated.
- Manual creation remains a fallback only when SMU is not configured.
- Exam-specific records remain editable in ITM Exam.
- Carry-over controls remain local because they affect exam access behavior.

## Production Readiness Checklist

- Confirm final SMU API contract.
- Confirm authentication method for SMU requests.
- Confirm sync schedule and conflict rules.
- Confirm how inactive/withdrawn students are represented.
- Confirm audit requirements for sync changes.
- Test sync on a non-production database before enabling it for real academic data.
