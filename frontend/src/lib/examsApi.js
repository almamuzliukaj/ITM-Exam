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

export async function listQuestions(examId) {
  const response = await api.get(`/api/exams/${examId}/questions`);
  return response.data;
}

export async function getCurrentExamAttempt(examId) {
  const response = await api.get(`/api/exams/${examId}/attempt`);
  return response.data;
}

export async function saveExamAttemptDraft(examId, payload) {
  const response = await api.put(`/api/exams/${examId}/attempt/draft`, {
    examId,
    answers: payload.answers || [],
  });
  return response.data;
}

export async function submitExamAttempt(examId, payload) {
  const response = await api.post(`/api/exams/${examId}/attempt`, {
    examId,
    answers: payload.answers || [],
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

export async function getCurrentExamIntegritySummary(examId) {
  const response = await api.get(`/api/exams/${examId}/attempt/integrity-summary`);
  return response.data;
}

export async function getExamLockdownReadiness(examId) {
  const response = await api.get(`/api/exams/${examId}/lockdown-readiness`);
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
