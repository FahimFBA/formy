import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { fieldTypes } from "../lib/defaultSchema";

function toFieldName(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function SchemaEditor({ schema, onChange }) {
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
          label: "New field",
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
          <h2 className="text-xl font-semibold text-slate-950">Builder</h2>
          <p className="mt-1 text-sm text-slate-600">
            Compose reusable fields from a portable JSON schema. Drag the handle to reorder.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          type="button"
          onClick={addField}
        >
          <Plus size={16} />
          Add
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
                title="Drag to reorder"
                aria-label="Drag to reorder field"
              >
                <GripVertical size={16} />
              </button>
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Field {index + 1}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Label
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={field.label}
                  onChange={(event) => updateField(index, { label: event.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Type
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={field.type}
                  onChange={(event) => updateField(index, { type: event.target.value })}
                >
                  {fieldTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Name
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={field.name}
                  onChange={(event) => updateField(index, { name: event.target.value })}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Placeholder
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={field.placeholder ?? ""}
                  onChange={(event) => updateField(index, { placeholder: event.target.value })}
                />
              </label>
            </div>

            {field.type === "select" ? (
              <label className="mt-3 block space-y-1 text-sm font-medium text-slate-700">
                Options
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(field.options ?? []).join(", ")}
                  onChange={(event) =>
                    updateField(index, {
                      options: event.target.value
                        .split(",")
                        .map((option) => option.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(event) => updateField(index, { required: event.target.checked })}
                />
                Required
              </label>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-700 transition hover:bg-red-50"
                type="button"
                title="Remove field"
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
