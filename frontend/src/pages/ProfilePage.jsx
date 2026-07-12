// By: Md. Fahim Bin Amin
//
// Account settings page: profile details (including UI language), avatar
// upload/removal, and password change, each with its own independent
// loading/error/success state since they save separately.

import { UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { changePassword, deleteAvatar, getProfile, updateProfile, uploadAvatar } from "../api/auth";
import { Layout } from "../components/Layout";
import { SUPPORTED_LANGUAGES, useTranslation } from "../lib/i18n";

/**
 * @returns {JSX.Element}
 */
export function ProfilePage() {
  const { t, setLanguage } = useTranslation();
  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    avatar_url: null,
    language: "en",
  });
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [avatarError, setAvatarError] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((error) => setProfileError(error.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setAvatarError("");
    setSavingAvatar(true);
    try {
      const updated = await uploadAvatar(file);
      setProfile(updated);
    } catch (error) {
      setAvatarError(error.message);
    } finally {
      setSavingAvatar(false);
      event.target.value = "";
    }
  }

  async function handleAvatarRemove() {
    setAvatarError("");
    setSavingAvatar(true);
    try {
      const updated = await deleteAvatar();
      setProfile(updated);
    } catch (error) {
      setAvatarError(error.message);
    } finally {
      setSavingAvatar(false);
    }
  }

  function handleLanguageChange(nextLanguage) {
    setProfile({ ...profile, language: nextLanguage });
    setLanguage(nextLanguage);
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setSavingProfile(true);
    try {
      const updated = await updateProfile(profile);
      setProfile(updated);
      setLanguage(updated.language);
      setProfileSuccess(t("msg_profile_updated"));
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError(t("err_password_mismatch"));
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(passwords.oldPassword, passwords.newPassword);
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSuccess(t("msg_password_changed"));
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-sm text-slate-600">{t("msg_loading")}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-slate-950">{t("title_profile_settings")}</h1>

      <div className="mt-6 flex max-w-xl items-center gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-panel">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Profile avatar"
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <UserRound size={28} />
          </div>
        )}

        <div>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              type="button"
              disabled={savingAvatar}
              onClick={() => avatarInputRef.current?.click()}
            >
              {savingAvatar ? t("btn_saving_dots") : t("btn_change_photo")}
            </button>
            {profile.avatar_url ? (
              <button
                className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                type="button"
                disabled={savingAvatar}
                onClick={handleAvatarRemove}
              >
                {t("btn_remove")}
              </button>
            ) : null}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <p className="mt-2 text-xs text-slate-500">{t("hint_avatar_formats")}</p>
          {avatarError ? <p className="mt-2 text-sm text-red-700">{avatarError}</p> : null}
        </div>
      </div>

      <form
        onSubmit={handleProfileSubmit}
        className="mt-6 max-w-xl space-y-4 rounded-md border border-slate-200 bg-white p-6 shadow-panel"
      >
        <h2 className="text-lg font-semibold text-slate-950">{t("lbl_account_details")}</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="username">
            {t("lbl_username")}
          </label>
          <input
            id="username"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={profile.username}
            onChange={(event) => setProfile({ ...profile, username: event.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="first_name">
              {t("lbl_first_name")}
            </label>
            <input
              id="first_name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={profile.first_name}
              onChange={(event) => setProfile({ ...profile, first_name: event.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="last_name">
              {t("lbl_last_name")}
            </label>
            <input
              id="last_name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={profile.last_name}
              onChange={(event) => setProfile({ ...profile, last_name: event.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            {t("lbl_email")}
          </label>
          <input
            id="email"
            type="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={profile.email}
            onChange={(event) => setProfile({ ...profile, email: event.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="language">
            {t("lbl_language")}
          </label>
          <select
            id="language"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={profile.language}
            onChange={(event) => handleLanguageChange(event.target.value)}
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {t(`lbl_language_${code}`)}
              </option>
            ))}
          </select>
        </div>

        {profileError ? <p className="text-sm text-red-700">{profileError}</p> : null}
        {profileSuccess ? <p className="text-sm text-green-700">{profileSuccess}</p> : null}

        <button
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          type="submit"
          disabled={savingProfile}
        >
          {savingProfile ? t("btn_saving_dots") : t("btn_save_changes")}
        </button>
      </form>

      <form
        onSubmit={handlePasswordSubmit}
        className="mt-6 max-w-xl space-y-4 rounded-md border border-slate-200 bg-white p-6 shadow-panel"
      >
        <h2 className="text-lg font-semibold text-slate-950">{t("lbl_change_password_heading")}</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="old_password">
            {t("lbl_current_password")}
          </label>
          <input
            id="old_password"
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={passwords.oldPassword}
            onChange={(event) => setPasswords({ ...passwords, oldPassword: event.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="new_password">
            {t("lbl_new_password")}
          </label>
          <input
            id="new_password"
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={passwords.newPassword}
            onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="confirm_password">
            {t("lbl_confirm_new_password")}
          </label>
          <input
            id="confirm_password"
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={passwords.confirmPassword}
            onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })}
          />
        </div>

        {passwordError ? <p className="text-sm text-red-700">{passwordError}</p> : null}
        {passwordSuccess ? <p className="text-sm text-green-700">{passwordSuccess}</p> : null}

        <button
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          type="submit"
          disabled={savingPassword}
        >
          {savingPassword ? t("btn_saving_dots") : t("btn_update_password")}
        </button>
      </form>
    </Layout>
  );
}
