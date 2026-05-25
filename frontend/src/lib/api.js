import axios from "axios";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const baseURL = configuredBaseUrl.replace(/\/+$/, "");

const api = axios.create({
  baseURL,
});

// Ky funksion shton Token-in automatikisht ne cdo thirrje
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Exam-Client"] = detectExamClient();
  return config;
});

export function detectExamClient() {
  if (typeof navigator === "undefined") return "StandardBrowser";

  const userAgent = navigator.userAgent || "";
  if (/safeexambrowser|seb/i.test(userAgent)) {
    return "SafeExamBrowser";
  }

  if (/kiosk/i.test(userAgent)) {
    return "KioskClient";
  }

  return "StandardBrowser";
}

export default api;
