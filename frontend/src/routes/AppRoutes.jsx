import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import RoleGuard from "./RoleGuard";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import ExamsListPage from "../pages/exams/ExamsListPage";
import ExamCreatePage from "../pages/exams/ExamCreatePage";
import ExamDetailsPage from "../pages/exams/ExamDetailsPage";
import QuestionCreatePage from "../pages/exams/QuestionCreatePage";
import StudentExamSessionPage from "../pages/exams/StudentExamSessionPage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import AdminAcademicStructurePage from "../pages/admin/AdminAcademicStructurePage";
import AdminEnrollmentsPage from "../pages/admin/AdminEnrollmentsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route element={<RoleGuard allow={["Admin"]} />}>
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/academic" element={<AdminAcademicStructurePage />} />
          <Route path="/admin/enrollments" element={<AdminEnrollmentsPage />} />
        </Route>

        <Route element={<RoleGuard allow={["Professor", "Assistant", "Student"]} />}>
          <Route path="/exams" element={<ExamsListPage />} />
          <Route path="/exams/:examId" element={<ExamDetailsPage />} />
        </Route>

        <Route element={<RoleGuard allow={["Student"]} />}>
          <Route path="/exams/:examId/session" element={<StudentExamSessionPage />} />
        </Route>

        <Route element={<RoleGuard allow={["Professor", "Assistant"]} />}>
          <Route path="/exams/new" element={<ExamCreatePage />} />
          <Route path="/exams/:examId/questions/new" element={<QuestionCreatePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
