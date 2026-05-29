import api from "./api";

export async function getReportsOverview(filters = {}) {
  const response = await api.get("/api/reports/overview", { params: cleanParams(filters) });
  return response.data;
}

export async function getParticipationReport(filters = {}) {
  const response = await api.get("/api/reports/participation", { params: cleanParams(filters) });
  return response.data;
}

export async function getPublishStatusReport(filters = {}) {
  const response = await api.get("/api/reports/publish-status", { params: cleanParams(filters) });
  return response.data;
}

export async function getIntegrityReport(filters = {}) {
  const response = await api.get("/api/reports/integrity", { params: cleanParams(filters) });
  return response.data;
}

function cleanParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value != null),
  );
}
