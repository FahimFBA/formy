// By: Md. Fahim Bin Amin
//
// Edits a single form's metadata and schema (via SchemaEditor), with a live preview
// (via FormRenderer) and a raw JSON view of the schema, side by side.

import { Braces, ClipboardList, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getForm, updateForm } from "../api/forms";
import { FormRenderer } from "../components/FormRenderer";
import { Layout } from "../components/Layout";
import { SchemaEditor } from "../components/SchemaEditor";
import { useTranslation } from "../lib/i18n";

const STATUS_OPTIONS = ["draft", "published", "archived"];

/**
 * @returns {JSX.Element}
 */
export function BuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState(null);
  const [previewValues, setPreviewValues] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getForm(id)
      .then(setForm)
      .catch((loadError) => setError(loadError.message));
  }, [id]);

  function updateField(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const saved = await updateForm(id, {
        name: form.name,
        slug: form.slug,
        description: form.description,
        status: form.status,
        schema: form.schema,
        success_message: form.success_message,
      });
      setForm(saved);
      setNotice(t("msg_saved"));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !form) {
    return (
      <Layout>
        <p className="text-sm text-red-700">{error}</p>
      </Layout>
    );
  }

  if (!form) {
    return (
      <Layout>
        <p className="text-sm text-slate-600">{t("msg_loading")}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between gap-3">
        <button
          className="text-sm font-medium text-brand-700 hover:underline"
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          {t("link_back_to_dashboard")}
        </button>
        <Link
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          to={`/builder/${id}/submissions`}
        >
          <ClipboardList size={16} />
          {t("nav_submissions")}
        </Link>
      </div>

      <form className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]" onSubmit={handleSave}>
        <section className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              {t("lbl_name")}
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.name}
                onChange={(event) => updateField({ name: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              {t("lbl_slug")}
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.slug}
                onChange={(event) => updateField({ slug: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              {t("lbl_status")}
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.status}
                onChange={(event) => updateField({ status: event.target.value })}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`lbl_status_${option}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              {t("lbl_success_message")}
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.success_message}
                onChange={(event) => updateField({ success_message: event.target.value })}
              />
            </label>
          </div>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            {t("lbl_description")}
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => updateField({ description: event.target.value })}
            />
          </label>

          <SchemaEditor schema={form.schema} onChange={(schema) => updateField({ schema })} />

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {notice ? <p className="text-sm text-brand-700">{notice}</p> : null}

          <button
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={saving}
          >
            <Save size={16} />
            {saving ? t("btn_saving") : t("btn_save")}
          </button>
        </section>

        <aside className="space-y-6">
          <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <FormRenderer
              title={form.name}
              description={form.description}
              schema={form.schema}
              values={previewValues}
              status="idle"
              onChange={(name, value) => setPreviewValues((current) => ({ ...current, [name]: value }))}
              onSubmit={(event) => event.preventDefault()}
            />
          </section>

          <section className="rounded-md border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-panel">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Braces size={16} />
              {t("lbl_schema")}
            </div>
            <pre className="max-h-[420px] overflow-auto rounded-md bg-slate-900 p-4 text-xs leading-6 text-slate-200">
              {JSON.stringify(form.schema, null, 2)}
            </pre>
          </section>
        </aside>
      </form>
    </Layout>
  );
}
