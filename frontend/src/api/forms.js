// By: Md. Fahim Bin Amin
//
// Form and submission API calls: the public read/submit endpoints used by the
// unauthenticated form page and embed widget, and the authenticated CRUD/export
// endpoints used by the dashboard and builder.

import { apiFetch, apiFetchBlob, apiFetchForm } from "./client";
import { HONEYPOT_FIELD } from "../lib/constants";

/**
 * @param {string} slug - the published form's slug
 * @returns {Promise<object>} the public form definition (name, schema, success message)
 */
export async function fetchPublicForm(slug) {
  return apiFetch(`/public/forms/${slug}/`);
}

/**
 * @param {string} name - a field name from submitted data
 * @param {*} value - that field's value
 * @returns {boolean} true if value is a File, or an array of one or more Files (a
 *   "file"-type field with `max_files` > 1), either of which needs to be sent as an
 *   actual upload over multipart/form-data rather than the plain JSON path
 */
function isFileValue(value) {
  return value instanceof File || (Array.isArray(value) && value.length > 0 && value.every((item) => item instanceof File));
}

/**
 * @param {string} slug - the published form's slug
 * @param {object} data - submitted field values, keyed by field name; any "file"-type
 *   field's value (a File, or an array of Files for a multi-file field) is sent as
 *   actual uploads over multipart/form-data instead of the plain JSON path
 * @param {string} [honeypot] - the honeypot field's value; non-empty marks the
 *   submission as spam server-side
 * @returns {Promise<object>} the created submission's id and the form's success message
 */
export async function submitPublicForm(slug, data, honeypot = "") {
  const fileFieldNames = Object.entries(data)
    .filter(([, value]) => isFileValue(value))
    .map(([name]) => name);

  if (fileFieldNames.length === 0) {
    return apiFetch(`/public/forms/${slug}/submit/`, {
      method: "POST",
      body: JSON.stringify({ data, [HONEYPOT_FIELD]: honeypot }),
    });
  }

  const jsonData = Object.fromEntries(
    Object.entries(data).filter(([name]) => !fileFieldNames.includes(name))
  );
  const formData = new FormData();
  formData.append("data", JSON.stringify(jsonData));
  formData.append(HONEYPOT_FIELD, honeypot);
  for (const name of fileFieldNames) {
    const value = data[name];
    for (const file of Array.isArray(value) ? value : [value]) {
      formData.append(name, file);
    }
  }

  return apiFetchForm(`/public/forms/${slug}/submit/`, formData, "POST");
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
 * @param {File} file - the image file to upload as the form's banner
 * @returns {Promise<object>} the updated form record
 */
export async function uploadFormBanner(id, file) {
  const formData = new FormData();
  formData.append("banner", file);
  return apiFetchForm(`/forms/${id}/banner/`, formData, "POST");
}

/**
 * @param {string} id - the form's id
 * @returns {Promise<object>} the updated form record, with banner_image_url cleared
 */
export async function deleteFormBanner(id) {
  return apiFetchForm(`/forms/${id}/banner/`, new FormData(), "DELETE");
}

/**
 * @param {string} id - the form's id
 * @param {string} [format] - "csv" (default), "json", or "pdf"
 * @returns {Promise<{blob: Blob, filename: string}>} the export file and its filename
 */
export async function exportSubmissions(id, format = "csv") {
  return apiFetchBlob(`/forms/${id}/export/?export_format=${format}`);
}

/**
 * @param {string} attachmentId - the SubmissionAttachment's id
 * @returns {Promise<{blob: Blob, filename: string}>} the attachment file and its filename
 */
export async function downloadAttachment(attachmentId) {
  return apiFetchBlob(`/attachments/${attachmentId}/download/`);
}
