# 1. Introduction

## 1.1 Purpose

ITM Exam is a university online examination platform for managing academic setup, exam authoring, controlled exam entry, student attempts, grading, integrity monitoring, and published results. The system supports four operational roles: Admin, Professor, Assistant, and Student.

The project replaces fragmented manual exam workflows with a structured web application where access, ownership, publication, grading, and result visibility are controlled by role and academic context.

## 1.2 Problem Statement

Faculty exam operations require consistent handling of:

- Academic terms, courses, offerings, staff assignments, enrollments, and carry-over cases.
- Reusable question banks for MCQ, text, C#, and SQL questions.
- Exam creation that inherits academic metadata from course offerings.
- Student access based on eligibility plus classroom entry approval.
- Integrity events during attempts.
- Human-controlled grading and published result visibility.
- Documentation and QA evidence that match the implemented system.

## 1.3 Project Objectives

- Provide secure JWT-based authentication and role-based authorization.
- Keep admin operations separate from academic exam ownership.
- Limit professor and assistant workspaces to assigned offerings.
- Ensure students see only eligible published exams and published results.
- Support technical SQL/C# assessment authoring and student answer workspaces.
- Provide gradebook review with AI-assisted suggestions and professor/manual override.
- Capture audit logs for important administrative and academic actions.
- Support English/Albanian UI usage for institutional presentation.

## 1.4 Current MVP Boundary

The implemented MVP includes academic management, question bank, exam delivery, access-code entry, live monitor, student attempt flow, grading, result publication, reporting, and baseline integrity tracking.

The current technical run feature provides safe previews for SQL/C# answers. Full execution of arbitrary student code or SQL must be implemented in a separate sandbox/container runner before production use.
