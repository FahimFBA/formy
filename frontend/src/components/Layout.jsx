// By: Md. Fahim Bin Amin
//
// The page shell: header with the current user's avatar/profile link and log-out, or a
// log-in link when signed out. Wraps every routed page's content. Also the one place
// that syncs the active UI language from the signed-in user's stored preference,
// since every authenticated page renders inside this component.

import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getProfile, isAuthenticated, logout } from "../api/auth";
import { useTranslation } from "../lib/i18n";

/**
 * @param {object} props
 * @param {React.ReactNode} props.children - the routed page content to render below the header
 * @returns {JSX.Element}
 */
export function Layout({ children }) {
  const navigate = useNavigate();
  const authed = isAuthenticated();
  const [avatarUrl, setAvatarUrl] = useState(null);
  const { t, setLanguage } = useTranslation();

  useEffect(() => {
    if (!authed) {
      return;
    }
    getProfile()
      .then((profile) => {
        setAvatarUrl(profile.avatar_url);
        setLanguage(profile.language);
      })
      .catch(() => {});
    // setLanguage is stable across renders (from context), so it is safe to omit here
    // and avoid re-fetching the profile every time the language itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <Link to={authed ? "/dashboard" : "/"} className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            {t("nav_brand")}
          </Link>
          {authed ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
                ) : (
                  <UserRound size={16} />
                )}
                {t("nav_profile")}
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                {t("nav_logout")}
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("nav_login")}
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
    </div>
  );
}
