import api from "./api";

export async function getDashboardSummary() {
  const response = await api.get("/api/dashboard/summary");
  return response.data;
}
