// By: Md. Fahim Bin Amin
//
// Edits a form's schema: add/remove/reorder fields (drag-and-drop) and edit each
// field's label, type, name, placeholder, required flag, and select options.

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { fieldTypes } from "../lib/defaultSchema";
import { useTranslation } from "../lib/i18n";

/**
 * @param {string} label - a field's human-readable label
 * @returns {string} a slug-like field name derived from label (lowercased, non-alphanumeric
 *   runs collapsed to underscores, leading/trailing underscores trimmed)
 */
function toFieldName(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * @param {object} props
 * @param {object} props.schema - the schema being edited ({ fields: [...] })
 * @param {(schema: object) => void} props.onChange - called with the full updated schema
 * @returns {JSX.Element}
 */
export function SchemaEditor({ schema, onChange }) {
  const { t } = useTranslation();
  const fields = schema.fields ?? [];
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  function updateField(index, patch) {
    const nextFields = fields.map((field, fieldIndex) => {
      if (fieldIndex !== index) {
        return field;
      }

      const nextField = { ...field, ...patch };
      if (patch.label && (!field.name || field.name === toFieldName(field.label))) {
        nextField.name = toFieldName(patch.label);
      }
      return nextField;
    });

    onChange({ ...schema, fields: nextFields });
  }

  function addField() {
    onChange({
      ...schema,
      fields: [
        ...fields,
        {
          name: `field_${fields.length + 1}`,
          label: t("lbl_new_field_default"),
          type: "text",
          required: false,
          placeholder: "",
        },
      ],
    });
  }

  function removeField(index) {
    onChange({ ...schema, fields: fields.filter((_, fieldIndex) => fieldIndex !== index) });
  }

  function moveField(from, to) {
    if (from === to || from == null || to == null) {
      return;
    }
    const nextFields = [...fields];
    const [moved] = nextFields.splice(from, 1);
    nextFields.splice(to, 0, moved);
    onChange({ ...schema, fields: nextFields });
  }

  function handleDrop(index) {
    moveField(dragIndex, index);
    setDragIndex(null);
    setDropIndex(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{t("lbl_schema")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("desc_builder")}</p>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          type="button"
          onClick={addField}
        >
          <Plus size={16} />
          {t("btn_add")}
        </button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <section
            key={index}
            className={`rounded-md border bg-white p-4 transition ${
              dropIndex === index ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDropIndex(index);
            }}
            onDragLeave={() => setDropIndex((current) => (current === index ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(index);
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                className="cursor-grab touch-none rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 active:cursor-grabbing"
                title={t("title_drag_reorder")}
                aria-label={t("title_drag_reorder")}
              >
                <GripVertical size={16} />
              </button>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {t("lbl_field_n", { n: index + 1 })}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                {t("lbl_label")}
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={field.label}
                  onChange={(event) => updateField(index, { label: event.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                {t("lbl_type")}
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={field.type}
                  onChange={(event) => updateField(index, { type: event.target.value })}
                >
                  {fieldTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(`lbl_field_type_${type}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                {t("lbl_name")}
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={field.name}
                  onChange={(event) => updateField(index, { name: event.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                {t("lbl_placeholder")}
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={field.placeholder ?? ""}
                  onChange={(event) => updateField(index, { placeholder: event.target.value })}
                />
              </label>
            </div>

            {field.type === "select" || field.type === "multi_select" ? (
              <div className="mt-3 space-y-2">
                <span className="block text-sm font-medium text-slate-700">{t("lbl_options")}</span>
                {(field.options ?? []).map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <input
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={option}
                      onChange={(event) => {
                        const nextOptions = [...(field.options ?? [])];
                        nextOptions[optionIndex] = event.target.value;
                        updateField(index, { options: nextOptions });
                      }}
                    />
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-md border border-red-200 text-red-700 transition hover:bg-red-50"
                      title={t("title_remove_option")}
                      onClick={() =>
                        updateField(index, {
                          options: (field.options ?? []).filter((_, i) => i !== optionIndex),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  onClick={() => updateField(index, { options: [...(field.options ?? []), ""] })}
                >
                  <Plus size={14} />
                  {t("btn_add_option")}
                </button>
              </div>
            ) : null}

            {field.type === "file" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {t("lbl_accepted_file_types")}
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder=".pdf, .docx, .png"
                    value={field.accept ?? ""}
                    onChange={(event) => updateField(index, { accept: event.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {t("lbl_max_files")}
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    type="number"
                    min={1}
                    value={field.max_files ?? 1}
                    onChange={(event) =>
                      updateField(index, { max_files: Math.max(1, Number(event.target.value) || 1) })
                    }
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(event) => updateField(index, { required: event.target.checked })}
                />
                {t("lbl_required")}
              </label>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-700 transition hover:bg-red-50"
                type="button"
                title={t("title_remove_field")}
                onClick={() => removeField(index)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
