import { Link, useNavigate, useParams } from "react-router-dom";
import { createExam, getExam, updateExam } from "../../lib/examsApi";
import { listMyOfferings } from "../../lib/academicApi";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const assessmentTypes = [
  { value: "Exam", label: "Exam", professorOnly: true },
  { value: "Colloquium 1", label: "Colloquium 1" },
  { value: "Colloquium 2", label: "Colloquium 2" },
  { value: "Practice Assessment", label: "Practice Assessment" },
];

const examPeriods = [
  { value: "January Exam Period", label: "January Exam Period" },
  { value: "April Exam Period", label: "April Exam Period" },
  { value: "June Exam Period", label: "June Exam Period" },
  { value: "September Exam Period", label: "September Exam Period" },
  { value: "October Exam Period", label: "October Exam Period" },
];

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
    startsAt: getDefaultStartsAt(),
    endsAt: getDefaultEndsAt(60),
    courseOfferingId: "",
    assessmentType: "Exam",
    examPeriod: "January Exam Period",
    academicYear: "",
    semesterLabel: "",
    cohortLabel: "",
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
          const firstOffering = assignedOfferings[0];
          setForm((current) => ({
            ...current,
            ...(!current.courseOfferingId ? buildOfferingDefaults(firstOffering, current) : {}),
            courseOfferingId: current.courseOfferingId || firstOffering.id,
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
        });
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || t("examCreate.loadEditError"));
        }
      } finally {
        if (active) setExamLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [examId, t]);

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
      assessmentType: allowedAssessmentTypes[0]?.value || "Colloquium 1",
    }));
  }, [allowedAssessmentTypes, form.assessmentType, user]);

  useEffect(() => {
    if (isEditMode || !selectedOffering) return;

    setForm((current) => ({
      ...current,
      ...buildOfferingDefaults(selectedOffering, current),
    }));
  }, [isEditMode, selectedOffering]);

  function handleOfferingChange(offeringId) {
    const offering = offerings.find((item) => item.id === offeringId);
    setForm((current) => ({
      ...current,
      ...(offering ? buildOfferingDefaults(offering, current) : {}),
      courseOfferingId: offeringId,
    }));
  }

  function handleDurationChange(value) {
    const durationMinutes = Number(value) || 60;
    setForm((current) => ({
      ...current,
      durationMinutes,
      endsAt: calculateEndsAt(current.startsAt, durationMinutes),
    }));
  }

  function handleStartsAtChange(value) {
    setForm((current) => ({
      ...current,
      startsAt: value,
      endsAt: calculateEndsAt(value, Number(current.durationMinutes) || 60),
      examPeriod: inferExamPeriodFromDate(value),
    }));
  }

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
      };

      if (isEditMode) {
        const updated = await updateExam(examId, payload);
        const nextId = getEntityId(updated) || examId;
        nav(`/exams/${nextId}`);
      } else {
        const created = await createExam(payload);
        const nextId = getEntityId(created);
        if (!nextId) {
          setError(t("examCreate.savedMissingId"));
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
    return <div className="pageState">{t("examCreate.editorLoading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("examCreate.userError")}</div>;
  }

  return (
    <AppShell
      user={user}
      badge={t("examCreate.badge")}
      title={isEditMode ? t("examCreate.editTitle") : t("examCreate.title")}
      subtitle={isEditMode ? t("examCreate.editSubtitle") : t("examCreate.subtitle")}
      actions={<Link className="btn" to="/exams">{t("common.cancel")}</Link>}
    >
      <section className="formSurface">
        <div className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>{t("examCreate.configuration")}</h3>
              <span className="sectionMeta">{t("examCreate.sectionMeta")}</span>
            </div>
            <span className="statusPill statusDraft">{isEditMode ? t("examCreate.editMode") : t("examCreate.draftSetup")}</span>
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
                    <h4>{t("examCreate.basicsTitle")}</h4>
                    <p>{t("examCreate.basicsText")}</p>
                  </div>
                </div>

                <div className="formGrid formGridTwo">
                  <div className="field fieldSpanFull">
                    <label className="label">{t("examCreate.offeringLabel")}</label>
                    <select
                      className="input"
                      value={form.courseOfferingId}
                      onChange={(e) => handleOfferingChange(e.target.value)}
                      disabled={saving || offeringsLoading || offerings.length === 0}
                      required
                    >
                      {offerings.map((offering) => (
                        <option key={offering.id} value={offering.id}>
                          {formatOfferingOption(offering)}
                        </option>
                      ))}
                    </select>
                    <span className="fieldHint">{t("examCreate.offeringHint")}</span>
                  </div>

                  <div className="autoMetadataPanel fieldSpanFull">
                    <div className="autoMetadataHeader">
                      <div>
                        <span className="summaryLabel">{t("examCreate.autoData")}</span>
                        <strong>{form.title || t("examCreate.selectCourseTitle")}</strong>
                      </div>
                      <span className="statusPill statusDraft">{t("examCreate.systemFilled")}</span>
                    </div>
                    <div className="autoMetadataGrid">
                      <div>
                        <span>{t("examCreate.assessmentCategory")}</span>
                        <strong>{formatAssessmentType(form.assessmentType, t)}</strong>
                      </div>
                      <div>
                        <span>{t("examCreate.officialPeriod")}</span>
                        <strong>{formatExamPeriod(form.examPeriod, t)}</strong>
                      </div>
                      <div>
                        <span>{t("examCreate.academicYear")}</span>
                        <strong>{form.academicYear || t("examCreate.fromOffering")}</strong>
                      </div>
                      <div>
                        <span>{t("examCreate.semester")}</span>
                        <strong>{form.semesterLabel || t("examCreate.fromOffering")}</strong>
                      </div>
                      <div>
                        <span>{t("examCreate.cohort")}</span>
                        <strong>{form.cohortLabel || t("examCreate.fromOffering")}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">{t("examCreate.durationLabel")}</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={form.durationMinutes}
                      onChange={(e) => handleDurationChange(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="label">{t("examCreate.maximumPoints")}</label>
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
                    <label className="label">{t("examCreate.startsAt")}</label>
                    <input
                      className="input"
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => handleStartsAtChange(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="label">{t("examCreate.endsAt")}</label>
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
                <strong>{isEditMode ? t("examCreate.publishEditTitle") : t("examCreate.publishDraftTitle")}</strong>
                <span>{isEditMode ? t("examCreate.publishEditText") : t("examCreate.publishDraftText")}</span>
              </div>

              <div className="formActionsBar">
                <Link className="btn" to="/exams">{t("common.back")}</Link>
                <button className="btn btnPrimary" type="submit" disabled={!canSubmit}>
                  {saving ? (isEditMode ? t("examCreate.savingChanges") : t("examCreate.creating")) : (isEditMode ? t("examCreate.saveChanges") : t("examCreate.saveDraft"))}
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

function buildOfferingDefaults(offering, current) {
  const startsAt = current.startsAt || getDefaultStartsAt();
  const durationMinutes = Number(current.durationMinutes) || 60;
  return {
    title: buildAssessmentTitle(offering),
    academicYear: offering.term?.academicYearLabel || inferAcademicYearFromDate(startsAt),
    semesterLabel: formatSemesterLabel(offering),
    cohortLabel: formatCohortLabel(offering),
    startsAt,
    endsAt: current.endsAt || calculateEndsAt(startsAt, durationMinutes),
    assessmentType: current.assessmentType || "Exam",
    examPeriod: inferExamPeriodFromDate(startsAt),
  };
}

function buildAssessmentTitle(offering) {
  const courseName = offering.course?.name?.trim();
  const courseCode = offering.course?.code?.trim();
  return courseName || courseCode || "Course exam";
}

function formatAssessmentType(value, t) {
  const normalized = assessmentTypes.find((type) => type.value === value)?.value || "Exam";
  return t(`examCreate.assessmentTypes.${normalized}`);
}

function formatExamPeriod(value, t) {
  const normalized = examPeriods.find((period) => period.value === value)?.value || "January Exam Period";
  return t(`examCreate.examPeriods.${normalized}`);
}

function normalizeAssessmentTypeForUi(value) {
  if (value === "FinalExam" || value === "RetakeExam" || value === "Provim") return "Exam";
  if (value === "Colloquium1" || value === "Kollokfium1") return "Colloquium 1";
  if (value === "Colloquium2" || value === "Kollokfium2") return "Colloquium 2";
  if (value === "PracticeExam" || value === "Practice") return "Practice Assessment";
  return value || "Exam";
}

function normalizeExamPeriodForUi(value) {
  const map = {
    January: "January Exam Period",
    AfatiJanarit: "January Exam Period",
    AfatiPrillit: "April Exam Period",
    June: "June Exam Period",
    AfatiQershorit: "June Exam Period",
    September: "September Exam Period",
    AfatiShtatorit: "September Exam Period",
    AfatiTetorit: "October Exam Period",
    DuringSemester: "January Exam Period",
  };
  return map[value] || value || "January Exam Period";
}

function formatSemesterLabel(offering) {
  if (offering.semesterNo) return `Semester ${offering.semesterNo}`;
  if (offering.term?.semesterNo) return `Semester ${offering.term.semesterNo}`;
  if (offering.term?.semesterLabel) return offering.term.semesterLabel;
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

function getDefaultStartsAt() {
  return toDateTimeLocalValue(new Date());
}

function getDefaultEndsAt(durationMinutes = 60) {
  return calculateEndsAt(getDefaultStartsAt(), durationMinutes);
}

function calculateEndsAt(startsAt, durationMinutes = 60) {
  const date = new Date(startsAt || new Date());
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() + Number(durationMinutes || 60));
  return toDateTimeLocalValue(date);
}

function inferExamPeriodFromDate(value) {
  const date = new Date(value || new Date());
  if (Number.isNaN(date.getTime())) return "January Exam Period";
  const month = date.getMonth() + 1;
  if (month <= 2) return "January Exam Period";
  if (month <= 4) return "April Exam Period";
  if (month <= 7) return "June Exam Period";
  if (month <= 9) return "September Exam Period";
  return "October Exam Period";
}

function inferAcademicYearFromDate(value) {
  const date = new Date(value || new Date());
  if (Number.isNaN(date.getTime())) return academicYears[0];
  const year = date.getFullYear();
  const startsInAutumn = date.getMonth() + 1 >= 10;
  return startsInAutumn ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getEntityId(entity) {
  return entity?.id || entity?.Id || entity?.examId || entity?.ExamId || "";
}
