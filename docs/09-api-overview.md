# 9. API Overview

## 9.1 Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`

## 9.2 Users

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/{id}`
- `PUT /api/users/{id}/status`
- `POST /api/users/{id}/reset-password`

## 9.3 Academic Structure

- `GET /api/terms`
- `POST /api/terms`
- `PUT /api/terms/{id}`
- `GET /api/courses`
- `POST /api/courses`
- `PUT /api/courses/{id}`
- `GET /api/course-offerings`
- `GET /api/course-offerings/mine`
- `POST /api/course-offerings`
- `PUT /api/course-offerings/{id}`
- `POST /api/course-offerings/{id}/publish`

## 9.4 Enrollments and Carry-Over

- `GET /api/semester-enrollments`
- `POST /api/semester-enrollments`
- `GET /api/student-course-enrollments`
- `POST /api/student-course-enrollments`
- `GET /api/carry-overs`
- `POST /api/carry-overs`

## 9.5 Question Bank and Questions

- `GET /api/question-bank/{offeringId}/questions`
- `POST /api/question-bank/{offeringId}/questions`
- `GET /api/question-bank/questions/{id}`
- `PUT /api/question-bank/questions/{id}`
- `DELETE /api/question-bank/questions/{id}`
- `GET /api/exams/{examId}/questions`
- `POST /api/exams/{examId}/questions`

## 9.6 Exams

- `GET /api/exams`
- `GET /api/exams/{id}`
- `POST /api/exams`
- `PUT /api/exams/{id}`
- `DELETE /api/exams/{id}`
- `POST /api/exams/{id}/publish`
- `POST /api/exams/{examId}/generate-random`
- `POST /api/exams/{examId}/questions/{questionId}/replace`
- `POST /api/exams/{examId}/attempt`

## 9.7 Notes

Endpoint availability depends on role and ownership rules. The exact response contracts are defined in backend DTO classes.
