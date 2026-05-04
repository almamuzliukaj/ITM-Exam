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
  return config;
});

export default api;
