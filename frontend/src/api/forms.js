// By: Md. Fahim Bin Amin
//
// Form and submission API calls: the public read/submit endpoints used by the
// unauthenticated form page and embed widget, and the authenticated CRUD/export
// endpoints used by the dashboard and builder.

import { apiFetch, apiFetchBlob } from "./client";
import { HONEYPOT_FIELD } from "../lib/constants";

/**
 * @param {string} slug - the published form's slug
 * @returns {Promise<object>} the public form definition (name, schema, success message)
 */
export async function fetchPublicForm(slug) {
  return apiFetch(`/public/forms/${slug}/`);
}

/**
 * @param {string} slug - the published form's slug
 * @param {object} data - submitted field values, keyed by field name
 * @param {string} [honeypot] - the honeypot field's value; non-empty marks the
 *   submission as spam server-side
 * @returns {Promise<object>} the created submission's id and the form's success message
 */
export async function submitPublicForm(slug, data, honeypot = "") {
  return apiFetch(`/public/forms/${slug}/submit/`, {
    method: "POST",
    body: JSON.stringify({ data, [HONEYPOT_FIELD]: honeypot }),
  });
}

/**
 * @param {number} [page] - 1-based page number
 * @returns {Promise<object>} a paginated list of the current user's forms
 */
export async function listForms(page = 1) {
  return apiFetch(`/forms/?page=${page}`);
}

/**
 * @param {string} id - the form's id
 * @returns {Promise<object>} the full form record
 */
export async function getForm(id) {
  return apiFetch(`/forms/${id}/`);
}

/**
 * @param {object} form - form fields to create (name, slug, schema, and so on)
 * @returns {Promise<object>} the created form record
 */
export async function createForm(form) {
  return apiFetch("/forms/", { method: "POST", body: JSON.stringify(form) });
}

/**
 * @param {string} id - the form's id
 * @param {object} form - partial form fields to update
 * @returns {Promise<object>} the updated form record
 */
export async function updateForm(id, form) {
  return apiFetch(`/forms/${id}/`, { method: "PATCH", body: JSON.stringify(form) });
}

/**
 * @param {string} id - the form's id
 * @returns {Promise<null>} resolves once the form is deleted
 */
export async function deleteForm(id) {
  return apiFetch(`/forms/${id}/`, { method: "DELETE" });
}

/**
 * @param {string} id - the form's id
 * @returns {Promise<object>} a paginated list of the form's submissions
 */
export async function listSubmissions(id) {
  return apiFetch(`/forms/${id}/submissions/`);
}

/**
 * @param {string} id - the form's id
 * @param {string} [format] - "csv" (default), "json", or "pdf"
 * @returns {Promise<{blob: Blob, filename: string}>} the export file and its filename
 */
export async function exportSubmissions(id, format = "csv") {
  return apiFetchBlob(`/forms/${id}/export/?export_format=${format}`);
}
