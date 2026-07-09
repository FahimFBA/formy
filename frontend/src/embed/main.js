import { HONEYPOT_FIELD } from "../lib/constants";

const STYLE_ID = "formy-embed-styles";

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
    .formy-embed-notice { margin-top: 0.75rem; padding: 0.5rem 0.75rem; border-radius: 0.375rem; font-size: 0.875rem; }
    .formy-embed-notice.success { background: #eefdf7; border: 1px solid #d5f8ea; color: #0d6f52; }
    .formy-embed-notice.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
  `;
  document.head.appendChild(style);
}

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

  const label = document.createElement("label");
  label.className = "formy-embed-label";
  label.textContent = field.label + (field.required ? " *" : "");
  label.setAttribute("for", field.name);
  wrapper.appendChild(label);

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
    blank.textContent = "Select an option";
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

async function mountForm(container, apiBase, slug) {
  injectStyles();
  container.classList.add("formy-embed");
  container.textContent = "Loading...";

  let form;
  try {
    const response = await fetch(`${apiBase}/public/forms/${slug}/`);
    if (!response.ok) {
      throw new Error("Unable to load form.");
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
  button.textContent = "Submit";
  formEl.appendChild(button);

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    button.textContent = "Submitting";
    notice.remove();

    try {
      const response = await fetch(`${apiBase}/public/forms/${slug}/submit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values, [HONEYPOT_FIELD]: hpInput.value }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(Array.isArray(payload.detail) ? payload.detail.join(" ") : payload.detail || "Submission failed.");
      }

      notice.className = "formy-embed-notice success";
      notice.textContent = payload.message ?? "Submitted successfully.";
      formEl.reset();
      Object.keys(values).forEach((key) => delete values[key]);
    } catch (error) {
      notice.className = "formy-embed-notice error";
      notice.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Submit";
      container.appendChild(notice);
    }
  });

  container.appendChild(formEl);
}

function resolveApiBase(el) {
  return el.dataset.formyApi || window.FORMY_API_BASE || "http://localhost:8000/api";
}

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
