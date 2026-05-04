import { Link, useNavigate } from "react-router-dom";
import { createExam } from "../../lib/examsApi";
import { listMyOfferings } from "../../lib/academicApi";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ExamCreatePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { user, loading, error: userError } = useCurrentUser();
  const [form, setForm] = useState({
    title: "",
    description: "",
    durationMinutes: 60,
    courseOfferingId: "",
  });
  const [offerings, setOfferings] = useState([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOfferings() {
      try {
        setLoadingOfferings(true);
        const data = await listMyOfferings();
        const rows = Array.isArray(data) ? data : [];
        if (!active) return;
        setOfferings(rows);
        if (rows.length > 0) {
          setForm((current) => ({
            ...current,
            courseOfferingId: current.courseOfferingId || rows[0].id,
          }));
        }
      } catch {
        if (active) setError("Failed to load assigned course offerings.");
      } finally {
        if (active) setLoadingOfferings(false);
      }
    }

    loadOfferings();

    return () => {
      active = false;
    };
  }, []);

  async function saveExam(e, publishNow = false) {
    e.preventDefault();
    setError("");

    try {
      setSaving(true);
      await createExam({
        title: form.title,
        description: form.description,
        durationMinutes: Number(form.durationMinutes) || 60,
        courseOfferingId: form.courseOfferingId || null,
        isPublished: publishNow,
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
            <form className="stackLg" onSubmit={(e) => saveExam(e, false)}>
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
                <label className="label">Course offering</label>
                <select
                  className="input"
                  value={form.courseOfferingId}
                  onChange={(e) => setForm({ ...form, courseOfferingId: e.target.value })}
                  disabled={saving || loadingOfferings}
                  required
                >
                  {offerings.length === 0 ? (
                    <option value="">No assigned offerings available</option>
                  ) : (
                    offerings.map((offering) => (
                      <option key={offering.id} value={offering.id}>
                        {formatOfferingLabel(offering)}
                      </option>
                    ))
                  )}
                </select>
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

              <div className="publishNotice">
                <strong>Draft and publish workflow</strong>
                <span>Save as draft while preparing questions, or publish immediately when the exam is ready for eligible students.</span>
              </div>

              <div className="row examFormActions" style={{ justifyContent: "flex-end" }}>
                <Link className="btn" to="/exams">{t("common.back")}</Link>
                <button className="btn" type="submit" disabled={saving || loadingOfferings || !form.courseOfferingId}>
                  {saving ? t("examCreate.creating") : "Save draft"}
                </button>
                <button
                  className="btn btnPrimary"
                  type="button"
                  disabled={saving || loadingOfferings || !form.courseOfferingId}
                  onClick={(e) => saveExam(e, true)}
                >
                  {saving ? t("examCreate.creating") : "Publish exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function formatOfferingLabel(offering) {
  const code = offering.course?.code || "Course";
  const name = offering.course?.name || "";
  const term = offering.term?.name || "Term";
  const year = offering.yearOfStudy ? `Year ${offering.yearOfStudy}` : "Year -";
  const semester = offering.semesterNo ? `Semester ${offering.semesterNo}` : "Semester -";
  const section = offering.sectionCode ? `Section ${offering.sectionCode}` : "Section -";

  return `${code}${name ? ` - ${name}` : ""} / ${term} / ${year}, ${semester}, ${section}`;
}
