import { CheckCircle2, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

// By: Md. Fahim Bin Amin
//
// The anonymous, unauthenticated page at /f/:slug that renders a published form and
// submits responses. Rendered outside Layout since public visitors are not signed in.

import { fetchPublicForm, submitPublicForm } from "../api/forms";
import { FormRenderer } from "../components/FormRenderer";
import { HONEYPOT_FIELD } from "../lib/constants";
import { useTranslation } from "../lib/i18n";
import { useTheme } from "../lib/theme";

/**
 * @returns {JSX.Element}
 */
export function PublicFormPage() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [status, setStatus] = useState("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPublicForm(slug)
      .then(setForm)
      .catch((loadError) => setError(loadError.message));
  }, [slug]);

  function updateValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("submitting");
    setNotice("");

    try {
      const { [HONEYPOT_FIELD]: honeypot, ...data } = values;
      const response = await submitPublicForm(slug, data, honeypot);
      setNotice(response.message ?? t("msg_submitted_default"));
      setValues({});
      setStatus("submitted");
    } catch (submitError) {
      setNotice(submitError.message);
      setStatus("error");
    }
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-ink dark:bg-slate-950 dark:text-slate-100">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-ink dark:bg-slate-950 dark:text-slate-100">
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("msg_loading")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-ink dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-xl">
        {form.allow_theme_toggle ? (
          <div className="mb-3 flex justify-end">
            <button
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? t("title_theme_light") : t("title_theme_dark")}
              aria-label={theme === "dark" ? t("title_theme_light") : t("title_theme_dark")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel dark:border-slate-800 dark:bg-slate-900">
          {form.banner_image_url ? (
            <img src={form.banner_image_url} alt="" className="h-48 w-full object-cover" />
          ) : null}
          <div className="p-6">
            {form.header_text ? (
              <h1 className="mb-4 text-2xl font-bold text-slate-950 dark:text-white">{form.header_text}</h1>
            ) : null}
            <FormRenderer
              title={form.name}
              description={form.description}
              schema={form.schema}
              values={values}
              status={status}
              onChange={updateValue}
              onSubmit={handleSubmit}
            />
            {notice ? (
              <div
                className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                  status === "error"
                    ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                    : "border-brand-100 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
                }`}
              >
                <CheckCircle2 size={16} />
                <span>{notice}</span>
              </div>
            ) : null}
            {form.footer_text ? (
              <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {form.footer_text}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
