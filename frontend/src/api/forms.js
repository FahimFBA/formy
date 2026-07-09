import { apiFetch, apiFetchBlob } from "./client";
import { HONEYPOT_FIELD } from "../lib/constants";

export async function fetchPublicForm(slug) {
  return apiFetch(`/public/forms/${slug}/`);
}

export async function submitPublicForm(slug, data, honeypot = "") {
  return apiFetch(`/public/forms/${slug}/submit/`, {
    method: "POST",
    body: JSON.stringify({ data, [HONEYPOT_FIELD]: honeypot }),
  });
}

export async function listForms(page = 1) {
  return apiFetch(`/forms/?page=${page}`);
}

export async function getForm(id) {
  return apiFetch(`/forms/${id}/`);
}

export async function createForm(form) {
  return apiFetch("/forms/", { method: "POST", body: JSON.stringify(form) });
}

export async function updateForm(id, form) {
  return apiFetch(`/forms/${id}/`, { method: "PATCH", body: JSON.stringify(form) });
}

export async function deleteForm(id) {
  return apiFetch(`/forms/${id}/`, { method: "DELETE" });
}

export async function listSubmissions(id) {
  return apiFetch(`/forms/${id}/submissions/`);
}

export async function exportSubmissions(id, format = "csv") {
  return apiFetchBlob(`/forms/${id}/export/?export_format=${format}`);
}
