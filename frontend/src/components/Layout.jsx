// By: Md. Fahim Bin Amin
//
// The page shell: header with the current user's avatar/profile link and log-out, or a
// log-in link when signed out. Wraps every routed page's content. Also the one place
// that syncs the active UI language from the signed-in user's stored preference,
// since every authenticated page renders inside this component.

import { LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getProfile, isAuthenticated, logout } from "../api/auth";
import { useTranslation } from "../lib/i18n";
import { useTheme } from "../lib/theme";

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
  const { theme, toggleTheme } = useTheme();

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
    <div className="min-h-screen bg-slate-50 text-ink dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <Link
            to={authed ? "/dashboard" : "/"}
            className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-500"
          >
            {t("nav_brand")}
          </Link>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? t("title_theme_light") : t("title_theme_dark")}
              aria-label={theme === "dark" ? t("title_theme_light") : t("title_theme_dark")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {authed ? (
              <>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <UserRound size={16} />
                  )}
                  {t("nav_profile")}
                </Link>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  type="button"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  {t("nav_logout")}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("nav_login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
    </div>
  );
}
