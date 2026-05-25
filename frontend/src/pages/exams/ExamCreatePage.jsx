import { Link, useNavigate } from "react-router-dom";
import { createExam } from "../../lib/examsApi";
import { listMyOfferings } from "../../lib/academicApi";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEffect, useMemo, useState } from "react";
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
    requiresLockdown: false,
    allowedClient: "StandardBrowser",
    lockdownMode: "Advisory",
  });
  const [offerings, setOfferings] = useState([]);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canSubmit = useMemo(
    () => Boolean(form.title.trim()) && Boolean(form.courseOfferingId) && !saving && !offeringsLoading,
    [form.courseOfferingId, form.title, offeringsLoading, saving],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setOfferingsLoading(true);
        const data = await listMyOfferings();
        if (!active) return;

        const assignedOfferings = Array.isArray(data) ? data : [];
        setOfferings(assignedOfferings);
        if (assignedOfferings.length > 0) {
          setForm((current) => ({
            ...current,
            courseOfferingId: current.courseOfferingId || assignedOfferings[0].id,
          }));
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || t("examCreate.offeringsError"));
        }
      } finally {
        if (active) setOfferingsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  async function saveExam(e) {
    e.preventDefault();
    setError("");

    try {
      setSaving(true);
      const created = await createExam({
        title: form.title,
        description: form.description,
        durationMinutes: Number(form.durationMinutes) || 60,
        courseOfferingId: form.courseOfferingId || null,
        isPublished: false,
        requiresLockdown: form.requiresLockdown,
        allowedClient: form.allowedClient,
        lockdownMode: form.lockdownMode,
      });
      nav(`/exams/${created.id}`);
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
            <div>
              <h3>{t("examCreate.configuration")}</h3>
              <span className="sectionMeta">Set the course, timing, and delivery policy before adding questions.</span>
            </div>
            <span className="statusPill statusDraft">Draft setup</span>
          </div>
          <div className="sectionBody">
            {error ? <div className="alert">{error}</div> : null}
            {offeringsLoading ? <div className="pageStateCard">{t("examCreate.loadingOfferings")}</div> : null}
            {!offeringsLoading && offerings.length === 0 ? (
              <div className="emptyState">
                <strong>{t("examCreate.noOfferingsTitle")}</strong>
                <span>{t("examCreate.noOfferingsText")}</span>
              </div>
            ) : null}
            <form className="formLayout" onSubmit={saveExam}>
              <div className="formSection">
                <div className="formSectionHeader">
                  <div>
                    <h4>Assessment basics</h4>
                    <p>Keep the exam identity clear for staff and students.</p>
                  </div>
                </div>

                <div className="formGrid formGridTwo">
                  <div className="field fieldSpanFull">
                    <label className="label">{t("examCreate.offeringLabel")}</label>
                    <select
                      className="input"
                      value={form.courseOfferingId}
                      onChange={(e) => setForm({ ...form, courseOfferingId: e.target.value })}
                      disabled={saving || offeringsLoading || offerings.length === 0}
                      required
                    >
                      {offerings.map((offering) => (
                        <option key={offering.id} value={offering.id}>
                          {formatOfferingOption(offering)}
                        </option>
                      ))}
                    </select>
                    <span className="fieldHint">This connects the draft to the correct term, course, and section.</span>
                  </div>

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

                  <div className="field fieldSpanFull">
                    <div className="label">{t("examCreate.descriptionLabel")}</div>
                    <textarea
                      className="input textarea"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder={t("examCreate.descriptionPlaceholder")}
                    />
                  </div>
                </div>
              </div>

              <div className="publishNotice">
                <strong>Draft and publish workflow</strong>
                <span>Save the exam draft first, attach questions in the builder, then publish it for eligible students.</span>
              </div>

              <div className="lockdownConfig">
                <div>
                  <span className="summaryLabel">Safe exam readiness</span>
                  <strong>Lockdown mode</strong>
                  <p>Use this when a high-stakes exam should require a controlled browser or kiosk client.</p>
                </div>
                <label className="toggleRow">
                  <input
                    type="checkbox"
                    checked={form.requiresLockdown}
                    onChange={(e) => setForm({ ...form, requiresLockdown: e.target.checked })}
                  />
                  <span>Require lockdown mode</span>
                </label>
                <div className="questionBankFormGrid">
                  <div className="field">
                    <label className="label">Allowed client</label>
                    <select
                      className="input"
                      value={form.allowedClient}
                      onChange={(e) => setForm({ ...form, allowedClient: e.target.value })}
                      disabled={!form.requiresLockdown}
                    >
                      <option value="StandardBrowser">Standard browser with warnings</option>
                      <option value="SafeExamBrowser">Safe Exam Browser</option>
                      <option value="KioskClient">Kiosk client</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Policy mode</label>
                    <select
                      className="input"
                      value={form.lockdownMode}
                      onChange={(e) => setForm({ ...form, lockdownMode: e.target.value })}
                      disabled={!form.requiresLockdown}
                    >
                      <option value="Advisory">Advisory warnings</option>
                      <option value="Strict">Strict start validation</option>
                    </select>
                  </div>
                </div>
                <ul className="readinessChecklist">
                  <li>Fullscreen warning flow enabled</li>
                  <li>Tab, blur, copy, paste, and fullscreen exit events logged</li>
                  <li>Gradebook shows integrity timeline for professor review</li>
                </ul>
              </div>

              <div className="formActionsBar">
                <Link className="btn" to="/exams">{t("common.back")}</Link>
                <button className="btn btnPrimary" type="submit" disabled={!canSubmit}>
                  {saving ? t("examCreate.creating") : "Save draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function formatOfferingOption(offering) {
  const courseCode = offering.course?.code?.trim();
  const courseName = offering.course?.name?.trim();
  const courseTitle = [courseCode, courseName].filter(Boolean).join(" - ") || "Course offering";
  const term = offering.term?.name || offering.term?.academicYearLabel || "No term";
  const section = offering.sectionCode ? `Section ${offering.sectionCode}` : "No section";

  return `${courseTitle} / ${term} / ${section}`;
}
