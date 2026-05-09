import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import RoleGuard from "./RoleGuard";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import ExamsListPage from "../pages/exams/ExamsListPage";
import ExamCreatePage from "../pages/exams/ExamCreatePage";
import ExamDetailsPage from "../pages/exams/ExamDetailsPage";
import ExamGradebookPage from "../pages/exams/ExamGradebookPage";
import QuestionCreatePage from "../pages/exams/QuestionCreatePage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import AdminAcademicStructurePage from "../pages/admin/AdminAcademicStructurePage";
import QuestionBankPage from "../pages/question-bank/QuestionBankPage";
import QuestionBankEditorPage from "../pages/question-bank/QuestionBankEditorPage";
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

        <Route element={<RoleGuard allow={["Professor", "Assistant"]} />}>
          <Route path="/question-bank" element={<QuestionBankPage />} />
          <Route path="/question-bank/new" element={<QuestionBankEditorPage />} />
          <Route path="/question-bank/questions/:questionId/edit" element={<QuestionBankEditorPage />} />
          <Route path="/exams/new" element={<ExamCreatePage />} />
          <Route path="/exams/:examId/gradebook" element={<ExamGradebookPage />} />
        </Route>

        <Route element={<RoleGuard allow={["Professor", "Assistant"]} />}>
          <Route path="/exams/:examId/questions/new" element={<QuestionCreatePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
