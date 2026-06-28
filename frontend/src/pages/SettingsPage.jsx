import { useState } from "react";
import AppShell from "../components/AppShell";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { changeOwnPassword } from "../lib/auth";

const initialForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function SettingsPage() {
  const { user, loading, error: userError } = useCurrentUser();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="pageState">Loading settings...</div>;
  if (!user) return <div className="pageState">{userError || "You must be signed in."}</div>;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setMessage("");
    setError("");
  }

  function validate() {
    const nextErrors = {};
    if (!form.currentPassword.trim()) nextErrors.currentPassword = "Current password is required.";
    if (!isStrongPassword(form.newPassword)) {
      nextErrors.newPassword = "Use at least 8 characters with uppercase, lowercase, and a number.";
    }
    if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = "Password confirmation does not match.";
    }
    if (form.currentPassword && form.currentPassword === form.newPassword) {
      nextErrors.newPassword = "New password must be different from the current password.";
    }
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await changeOwnPassword(form);
      setMessage(response?.message || "Password changed successfully.");
      setForm(initialForm);
      setFieldErrors({});
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Password could not be changed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      user={user}
      badge="Account settings"
      title="Settings"
      subtitle="Manage your own account security without changing any other user account."
    >
      <div className="settingsLayout">
        <section className="surfaceCard settingsSecurityPanel">
          <div className="sectionHeader">
            <div>
              <h3>Password security</h3>
              <span className="small">Use your current password to confirm this change.</span>
            </div>
            <span className="statusPill statusDraft">{user.role}</span>
          </div>
          <form className="sectionBody settingsPasswordForm" onSubmit={handleSubmit}>
            {message ? <div className="successBanner">{message}</div> : null}
            {error ? <div className="alert">{error}</div> : null}

            <label className="field">
              <span>Current password</span>
              <input
                className={`input${fieldErrors.currentPassword ? " inputInvalid" : ""}`}
                type="password"
                value={form.currentPassword}
                onChange={(event) => updateField("currentPassword", event.target.value)}
                autoComplete="current-password"
              />
              {fieldErrors.currentPassword ? <small className="fieldError">{fieldErrors.currentPassword}</small> : null}
            </label>

            <label className="field">
              <span>New password</span>
              <input
                className={`input${fieldErrors.newPassword ? " inputInvalid" : ""}`}
                type="password"
                value={form.newPassword}
                onChange={(event) => updateField("newPassword", event.target.value)}
                autoComplete="new-password"
              />
              {fieldErrors.newPassword ? <small className="fieldError">{fieldErrors.newPassword}</small> : null}
            </label>

            <label className="field">
              <span>Confirm new password</span>
              <input
                className={`input${fieldErrors.confirmPassword ? " inputInvalid" : ""}`}
                type="password"
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword ? <small className="fieldError">{fieldErrors.confirmPassword}</small> : null}
            </label>

            <div className="settingsPasswordRules">
              <span>Password rule</span>
              <strong>Minimum 8 characters with uppercase, lowercase, and number.</strong>
            </div>

            <div className="formActionsBar formActionsBarStart">
              <button className="btn btnPrimary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Change password"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}

function isStrongPassword(password) {
  return Boolean(password && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password));
}
