import api from "./api";

export async function listUsers(filters = {}) {
  const response = await api.get("/api/Users", { params: filters });
  return response.data;
}

export async function createUser(payload) {
  const response = await api.post("/api/Users", payload);
  return response.data;
}

export async function importUsers(payload) {
  const response = await api.post("/api/Users/import", payload);
  return response.data;
}

export async function updateUser(userId, payload) {
  const response = await api.put(`/api/Users/${userId}`, payload);
  return response.data;
}

export async function updateUserStatus(userId, isActive) {
  const response = await api.put(`/api/Users/${userId}/status`, { isActive });
  return response.data;
}

export async function resetUserPassword(userId, newPassword) {
  const response = await api.put(`/api/Users/${userId}/reset-password`, { newPassword });
  return response.data;
}

export async function uploadOfficialStudentPhoto(userId, file) {
  const formData = new FormData();
  formData.append("photo", file);
  const response = await api.post(`/api/student-identities/${userId}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
