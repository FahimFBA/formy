// By: Md. Fahim Bin Amin
//
// A separate, dependency-free vanilla-JS entry point (built by vite.embed.config.js,
// npm run build:embed) that mounts and submits a single published form into any HTML
// page via <div data-formy-form="slug">, no React runtime shipped. See
// docs/integration-guide.md for the embed snippet and CORS requirements. Unlike the
// React app, this widget has no signed-in user to read a language preference from, so
// its own chrome (loading/submit/error text) always renders in English from
// label-universe/labels.json; only the form's own schema-defined labels reflect
// whatever language the form owner authored them in.

import { HONEYPOT_FIELD } from "../lib/constants";
import countries from "../../../label-universe/countries.json";
import rawLabels from "../../../label-universe/labels.json";

/**
 * @param {string} key - a key from labels.json
 * @returns {string} that key's English string
 */
function label(key) {
  return rawLabels[key].en;
}

const STYLE_ID = "formy-embed-styles";

/**
 * Injects the embed's stylesheet into the host page once, no-op on repeat calls.
 * @returns {void}
 */
function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .formy-embed { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 480px; }
    .formy-embed-field { margin-bottom: 1rem; }
    .formy-embed-label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; color: #1f2933; }
    .formy-embed-input, .formy-embed-textarea, .formy-embed-select {
      width: 100%; box-sizing: border-box; padding: 0.5rem 0.75rem; font-size: 0.875rem;
      border: 1px solid #cbd5e1; border-radius: 0.375rem; font: inherit;
    }
    .formy-embed-checkbox-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
    .formy-embed-hp {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    .formy-embed-button {
      display: inline-flex; align-items: center; gap: 0.5rem; background: #128762; color: #fff;
      border: none; border-radius: 0.375rem; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600; cursor: pointer;
    }
    .formy-embed-button:disabled { opacity: 0.6; cursor: not-allowed; }
    .formy-embed-file-container { display: flex; flex-direction: column; gap: 0.5rem; }
    .formy-embed-file-row {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      border: 1px solid #cbd5e1; border-radius: 0.375rem; background: #f8fafc; padding: 0.5rem 0.75rem;
      font-size: 0.875rem; color: #334155;
    }
    .formy-embed-file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .formy-embed-file-remove {
      border: none; background: transparent; color: #94a3b8; cursor: pointer; font-size: 1rem;
      line-height: 1; padding: 0.25rem; border-radius: 0.25rem;
    }
    .formy-embed-file-remove:hover { background: #e2e8f0; color: #b91c1c; }
    .formy-embed-dropzone {
      display: flex; flex-direction: column; align-items: center; gap: 0.25rem; cursor: pointer;
      border: 2px dashed #cbd5e1; border-radius: 0.375rem; background: #f8fafc; padding: 1.25rem 1rem;
      text-align: center; color: #64748b;
    }
    .formy-embed-dropzone:hover { border-color: #1aa879; background: #eefdf7; }
    .formy-embed-dropzone-title { font-size: 0.875rem; font-weight: 600; color: #334155; }
    .formy-embed-dropzone-hint { font-size: 0.75rem; color: #64748b; }
    .formy-embed-notice { margin-top: 0.75rem; padding: 0.5rem 0.75rem; border-radius: 0.375rem; font-size: 0.875rem; }
    .formy-embed-notice.success { background: #eefdf7; border: 1px solid #d5f8ea; color: #0d6f52; }
    .formy-embed-notice.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
  `;
  document.head.appendChild(style);
}

/**
 * Builds the DOM for a single schema field.
 * @param {object} field - one field definition from the schema (name, type, label, ...)
 * @param {*} initialValue - the field's current value
 * @param {(name: string, value: *) => void} onChange
 * @returns {HTMLDivElement} the field's wrapper element
 */
function createField(field, initialValue, onChange) {
  const wrapper = document.createElement("div");
  wrapper.className = "formy-embed-field";

  if (field.type === "checkbox") {
    const row = document.createElement("label");
    row.className = "formy-embed-checkbox-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = field.name;
    input.checked = Boolean(initialValue);
    input.addEventListener("change", () => onChange(field.name, input.checked));
    row.appendChild(input);
    row.appendChild(document.createTextNode(field.label));
    wrapper.appendChild(row);
    return wrapper;
  }

  if (field.type === "multi_select") {
    const legend = document.createElement("span");
    legend.className = "formy-embed-label";
    legend.textContent = field.label + (field.required ? " *" : "");
    wrapper.appendChild(legend);

    const selected = Array.isArray(initialValue) ? [...initialValue] : [];
    (field.options ?? []).forEach((option) => {
      const row = document.createElement("label");
      row.className = "formy-embed-checkbox-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = field.name;
      input.value = option;
      input.checked = selected.includes(option);
      input.addEventListener("change", () => {
        if (input.checked) {
          selected.push(option);
        } else {
          selected.splice(selected.indexOf(option), 1);
        }
        onChange(field.name, [...selected]);
      });
      row.appendChild(input);
      row.appendChild(document.createTextNode(option));
      wrapper.appendChild(row);
    });
    return wrapper;
  }

  const labelEl = document.createElement("label");
  labelEl.className = "formy-embed-label";
  labelEl.textContent = field.label + (field.required ? " *" : "");
  labelEl.setAttribute("for", field.name);
  wrapper.appendChild(labelEl);

  if (field.type === "phone") {
    const phoneValue = initialValue && typeof initialValue === "object" ? initialValue : {};
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.flexWrap = "wrap";
    row.style.gap = "0.5rem";

    const select = document.createElement("select");
    select.className = "formy-embed-select";
    select.style.flex = "0 0 auto";
    select.style.width = "9rem";
    select.style.minWidth = "0";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = label("opt_select_country_placeholder");
    select.appendChild(blank);
    countries.forEach((country) => {
      const opt = document.createElement("option");
      opt.value = country.dial_code;
      opt.textContent = `${country.name.en} (${country.dial_code})`;
      select.appendChild(opt);
    });
    select.value = phoneValue.country_code ?? "";
    select.addEventListener("change", () => onChange(field.name, { ...phoneValue, country_code: select.value }));

    const number = document.createElement("input");
    number.type = "tel";
    number.className = "formy-embed-input";
    number.style.flex = "1 1 10rem";
    number.style.minWidth = "0";
    number.id = field.name;
    number.name = field.name;
    if (field.placeholder) {
      number.placeholder = field.placeholder;
    }
    if (field.required) {
      number.required = true;
    }
    number.value = phoneValue.number ?? "";
    number.addEventListener("input", () => onChange(field.name, { ...phoneValue, number: number.value }));

    row.appendChild(select);
    row.appendChild(number);
    wrapper.appendChild(row);
    return wrapper;
  }

  if (field.type === "file") {
    const maxFiles = field.max_files ?? 1;
    let files = Array.isArray(initialValue) ? [...initialValue] : [];

    const container = document.createElement("div");
    container.className = "formy-embed-file-container";

    /**
     * Rebuilds the file rows and dropzone from the current `files` array. Called on
     * mount and after every add/remove, since this widget has no framework to diff
     * the DOM for it.
     * @returns {void}
     */
    function renderFiles() {
      container.innerHTML = "";

      files.forEach((file, index) => {
        const row = document.createElement("div");
        row.className = "formy-embed-file-row";

        const name = document.createElement("span");
        name.className = "formy-embed-file-name";
        name.textContent = `\u{1F4CE} ${file.name}`;
        row.appendChild(name);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "formy-embed-file-remove";
        removeButton.textContent = "×";
        removeButton.setAttribute("aria-label", label("btn_remove"));
        removeButton.addEventListener("click", () => {
          files = files.filter((_, fileIndex) => fileIndex !== index);
          onChange(field.name, files);
          renderFiles();
        });
        row.appendChild(removeButton);

        container.appendChild(row);
      });

      if (files.length >= maxFiles) {
        return;
      }

      const dropzone = document.createElement("label");
      dropzone.className = "formy-embed-dropzone";
      dropzone.setAttribute("for", field.name);
      dropzone.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/>' +
        '<path d="M5 21h14"/></svg>';

      const title = document.createElement("span");
      title.className = "formy-embed-dropzone-title";
      title.textContent = label("btn_choose_file");
      dropzone.appendChild(title);

      const hint = document.createElement("span");
      hint.className = "formy-embed-dropzone-hint";
      hint.textContent = field.placeholder || label("hint_file_dropzone");
      dropzone.appendChild(hint);

      const input = document.createElement("input");
      input.type = "file";
      input.style.display = "none";
      input.id = field.name;
      input.name = field.name;
      if (field.accept) {
        input.accept = field.accept;
      }
      if (maxFiles > 1) {
        input.multiple = true;
      }
      if (field.required && files.length === 0) {
        input.required = true;
      }
      input.addEventListener("change", () => {
        files = [...files, ...Array.from(input.files ?? [])].slice(0, maxFiles);
        onChange(field.name, files);
        renderFiles();
      });
      dropzone.appendChild(input);

      dropzone.addEventListener("dragover", (event) => event.preventDefault());
      dropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        files = [...files, ...Array.from(event.dataTransfer.files ?? [])].slice(0, maxFiles);
        onChange(field.name, files);
        renderFiles();
      });

      container.appendChild(dropzone);
    }

    renderFiles();
    wrapper.appendChild(container);
    return wrapper;
  }

  let input;
  if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.className = "formy-embed-textarea";
    input.rows = 4;
  } else if (field.type === "select") {
    input = document.createElement("select");
    input.className = "formy-embed-select";
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = label("opt_select_placeholder");
    input.appendChild(blank);
    (field.options ?? []).forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      input.appendChild(opt);
    });
  } else {
    input = document.createElement("input");
    input.type = ["email", "number", "date"].includes(field.type) ? field.type : "text";
    input.className = "formy-embed-input";
  }

  input.id = field.name;
  input.name = field.name;
  if (field.placeholder) {
    input.placeholder = field.placeholder;
  }
  if (field.required) {
    input.required = true;
  }
  input.value = initialValue ?? "";
  input.addEventListener("input", () => onChange(field.name, input.value));

  wrapper.appendChild(input);
  return wrapper;
}

/**
 * Fetches a published form and mounts a working, submittable version of it into container.
 * @param {HTMLElement} container - the host page's [data-formy-form] element
 * @param {string} apiBase - the backend's /api base URL
 * @param {string} slug - the published form's slug
 * @returns {Promise<void>}
 */
async function mountForm(container, apiBase, slug) {
  injectStyles();
  container.classList.add("formy-embed");
  container.textContent = label("msg_loading");

  let form;
  try {
    const response = await fetch(`${apiBase}/public/forms/${slug}/`);
    if (!response.ok) {
      throw new Error(label("err_unable_to_load_form"));
    }
    form = await response.json();
  } catch (error) {
    container.textContent = error.message;
    return;
  }

  const values = {};
  container.textContent = "";

  const formEl = document.createElement("form");
  const notice = document.createElement("div");

  (form.schema.fields ?? []).forEach((field) => {
    formEl.appendChild(
      createField(field, values[field.name], (name, value) => {
        values[name] = value;
      }),
    );
  });

  const hpWrapper = document.createElement("div");
  hpWrapper.className = "formy-embed-hp";
  hpWrapper.setAttribute("aria-hidden", "true");
  const hpInput = document.createElement("input");
  hpInput.type = "text";
  hpInput.tabIndex = -1;
  hpInput.autocomplete = "off";
  hpInput.name = HONEYPOT_FIELD;
  hpWrapper.appendChild(hpInput);
  formEl.appendChild(hpWrapper);

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "formy-embed-button";
  button.textContent = label("btn_submit");
  formEl.appendChild(button);

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = label("btn_submitting");
    notice.remove();

    try {
      const isFileValue = (value) =>
        value instanceof File || (Array.isArray(value) && value.length > 0 && value.every((item) => item instanceof File));
      const fileFieldNames = Object.entries(values)
        .filter(([, value]) => isFileValue(value))
        .map(([name]) => name);

      let response;
      if (fileFieldNames.length === 0) {
        response = await fetch(`${apiBase}/public/forms/${slug}/submit/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: values, [HONEYPOT_FIELD]: hpInput.value }),
        });
      } else {
        const jsonData = Object.fromEntries(Object.entries(values).filter(([name]) => !fileFieldNames.includes(name)));
        const formData = new FormData();
        formData.append("data", JSON.stringify(jsonData));
        formData.append(HONEYPOT_FIELD, hpInput.value);
        fileFieldNames.forEach((name) => {
          const value = values[name];
          (Array.isArray(value) ? value : [value]).forEach((file) => formData.append(name, file));
        });
        response = await fetch(`${apiBase}/public/forms/${slug}/submit/`, { method: "POST", body: formData });
      }
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(payload.detail) ? payload.detail.join(" ") : payload.detail || label("err_submission_failed"),
        );
      }

      notice.className = "formy-embed-notice success";
      notice.textContent = payload.message ?? label("msg_submitted_default");
      formEl.reset();
      Object.keys(values).forEach((key) => delete values[key]);
    } catch (error) {
      notice.className = "formy-embed-notice error";
      notice.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = label("btn_submit");
      container.appendChild(notice);
    }
  });

  container.appendChild(formEl);
}

/**
 * @param {HTMLElement} el - a [data-formy-form] element
 * @returns {string} the API base URL to use for that element: its data-formy-api
 *   attribute, then window.FORMY_API_BASE, then the local dev default
 */
function resolveApiBase(el) {
  return el.dataset.formyApi || window.FORMY_API_BASE || "http://localhost:8000/api";
}

/**
 * Mounts every [data-formy-form] element on the page.
 * @returns {void}
 */
function init() {
  document.querySelectorAll("[data-formy-form]").forEach((el) => {
    mountForm(el, resolveApiBase(el), el.dataset.formyForm);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
