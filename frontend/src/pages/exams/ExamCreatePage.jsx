import { Link, useNavigate, useParams } from "react-router-dom";
import { createExam, getExam, updateExam } from "../../lib/examsApi";
import { listMyOfferings } from "../../lib/academicApi";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ExamCreatePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { examId } = useParams();
  const { user, loading, error: userError } = useCurrentUser();
  const [form, setForm] = useState({
    title: "",
    description: "",
    durationMinutes: 60,
    maximumPoints: 100,
    startsAt: "",
    endsAt: "",
    courseOfferingId: "",
    requiresLockdown: false,
    allowedClient: "StandardBrowser",
    lockdownMode: "Advisory",
  });
  const [offerings, setOfferings] = useState([]);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [examLoading, setExamLoading] = useState(Boolean(examId));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEditMode = Boolean(examId);
  const canSubmit = useMemo(
    () =>
      Boolean(form.title.trim()) &&
      Boolean(form.courseOfferingId) &&
      Number(form.maximumPoints) > 0 &&
      !saving &&
      !offeringsLoading &&
      !examLoading,
    [examLoading, form.courseOfferingId, form.maximumPoints, form.title, offeringsLoading, saving],
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

  useEffect(() => {
    if (!examId) {
      setExamLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setExamLoading(true);
        const exam = await getExam(examId);
        if (!active) return;

        setForm({
          title: exam?.title || "",
          description: exam?.description || "",
          durationMinutes: Number(exam?.durationMinutes) || 60,
          maximumPoints: Number(exam?.maximumPoints) || 100,
          startsAt: toDateTimeLocalValue(exam?.startsAt),
          endsAt: toDateTimeLocalValue(exam?.endsAt),
          courseOfferingId: exam?.courseOfferingId || "",
          requiresLockdown: Boolean(exam?.requiresLockdown),
          allowedClient: exam?.allowedClient || "StandardBrowser",
          lockdownMode: exam?.lockdownMode || "Advisory",
        });
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || "Failed to load exam for editing.");
        }
      } finally {
        if (active) setExamLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [examId]);

  async function saveExam(e) {
    e.preventDefault();
    setError("");

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        description: form.description,
        durationMinutes: Number(form.durationMinutes) || 60,
        maximumPoints: Number(form.maximumPoints) || 100,
        startsAt: toIsoOrNull(form.startsAt),
        endsAt: toIsoOrNull(form.endsAt),
        courseOfferingId: form.courseOfferingId || null,
        isPublished: false,
        requiresLockdown: form.requiresLockdown,
        allowedClient: form.allowedClient,
        lockdownMode: form.lockdownMode,
      };

      if (isEditMode) {
        const updated = await updateExam(examId, payload);
        nav(`/exams/${updated.id}`);
      } else {
        const created = await createExam(payload);
        nav(`/exams/${created.id}`);
      }
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

  if (examLoading) {
    return <div className="pageState">Loading exam editor...</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("examCreate.userError")}</div>;
  }

  return (
    <AppShell
      user={user}
      badge={t("examCreate.badge")}
      title={isEditMode ? "Edit exam" : t("examCreate.title")}
      subtitle={isEditMode ? "Update the existing exam, including lockdown settings, without creating a new one." : t("examCreate.subtitle")}
      actions={<Link className="btn" to="/exams">{t("common.cancel")}</Link>}
    >
      <section className="formSurface">
        <div className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>{t("examCreate.configuration")}</h3>
              <span className="sectionMeta">Set the course, timing, and delivery policy before adding questions.</span>
            </div>
            <span className="statusPill statusDraft">{isEditMode ? "Edit mode" : "Draft setup"}</span>
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

                  <div className="field">
                    <label className="label">Maximum exam points</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={form.maximumPoints}
                      onChange={(e) => setForm({ ...form, maximumPoints: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="label">Starts at</label>
                    <input
                      className="input"
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label className="label">Ends at</label>
                    <input
                      className="input"
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
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
                <strong>{isEditMode ? "Published exams return to draft after editing" : "Draft and publish workflow"}</strong>
                <span>{isEditMode ? "After saving changes, review the exam and publish it again so students use the updated settings." : "Save the exam draft first, attach questions in the builder, then publish it for eligible students."}</span>
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
                  {saving ? (isEditMode ? "Saving changes..." : t("examCreate.creating")) : (isEditMode ? "Save changes" : "Save draft")}
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

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
