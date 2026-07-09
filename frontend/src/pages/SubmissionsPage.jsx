import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { exportSubmissions, listSubmissions } from "../api/forms";
import { Layout } from "../components/Layout";

export function SubmissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSubmissions(id)
      .then((payload) => setSubmissions(payload.results))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleExport(format) {
    try {
      const { blob, filename } = await exportSubmissions(id, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  return (
    <Layout>
      <button
        className="text-sm font-medium text-brand-700 hover:underline"
        type="button"
        onClick={() => navigate(`/builder/${id}`)}
      >
        Back to builder
      </button>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-950">Submissions</h1>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            type="button"
            onClick={() => handleExport("csv")}
          >
            <Download size={16} />
            CSV
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            type="button"
            onClick={() => handleExport("json")}
          >
            <Download size={16} />
            JSON
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            type="button"
            onClick={() => handleExport("pdf")}
          >
            <Download size={16} />
            PDF
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">Loading...</p> : null}

      {!loading && submissions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No submissions yet.</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {submissions.map((submission) => (
          <div key={submission.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <p className="text-xs text-slate-500">
              {new Date(submission.submitted_at).toLocaleString()} &middot; schema v{submission.schema_version}
            </p>
            <pre className="mt-2 overflow-auto rounded-md bg-slate-50 p-3 text-xs leading-6 text-slate-800">
              {JSON.stringify(submission.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </Layout>
  );
}
