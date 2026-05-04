import axios from "axios";

const baseURL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5045").replace(/\/+$/, "");

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
