// By: Md. Fahim Bin Amin
//
// Lists the current user's forms, paginated, with create and delete (behind a
// ConfirmDialog rather than the browser's native confirm()). PAGE_SIZE must match the
// backend's REST_FRAMEWORK["PAGE_SIZE"] so pageCount is computed correctly.

import { ChevronLeft, ChevronRight, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { createForm, deleteForm, listForms } from "../api/forms";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Layout } from "../components/Layout";
import { useTranslation } from "../lib/i18n";

const PAGE_SIZE = 20;

/**
 * @returns {JSX.Element}
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [forms, setForms] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  useEffect(() => {
    loadForms(page);
  }, [page]);

  async function loadForms(targetPage) {
    setLoading(true);
    try {
      const payload = await listForms(targetPage);
      setForms(payload.results);
      setCount(payload.count);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const suffix = Date.now().toString(36);
    try {
      const form = await createForm({
        name: "Untitled form",
        slug: `untitled-${suffix}`,
        schema: { fields: [] },
      });
      navigate(`/builder/${form.id}`);
    } catch (createError) {
      setError(createError.message);
    }
  }

  async function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteForm(target.id);
      if (forms.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadForms(page);
      }
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-950">{t("title_your_forms")}</h1>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          type="button"
          onClick={handleCreate}
        >
          <Plus size={16} />
          {t("btn_new_form")}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="mt-6 text-sm text-slate-600">{t("msg_loading")}</p>
      ) : forms.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">{t("msg_no_forms")}</p>
      ) : (
        <div className="mt-6 space-y-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-panel"
            >
              <div>
                <Link to={`/builder/${form.id}`} className="font-semibold text-slate-950 hover:underline">
                  {form.name}
                </Link>
                <p className="mt-1 text-sm text-slate-600">
                  /{form.slug} &middot; {t(`lbl_status_${form.status}`)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {form.status === "published" ? (
                  <a
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50"
                    href={`/f/${form.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    title={t("title_open_public_form")}
                  >
                    <ExternalLink size={16} />
                  </a>
                ) : null}
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-700 transition hover:bg-red-50"
                  type="button"
                  title={t("title_delete_form_action")}
                  onClick={() => setPendingDelete(form)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && count > 0 ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{t("msg_forms_summary", { page, pageCount, count })}</p>
          <div className="flex gap-2">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              title={t("title_prev_page")}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => current + 1)}
              title={t("title_next_page")}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t("title_confirm_delete_form")}
        description={pendingDelete ? t("msg_confirm_delete_form", { name: pendingDelete.name }) : ""}
        confirmLabel={t("btn_delete")}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Layout>
  );
}
