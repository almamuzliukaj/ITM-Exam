import api from "./api";

export async function listExams() {
  const response = await api.get("/api/exams");
  return response.data;
}

export async function createExam(payload) {
  const response = await api.post("/api/exams", payload);
  return response.data;
}

export async function publishExam(examId, payload = {}) {
  const response = await api.post(`/api/exams/${examId}/publish`, payload);
  return response.data;
}

export async function getExam(examId) {
  const response = await api.get(`/api/exams/${examId}`);
  return response.data;
}

export async function listQuestions(examId) {
  const response = await api.get(`/api/exams/${examId}/questions`);
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

export async function replaceExamQuestion(examId, questionId, payload = {}) {
  const response = await api.post(`/api/exams/${examId}/questions/${questionId}/replace`, payload);
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
