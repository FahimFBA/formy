// By: Md. Fahim Bin Amin
//
// A small reusable confirmation modal used anywhere a destructive action needs
// confirmation instead of the browser's native confirm(). Backdrop click, Escape, and
// a Cancel button all dismiss it without confirming.

import { useEffect } from "react";

import { useTranslation } from "../lib/i18n";

/**
 * @param {object} props
 * @param {boolean} props.open - whether the dialog is visible
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {string} [props.confirmLabel] - defaults to the translated "Confirm"
 * @param {string} [props.cancelLabel] - defaults to the translated "Cancel"
 * @param {boolean} [props.danger] - styles the confirm button as destructive (red)
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 * @returns {JSX.Element|null} null when closed
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-950">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            type="button"
            onClick={onCancel}
          >
            {cancelLabel ?? t("btn_cancel")}
          </button>
          <button
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700"
            }`}
            type="button"
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel ?? t("btn_confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
