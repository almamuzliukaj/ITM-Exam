import { Link, useNavigate, useParams } from "react-router-dom";
import { createExam, getExam, updateExam } from "../../lib/examsApi";
import { listMyOfferings } from "../../lib/academicApi";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const assessmentTypes = [
  { value: "Provim", label: "Provim", professorOnly: true },
  { value: "Kollokfium1", label: "Kollokfium 1" },
  { value: "Kollokfium2", label: "Kollokfium 2" },
  { value: "Practice", label: "Ushtrime / practice" },
];

const examPeriods = [
  { value: "AfatiJanarit", label: "Afati i Janarit" },
  { value: "AfatiPrillit", label: "Afati i Prillit" },
  { value: "AfatiQershorit", label: "Afati i Qershorit" },
  { value: "AfatiShtatorit", label: "Afati i Shtatorit" },
  { value: "AfatiTetorit", label: "Afati i Tetorit" },
];

const academicYears = ["2025/2026", "2026/2027", "2027/2028", "2028/2029"];

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
    assessmentType: "Provim",
    examPeriod: "AfatiJanarit",
    academicYear: "",
    semesterLabel: "",
    cohortLabel: "",
    requiresLockdown: false,
    allowedClient: "StandardBrowser",
    lockdownMode: "Advisory",
  });
  const [titleTouched, setTitleTouched] = useState(Boolean(examId));
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
      Boolean(form.academicYear.trim()) &&
      Number(form.maximumPoints) > 0 &&
      !saving &&
      !offeringsLoading &&
      !examLoading,
    [examLoading, form.academicYear, form.courseOfferingId, form.maximumPoints, form.title, offeringsLoading, saving],
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
          assessmentType: normalizeAssessmentTypeForUi(exam?.assessmentType),
          examPeriod: normalizeExamPeriodForUi(exam?.examPeriod),
          academicYear: exam?.academicYear || "",
          semesterLabel: exam?.semesterLabel || "",
          cohortLabel: exam?.cohortLabel || "",
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

  const selectedOffering = useMemo(
    () => offerings.find((offering) => offering.id === form.courseOfferingId) || null,
    [form.courseOfferingId, offerings],
  );
  const allowedAssessmentTypes = useMemo(
    () => assessmentTypes.filter((type) => user?.role === "Professor" || !type.professorOnly),
    [user?.role],
  );

  useEffect(() => {
    if (!user || allowedAssessmentTypes.some((type) => type.value === form.assessmentType)) return;
    setForm((current) => ({
      ...current,
      assessmentType: allowedAssessmentTypes[0]?.value || "Kollokfium1",
    }));
  }, [allowedAssessmentTypes, form.assessmentType, user]);

  useEffect(() => {
    if (isEditMode || titleTouched || !selectedOffering) return;

    const suggested = buildAssessmentTitle(selectedOffering, form.assessmentType, form.examPeriod);
    setForm((current) => ({
      ...current,
      title: current.title.trim() ? current.title : suggested,
      academicYear: current.academicYear || selectedOffering.term?.academicYearLabel || "",
      semesterLabel: current.semesterLabel || formatSemesterLabel(selectedOffering),
      cohortLabel: current.cohortLabel || formatCohortLabel(selectedOffering),
    }));
  }, [form.assessmentType, form.examPeriod, isEditMode, selectedOffering, titleTouched]);

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
        assessmentType: form.assessmentType,
        examPeriod: form.examPeriod,
        academicYear: form.academicYear,
        semesterLabel: form.semesterLabel,
        cohortLabel: form.cohortLabel,
        isPublished: false,
        requiresLockdown: Boolean(form.requiresLockdown),
        allowedClient: form.allowedClient || "StandardBrowser",
        lockdownMode: form.lockdownMode || "Advisory",
      };

      if (isEditMode) {
        const updated = await updateExam(examId, payload);
        const nextId = getEntityId(updated) || examId;
        nav(`/exams/${nextId}`);
      } else {
        const created = await createExam(payload);
        const nextId = getEntityId(created);
        if (!nextId) {
          setError("Exam was saved, but the response did not include an exam id. Return to exams and refresh the list.");
          return;
        }
        nav(`/exams/${nextId}`);
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
                      onChange={(e) => {
                        setTitleTouched(true);
                        setForm({ ...form, title: e.target.value });
                      }}
                      placeholder="Generated from course and assessment type"
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="label">Assessment category</label>
                    <select
                      className="input"
                      value={form.assessmentType}
                      onChange={(e) => setForm({ ...form, assessmentType: e.target.value })}
                    >
                      {allowedAssessmentTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    {user?.role === "Assistant" ? <span className="fieldHint">Assistants can create only kollokfium assessments.</span> : null}
                  </div>

                  <div className="field">
                    <label className="label">Official exam period</label>
                    <select
                      className="input"
                      value={form.examPeriod}
                      onChange={(e) => setForm({ ...form, examPeriod: e.target.value })}
                      disabled={form.assessmentType !== "Provim"}
                    >
                      {examPeriods.map((period) => (
                        <option key={period.value} value={period.value}>{period.label}</option>
                      ))}
                    </select>
                    {form.assessmentType !== "Provim" ? <span className="fieldHint">Kollokfiumet ruhen si vleresime gjate semestrit.</span> : null}
                  </div>

                  <div className="field">
                    <label className="label">Academic year</label>
                    <select
                      className="input"
                      value={form.academicYear}
                      onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                      required
                    >
                      <option value="">Select academic year</option>
                      {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>

                  <div className="field">
                    <label className="label">Semester</label>
                    <input
                      className="input"
                      value={form.semesterLabel}
                      onChange={(e) => setForm({ ...form, semesterLabel: e.target.value })}
                      placeholder="Semester 1"
                    />
                  </div>

                  <div className="field">
                    <label className="label">Generation / cohort</label>
                    <input
                      className="input"
                      value={form.cohortLabel}
                      onChange={(e) => setForm({ ...form, cohortLabel: e.target.value })}
                      placeholder="Year 2 / 2025 cohort"
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

function buildAssessmentTitle(offering, assessmentType, examPeriod) {
  const courseCode = offering.course?.code?.trim();
  const courseName = offering.course?.name?.trim();
  const courseTitle = [courseCode, courseName].filter(Boolean).join(" - ") || "Course";
  const typeLabel = formatAssessmentType(assessmentType);
  const periodLabel = assessmentType === "Provim" ? formatExamPeriod(examPeriod) : "";
  const year = offering.term?.academicYearLabel || offering.term?.code || "";
  return [courseTitle, typeLabel, periodLabel, year].filter(Boolean).join(" - ");
}

function formatAssessmentType(value) {
  return assessmentTypes.find((type) => type.value === value)?.label || "Provim";
}

function formatExamPeriod(value) {
  return examPeriods.find((period) => period.value === value)?.label || "Afati i Janarit";
}

function normalizeAssessmentTypeForUi(value) {
  if (value === "FinalExam" || value === "RetakeExam") return "Provim";
  if (value === "Colloquium1") return "Kollokfium1";
  if (value === "Colloquium2") return "Kollokfium2";
  if (value === "PracticeExam") return "Practice";
  return value || "Provim";
}

function normalizeExamPeriodForUi(value) {
  const map = {
    January: "AfatiJanarit",
    June: "AfatiQershorit",
    September: "AfatiShtatorit",
    DuringSemester: "AfatiJanarit",
  };
  return map[value] || value || "AfatiJanarit";
}

function formatSemesterLabel(offering) {
  if (offering.semesterNo) return `Semester ${offering.semesterNo}`;
  if (offering.term?.season) return offering.term.season;
  return "";
}

function formatCohortLabel(offering) {
  const year = offering.yearOfStudy ? `Year ${offering.yearOfStudy}` : "";
  const section = offering.sectionCode ? `Section ${offering.sectionCode}` : "";
  return [year, section].filter(Boolean).join(" / ");
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

function getEntityId(entity) {
  return entity?.id || entity?.Id || entity?.examId || entity?.ExamId || "";
}
