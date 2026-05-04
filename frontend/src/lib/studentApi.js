import api from "./api";

export async function getMyEligibilityDashboard() {
  const response = await api.get("/api/students/me/eligibility");
  return response.data;
}

