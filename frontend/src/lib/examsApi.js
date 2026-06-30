import api from "./api";

export async function listExams() {
  const response = await api.get("/api/exams");
  return response.data;
}

export async function createExam(payload) {
  const response = await api.post("/api/exams", payload);
  return response.data;
}

export async function updateExam(examId, payload) {
  const response = await api.put(`/api/exams/${examId}`, payload);
  return response.data;
}

export async function publishExam(examId, payload = {}) {
  const response = await api.post(`/api/exams/${examId}/publish`, payload);
  return response.data;
}

export async function unpublishExam(examId) {
  const response = await api.post(`/api/exams/${examId}/unpublish`);
  return response.data;
}

export async function deleteExam(examId) {
  await api.delete(`/api/exams/${examId}`);
}

export async function getExam(examId) {
  const response = await api.get(`/api/exams/${examId}`);
  return response.data;
}

export async function listQuestions(examId, clientSessionId = "") {
  const response = await api.get(`/api/exams/${examId}/questions`, {
    params: clientSessionId ? { clientSessionId } : {},
  });
  return response.data;
}

export async function getCurrentExamAttempt(examId, clientSessionId = "") {
  const response = await api.get(`/api/exams/${examId}/attempt`, {
    params: clientSessionId ? { clientSessionId } : {},
  });
  return response.data;
}

export async function saveExamAttemptDraft(examId, payload) {
  const response = await api.put(`/api/exams/${examId}/attempt/draft`, {
    examId,
    answers: payload.answers || [],
    clientSessionId: payload.clientSessionId || "",
  });
  return response.data;
}

export async function submitExamAttempt(examId, payload) {
  const response = await api.post(`/api/exams/${examId}/attempt`, {
    examId,
    answers: payload.answers || [],
    clientSessionId: payload.clientSessionId || "",
  });
  return response.data;
}

export async function runTechnicalExamAnswer(examId, questionId, payload) {
  const response = await api.post(`/api/exams/${examId}/attempt/questions/${questionId}/run`, payload);
  return response.data;
}

export async function recordExamIntegrityEvent(examId, payload) {
  const response = await api.post(`/api/exams/${examId}/attempt/integrity-events`, payload);
  return response.data;
}

export async function getCurrentExamIntegritySummary(examId, clientSessionId = "") {
  const response = await api.get(`/api/exams/${examId}/attempt/integrity-summary`, {
    params: clientSessionId ? { clientSessionId } : {},
  });
  return response.data;
}

export async function sendExamHeartbeat(examId, clientSessionId = "") {
  const response = await api.post(`/api/exams/${examId}/attempt/heartbeat`, {
    clientSessionId,
  });
  return response.data;
}

export async function getExamAccessStatus(examId) {
  const response = await api.get(`/api/exams/${examId}/access-status`);
  return response.data;
}

export async function verifyExamEntryCode(examId, code) {
  const response = await api.post(`/api/exams/${examId}/verify-entry-code`, { code });
  return response.data;
}

export async function requestExamApproval(examId, reason = "Student requested professor approval.") {
  const response = await api.post(`/api/exams/${examId}/request-approval`, { reason });
  return response.data;
}

export async function generateExamAccessCode(examId) {
  const response = await api.post(`/api/exams/${examId}/access-codes`);
  return response.data;
}

export async function getExamLiveMonitor(examId) {
  const response = await api.get(`/api/exams/${examId}/live-monitor`);
  return response.data;
}

export async function allowExamStudentAccess(examId, studentId, reason = "Professor approval") {
  const response = await api.post(`/api/exams/${examId}/students/${studentId}/allow-access`, { reason });
  return response.data;
}

export async function rejectExamStudentAccess(examId, studentId, reason = "Professor rejected manual admission.") {
  const response = await api.post(`/api/exams/${examId}/students/${studentId}/reject-access`, { reason });
  return response.data;
}

export async function revokeExamStudentAccess(examId, studentId, reason = "Professor revoked exam admission.") {
  const response = await api.post(`/api/exams/${examId}/students/${studentId}/revoke-access`, { reason });
  return response.data;
}

export async function requestExamDeviceChange(examId, reason = "Student requested device change approval.") {
  const response = await api.post(`/api/exams/${examId}/request-device-change`, { reason });
  return response.data;
}

export async function removeExamStudentAccess(examId, studentId, reason = "Removed by professor during live monitoring.") {
  const response = await api.post(`/api/exams/${examId}/students/${studentId}/remove-access`, { reason });
  return response.data;
}

export async function getExamIntegritySummary(examId) {
  const response = await api.get(`/api/exams/${examId}/integrity-summary`);
  return response.data;
}

export async function addQuestion(examId, payload) {
  const response = await api.post(`/api/exams/${examId}/questions`, payload);
  return response.data;
}

export async function generateRandomQuestions(examId, payload) {
  const response = await api.post(`/api/exams/${examId}/generate-random`, payload);
  return response.data;
}

export async function addSelectedQuestionsFromBank(examId, questionBankQuestionIds) {
  const response = await api.post(`/api/exams/${examId}/questions/from-bank`, {
    questionBankQuestionIds,
  });
  return response.data;
}

export async function updateExamQuestion(questionId, payload) {
  const response = await api.put(`/api/questions/${questionId}`, payload);
  return response.data;
}

export async function deleteExamQuestion(questionId) {
  await api.delete(`/api/questions/${questionId}`);
}

export async function replaceExamQuestion(examId, questionId, payload = {}) {
  const response = await api.post(`/api/exams/${examId}/questions/${questionId}/replace`, payload);
  return response.data;
}

export async function replaceExamQuestionWithBankQuestion(examId, questionId, questionBankQuestionId) {
  const response = await api.post(`/api/exams/${examId}/questions/${questionId}/replace-with-bank-question`, {
    questionBankQuestionId,
  });
  return response.data;
}

export async function getExamGradebook(examId) {
  const response = await api.get(`/api/exams/${examId}/gradebook`);
  return response.data;
}

export async function gradeExamAttempt(attemptId, payload) {
  const response = await api.post(`/api/exams/attempts/${attemptId}/grade`, payload);
  return response.data;
}

export async function evaluateTextAttempt(attemptId) {
  const response = await api.post(`/api/exams/attempts/${attemptId}/ai-text-evaluation`);
  return response.data;
}
export async function publishExamResults(examId, payload = { publishAll: true, attemptIds: [] }) {
  const response = await api.post(`/api/exams/${examId}/results/publish`, payload);
  return response.data;
}

export async function getMyExamResults() {
  const response = await api.get("/api/exams/results/me");
  return response.data;
}
