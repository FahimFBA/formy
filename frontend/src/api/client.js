// By: Md. Fahim Bin Amin
//
// Centralizes fetch calls to the Formy API: base URL, auth token storage/attachment,
// JSON/multipart request helpers, and error message unwrapping shared by every
// api/*.js module.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
const TOKEN_KEY = "formy_token";

/**
 * @returns {string|null} the stored API token, or null if the user is signed out
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * @param {string} token - the API token to persist
 * @returns {void}
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * @returns {void}
 */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * @param {object|null} payload - parsed JSON error body from a failed response, if any
 * @param {string} statusText - the response's status text, used as a fallback
 * @returns {string} a single human-readable error message
 */
function extractErrorMessage(payload, statusText) {
  if (!payload) {
    return statusText;
  }
  if (typeof payload.detail === "string") {
    return payload.detail;
  }
  if (Array.isArray(payload.detail)) {
    return payload.detail.join(" ");
  }
  return Object.values(payload).flat().join(" ") || statusText;
}

/**
 * Issues a JSON request against the API, attaching the stored auth token if present.
 * @param {string} path - API path relative to API_BASE_URL, for example "/forms/"
 * @param {RequestInit} [options] - fetch options; Content-Type defaults to application/json
 * @returns {Promise<any>} the parsed JSON response body, or null for empty responses
 * @throws {Error} if the response status is not ok
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, response.statusText));
  }

  return payload;
}

/**
 * Issues a multipart/form-data request against the API (file uploads), attaching the
 * stored auth token if present.
 * @param {string} path - API path relative to API_BASE_URL
 * @param {FormData} formData - the multipart body to send
 * @param {string} [method] - HTTP method, defaults to "POST"
 * @returns {Promise<any>} the parsed JSON response body, or null for empty responses
 * @throws {Error} if the response status is not ok
 */
export async function apiFetchForm(path, formData, method = "POST") {
  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { method, body: formData, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, response.statusText));
  }

  return payload;
}

/**
 * Issues a GET request against the API and returns the response as a downloadable
 * blob, used for CSV/PDF submission exports.
 * @param {string} path - API path relative to API_BASE_URL
 * @returns {Promise<{blob: Blob, filename: string}>} the response body and the
 *   filename parsed from its Content-Disposition header, or "download" if absent
 * @throws {Error} if the response status is not ok
 */
export async function apiFetchBlob(path) {
  const token = getToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    throw new Error(extractErrorMessage(payload, response.statusText));
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/);

  return {
    blob: await response.blob(),
    filename: filenameMatch ? filenameMatch[1] : "download",
  };
}
