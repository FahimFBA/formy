// By: Md. Fahim Bin Amin
//
// Renders any supported form schema as an actual HTML form. Used both for the builder's
// live preview and the public form page, and depends only on a schema plus
// values/callbacks (no routing or auth), so it stays reusable in embeds too.

import { Send } from "lucide-react";

import { HONEYPOT_FIELD } from "../lib/constants";
import { useTranslation } from "../lib/i18n";

/**
 * Renders a single schema field as its matching input control.
 * @param {object} props
 * @param {object} props.field - one field definition from the schema (name, type, label, ...)
 * @param {*} props.value - the field's current value
 * @param {(name: string, value: *) => void} props.onChange
 * @returns {JSX.Element}
 */
function Field({ field, value, onChange }) {
  const { t } = useTranslation();
  const baseClass =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

  if (field.type === "textarea") {
    return (
      <textarea
        className={`${baseClass} min-h-28 resize-y`}
        id={field.name}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        value={value ?? ""}
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        className={baseClass}
        id={field.name}
        name={field.name}
        required={field.required}
        value={value ?? ""}
        onChange={(event) => onChange(field.name, event.target.value)}
      >
        <option value="">{t("opt_select_placeholder")}</option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
        <input
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
          id={field.name}
          name={field.name}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(field.name, event.target.checked)}
        />
        <span>{field.placeholder || t("lbl_checkbox_yes")}</span>
      </label>
    );
  }

  return (
    <input
      className={baseClass}
      id={field.name}
      name={field.name}
      type={field.type}
      placeholder={field.placeholder}
      required={field.required}
      value={value ?? ""}
      onChange={(event) => onChange(field.name, event.target.value)}
    />
  );
}

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {object} props.schema - the form schema being rendered ({ fields: [...] })
 * @param {object} props.values - current field values, keyed by field name
 * @param {(name: string, value: *) => void} props.onChange
 * @param {(event: React.FormEvent) => void} props.onSubmit
 * @param {string} [props.status] - "submitting" disables the submit button
 * @returns {JSX.Element}
 */
export function FormRenderer({ title, description, schema, values, onChange, onSubmit, status }) {
  const { t } = useTranslation();

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>

      {(schema.fields ?? []).map((field) => (
        <div key={field.name} className="space-y-2">
          <label className="block text-sm font-medium text-slate-800" htmlFor={field.name}>
            {field.label}
            {field.required ? <span className="text-accent"> *</span> : null}
          </label>
          <Field field={field} value={values[field.name]} onChange={onChange} />
        </div>
      ))}

      {/* Honeypot: visually hidden (in normal flow, no negative offset) so real users never see
          or fill it; bots that autofill every input trip it and get silently dropped server-side. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor={HONEYPOT_FIELD}>{t("lbl_honeypot")}</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values[HONEYPOT_FIELD] ?? ""}
          onChange={(event) => onChange(HONEYPOT_FIELD, event.target.value)}
        />
      </div>

      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={status === "submitting"}
        type="submit"
      >
        <Send size={16} />
        {status === "submitting" ? t("btn_submitting") : t("btn_submit")}
      </button>
    </form>
  );
}

