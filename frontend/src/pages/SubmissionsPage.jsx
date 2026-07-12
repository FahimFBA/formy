// By: Md. Fahim Bin Amin
//
// Lists a form's submissions as raw JSON, with CSV/JSON/PDF export buttons that
// trigger a browser download of the exported file.

import { Download, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { downloadAttachment, exportSubmissions, listSubmissions } from "../api/forms";
import { Layout } from "../components/Layout";
import { useTranslation } from "../lib/i18n";

/**
 * Triggers a browser download for an already-fetched blob.
 * @param {Blob} blob
 * @param {string} filename
 * @returns {void}
 */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * @returns {JSX.Element}
 */
export function SubmissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      saveBlob(blob, filename);
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  async function handleAttachmentDownload(attachmentId) {
    try {
      const { blob, filename } = await downloadAttachment(attachmentId);
      saveBlob(blob, filename);
    } catch (downloadError) {
      setError(downloadError.message);
    }
  }

  return (
    <Layout>
      <button
        className="text-sm font-medium text-brand-700 hover:underline"
        type="button"
        onClick={() => navigate(`/builder/${id}`)}
      >
        {t("link_back_to_builder")}
      </button>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-950">{t("nav_submissions")}</h1>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            type="button"
            onClick={() => handleExport("csv")}
          >
            <Download size={16} />
            {t("btn_export_csv")}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            type="button"
            onClick={() => handleExport("json")}
          >
            <Download size={16} />
            {t("btn_export_json")}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            type="button"
            onClick={() => handleExport("pdf")}
          >
            <Download size={16} />
            {t("btn_export_pdf")}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-slate-600">{t("msg_loading")}</p> : null}

      {!loading && submissions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">{t("msg_no_submissions")}</p>
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
            {submission.attachments?.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {submission.attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    title={t("title_download_attachment")}
                    onClick={() => handleAttachmentDownload(attachment.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Paperclip size={12} />
                    {attachment.filename}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Layout>
  );
}
