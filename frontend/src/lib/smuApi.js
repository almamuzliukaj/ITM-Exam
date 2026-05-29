import api from "./api";

export async function getSmuContract() {
  const response = await api.get("/api/smu-integration/contract");
  return response.data;
}

export async function getSmuLivePreview() {
  const response = await api.get("/api/smu-integration/live-preview");
  return response.data;
}

export async function runSmuSync() {
  const response = await api.post("/api/smu-integration/sync");
  return response.data;
}
