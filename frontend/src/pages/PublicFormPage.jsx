import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchPublicForm, submitPublicForm } from "../api/forms";
import { FormRenderer } from "../components/FormRenderer";
import { HONEYPOT_FIELD } from "../lib/constants";

export function PublicFormPage() {
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
      setNotice(response.message ?? "Submitted successfully.");
      setValues({});
      setStatus("submitted");
    } catch (submitError) {
      setNotice(submitError.message);
      setStatus("error");
    }
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-ink">
        <p className="text-sm text-red-700">{error}</p>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-ink">
        <p className="text-sm text-slate-600">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-ink">
      <div className="mx-auto max-w-xl rounded-md border border-slate-200 bg-white p-6 shadow-panel">
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
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-brand-100 bg-brand-50 text-brand-700"
            }`}
          >
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
