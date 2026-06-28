import api from "./api";

export function getToken() {
  return localStorage.getItem("token");
}

export function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function saveToken(token) {
  localStorage.setItem("token", token);
}

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function clearUser() {
  localStorage.removeItem("user");
}

export function logout() {
  clearToken();
  clearUser();
  window.location.href = "/login";
}

export async function me() {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await api.get("/auth/me");
    const storedUser = getStoredUser();
    const mergedUser = {
      ...response.data,
      fullName: storedUser?.fullName || response.data?.fullName || "",
      email: response.data?.email || storedUser?.email || "",
      role: response.data?.role || storedUser?.role || "",
      studentNumber: response.data?.studentNumber || storedUser?.studentNumber || "",
      photoUrl: response.data?.photoUrl || storedUser?.photoUrl || "",
      initials: response.data?.initials || storedUser?.initials || "",
    };
    saveUser(mergedUser);
    return mergedUser;
  } catch (error) {
    if (error.response?.status === 401) {
      clearToken();
      clearUser();
    }
    return null;
  }
}

export async function changeOwnPassword(payload) {
  const response = await api.put("/auth/me/password", {
    currentPassword: payload.currentPassword || "",
    newPassword: payload.newPassword || "",
    confirmPassword: payload.confirmPassword || "",
  });
  return response.data;
}

export async function login(email, password) {
  const response = await api.post("/auth/login", { email, password });
  const data = response.data;

  if (data.token) {
    saveToken(data.token);
    saveUser({
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      studentNumber: data.studentNumber || "",
      photoUrl: data.photoUrl || "",
      initials: data.initials || "",
    });
  }

  return data;
}
