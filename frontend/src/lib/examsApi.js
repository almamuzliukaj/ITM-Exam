import api from "./api";

export async function listExams() {
  const response = await api.get("/api/exams");
  return response.data;
}

export async function createExam(payload) {
  const response = await api.post("/api/exams", payload);
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
