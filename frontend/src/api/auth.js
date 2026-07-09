// By: Md. Fahim Bin Amin
//
// Authentication and account-management API calls: login/register token handling and
// the profile/password/avatar endpoints under /auth/.

import { apiFetch, apiFetchForm, clearToken, getToken, setToken } from "./client";

/**
 * @returns {boolean} true if an API token is currently stored
 */
export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token: string}>} the issued API token, also stored locally
 */
export async function login(username, password) {
  const payload = await apiFetch("/auth/token/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(payload.token);
  return payload;
}

/**
 * @param {string} username
 * @param {string} password
 * @param {string} email
 * @returns {Promise<{token: string}>} the issued API token, also stored locally
 */
export async function register(username, password, email) {
  const payload = await apiFetch("/auth/register/", {
    method: "POST",
    body: JSON.stringify({ username, password, email }),
  });
  setToken(payload.token);
  return payload;
}

/**
 * @returns {void}
 */
export function logout() {
  clearToken();
}

/**
 * @returns {Promise<object>} the current user's profile (username, name, email, avatar_url)
 */
export async function getProfile() {
  return apiFetch("/auth/profile/");
}

/**
 * @param {object} profile - partial profile fields to update
 * @returns {Promise<object>} the updated profile
 */
export async function updateProfile(profile) {
  return apiFetch("/auth/profile/", { method: "PATCH", body: JSON.stringify(profile) });
}

/**
 * @param {string} oldPassword - the account's current password
 * @param {string} newPassword - the new password to set
 * @returns {Promise<object>} the API's confirmation response
 */
export async function changePassword(oldPassword, newPassword) {
  return apiFetch("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

/**
 * @param {File} file - the image file to upload as the user's avatar
 * @returns {Promise<object>} the updated profile
 */
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);
  return apiFetchForm("/auth/profile/avatar/", formData, "POST");
}

/**
 * @returns {Promise<object>} the updated profile, with avatar_url cleared
 */
export async function deleteAvatar() {
  return apiFetch("/auth/profile/avatar/", { method: "DELETE" });
}
