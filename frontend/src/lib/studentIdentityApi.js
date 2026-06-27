import api from "./api";

export async function getMyStudentIdentity() {
  const response = await api.get("/api/student-identities/me");
  return response.data;
}

export async function uploadOfficialStudentPhoto(studentId, file) {
  const formData = new FormData();
  formData.append("photo", file);
  const response = await api.post(`/api/student-identities/${studentId}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function loadProtectedPhotoUrl(photoUrl) {
  if (!photoUrl) return "";

  const response = await api.get(photoUrl, { responseType: "blob" });
  return URL.createObjectURL(response.data);
}
