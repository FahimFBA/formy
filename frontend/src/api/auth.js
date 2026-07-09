import { apiFetch, apiFetchForm, clearToken, getToken, setToken } from "./client";

export function isAuthenticated() {
  return Boolean(getToken());
}

export async function login(username, password) {
  const payload = await apiFetch("/auth/token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(payload.token);
  return payload;
}

export async function register(username, password, email) {
  const payload = await apiFetch("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ username, password, email }),
  });
  setToken(payload.token);
  return payload;
}

export function logout() {
  clearToken();
}

export async function getProfile() {
  return apiFetch("/auth/profile/");
}

export async function updateProfile(profile) {
  return apiFetch("/auth/profile/", { method: "PATCH", body: JSON.stringify(profile) });
}

export async function changePassword(oldPassword, newPassword) {
  return apiFetch("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);
  return apiFetchForm("/auth/profile/avatar/", formData, "POST");
}

export async function deleteAvatar() {
  return apiFetch("/auth/profile/avatar/", { method: "DELETE" });
}
