# 9. API Overview

Base API routes are implemented in `backend/OnlineExam.Api/Controllers`. Most endpoints require JWT authentication and enforce role/ownership rules.

## 9.1 Authentication

- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/me/password`

## 9.2 Users and Student Identity

- `GET /api/users`
- `POST /api/users`
- `POST /api/users/import`
- `GET /api/users/{id}`
- `PUT /api/users/{id}`
- `PUT /api/users/{id}/status`
- `PUT /api/users/{id}/reset-password`
- `GET /api/student-identities/me`
- `GET /api/student-identities/{studentId}`
- `GET /api/student-identities/{studentId}/photo`
- `POST /api/student-identities/{studentId}/photo`

## 9.3 Academic Structure

- `GET /api/terms`
- `POST /api/terms`
- `PUT /api/terms/{id}`
- `POST /api/terms/{id}/publish`
- `POST /api/terms/{id}/close`
- `GET /api/courses`
- `POST /api/courses`
- `PUT /api/courses/{id}`
- `POST /api/courses/{id}/deactivate`
- `GET /api/course-offerings`
- `GET /api/course-offerings/mine`
- `GET /api/course-offerings/{id}/students`
- `POST /api/course-offerings`
- `PUT /api/course-offerings/{id}`
- `POST /api/course-offerings/{id}/publish`
- `POST /api/course-offerings/{id}/close`
- `GET /api/course-offerings/{offeringId}/staff`
- `POST /api/course-offerings/{offeringId}/staff`

## 9.4 Enrollments and Carry-Over

- `GET /api/semester-enrollments`
- `GET /api/students/{studentId}/semester-enrollments`
- `POST /api/students/{studentId}/semester-enrollments`
- `PUT /api/semester-enrollments/{id}`
- `GET /api/students/{studentId}/course-enrollments`
- `GET /api/students/me/eligibility`
- `POST /api/students/{studentId}/course-enrollments`
- `POST /api/students/{studentId}/course-enrollments/regularize`
- `GET /api/students/{studentId}/carry-overs`
- `POST /api/students/{studentId}/carry-overs`
- `POST /api/carry-overs/{id}/assign-offering`
- `POST /api/carry-overs/{id}/close`
- `POST /api/carry-overs/{id}/cancel`

## 9.5 Questions and Question Bank

- `GET /api/question-bank/{offeringId}/questions`
- `POST /api/question-bank/{offeringId}/questions`
- `GET /api/question-bank/questions/{id}`
- `PUT /api/question-bank/questions/{id}`
- `DELETE /api/question-bank/questions/{id}`
- `GET /api/exams/{examId}/questions`
- `POST /api/exams/{examId}/questions`
- `PUT /api/questions/{id}`
- `DELETE /api/questions/{id}`

## 9.6 Exams, Attempts, Access, Monitoring, and Results

- `GET /api/exams`
- `GET /api/exams/{id}`
- `POST /api/exams`
- `PUT /api/exams/{id}`
- `DELETE /api/exams/{id}`
- `POST /api/exams/{id}/publish`
- `POST /api/exams/{id}/unpublish`
- `POST /api/exams/{examId}/generate-random`
- `POST /api/exams/{examId}/questions/from-bank`
- `POST /api/exams/{examId}/attempt`
- `GET /api/exams/{examId}/attempt`
- `PUT /api/exams/{examId}/attempt/draft`
- `POST /api/exams/{examId}/attempt/questions/{questionId}/run`
- `POST /api/exams/{examId}/attempt/heartbeat`
- `POST /api/exams/{examId}/access-codes`
- `POST /api/exams/{examId}/verify-entry-code`
- `GET /api/exams/{examId}/access-status`
- `POST /api/exams/{examId}/request-approval`
- `POST /api/exams/{examId}/request-device-change`
- `GET /api/exams/{examId}/live-monitor`
- `GET /api/exams/{id}/gradebook`
- `POST /api/exams/attempts/{attemptId}/grade`
- `POST /api/exams/{id}/results/publish`
- `GET /api/exams/results/me`
- `GET /api/exams/results/me/{attemptId}`

## 9.7 Reports, Audit, and SMU

- `GET /api/reports/overview`
- `GET /api/reports/participation`
- `GET /api/reports/publish-status`
- `GET /api/reports/integrity`
- `GET /api/audit-logs`
- `GET /api/smu-integration/contract`
- `POST /api/smu-integration/map-preview`
- `GET /api/smu-integration/live-preview`
- `POST /api/smu-integration/sync`
- `POST /api/smu-integration/sync-from-payload`
