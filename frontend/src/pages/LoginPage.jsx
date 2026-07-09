// By: Md. Fahim Bin Amin
//
// Combined login/register page. Toggles between the two modes in place rather than
// routing to a separate page, since they share every field except email.

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login, register } from "../api/auth";
import { Layout } from "../components/Layout";
import { useTranslation } from "../lib/i18n";

/**
 * @returns {JSX.Element}
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password, email);
      }
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-sm rounded-md border border-slate-200 bg-white p-6 shadow-panel">
        <h1 className="text-xl font-semibold text-slate-950">
          {mode === "login" ? t("lbl_login_heading") : t("lbl_register_heading")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {mode === "login" ? t("desc_login") : t("desc_register")}
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            {t("lbl_username")}
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          {mode === "register" ? (
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              {t("lbl_email")}
              <input
                type="email"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          ) : null}

          <label className="block space-y-1 text-sm font-medium text-slate-700">
            {t("lbl_password")}
            <input
              type="password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <button
            className="inline-flex w-full items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={busy}
          >
            {mode === "login" ? t("btn_login") : t("btn_create_account")}
          </button>
        </form>

        <button
          className="mt-4 text-sm font-medium text-brand-700 hover:underline"
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? t("link_need_account") : t("link_have_account")}
        </button>
      </div>
    </Layout>
  );
}
