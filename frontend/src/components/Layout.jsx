import { LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getProfile, isAuthenticated, logout } from "../api/auth";

export function Layout({ children }) {
  const navigate = useNavigate();
  const authed = isAuthenticated();
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (!authed) {
      return;
    }
    getProfile()
      .then((profile) => setAvatarUrl(profile.avatar_url))
      .catch(() => {});
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
            Formy
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
                Profile
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Log in
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
    </div>
  );
}
