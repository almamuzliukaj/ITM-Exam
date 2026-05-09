import api from "./api";

export async function listQuestionBankQuestions(offeringId, filters = {}) {
  const response = await api.get(`/api/question-bank/${offeringId}/questions`, { params: filters });
  return response.data;
}

export async function getQuestionBankQuestion(questionId) {
  const response = await api.get(`/api/question-bank/questions/${questionId}`);
  return response.data;
}

export async function createQuestionBankQuestion(offeringId, payload) {
  const response = await api.post(`/api/question-bank/${offeringId}/questions`, payload);
  return response.data;
}

export async function updateQuestionBankQuestion(questionId, payload) {
  const response = await api.put(`/api/question-bank/questions/${questionId}`, payload);
  return response.data;
}

export async function deleteQuestionBankQuestion(questionId) {
  await api.delete(`/api/question-bank/questions/${questionId}`);
}
