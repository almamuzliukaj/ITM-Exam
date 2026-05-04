import { Link, useNavigate } from "react-router-dom";
import { createExam } from "../../lib/examsApi";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function ExamCreatePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { user, loading, error: userError } = useCurrentUser();
  const [form, setForm] = useState({
    title: "",
    description: "",
    durationMinutes: 60,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      setSaving(true);
      await createExam({
        title: form.title,
        description: form.description,
        durationMinutes: Number(form.durationMinutes) || 60,
      });
      nav("/exams");
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || t("examCreate.error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="pageState">{t("examCreate.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("examCreate.userError")}</div>;
  }

  return (
    <AppShell
      user={user}
      badge={t("examCreate.badge")}
      title={t("examCreate.title")}
      subtitle={t("examCreate.subtitle")}
      actions={<Link className="btn" to="/exams">{t("common.cancel")}</Link>}
    >
      <section className="formSurface">
        <div className="surfaceCard">
          <div className="sectionHeader">
            <h3>{t("examCreate.configuration")}</h3>
          </div>
          <div className="sectionBody">
            {error ? <div className="alert">{error}</div> : null}
            <form className="stackLg" onSubmit={onSubmit}>
              <div className="field">
                <div className="label">{t("examCreate.titleLabel")}</div>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Algorithms Midterm"
                  required
                />
              </div>

              <div className="field">
                <label className="label">{t("examCreate.durationLabel")}</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                />
              </div>

              <div className="field">
                <div className="label">{t("examCreate.descriptionLabel")}</div>
                <textarea
                  className="input textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t("examCreate.descriptionPlaceholder")}
                />
              </div>

              <div className="row examFormActions" style={{ justifyContent: "flex-end" }}>
                <Link className="btn" to="/exams">{t("common.back")}</Link>
                <button className="btn btnPrimary" type="submit" disabled={saving}>
                  {saving ? t("examCreate.creating") : t("examCreate.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
