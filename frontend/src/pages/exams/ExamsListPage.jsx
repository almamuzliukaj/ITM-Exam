import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { deleteExam, listExams } from "../../lib/examsApi";
import { canCreateExams } from "../../lib/permissions";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const assessmentTypes = [
  { value: "Exam", label: "Exam" },
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

export default function ExamsListPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [examStatusFilter, setExamStatusFilter] = useState("all");
  const [filters, setFilters] = useState({
    search: "",
    assessmentType: "",
    examPeriod: "",
    academicYear: "",
    semester: "",
    course: "",
    instructorType: "",
    instructor: "",
    scheduledFrom: "",
    scheduledTo: "",
  });
  const [examPage, setExamPage] = useState(1);
  const [examPageSize, setExamPageSize] = useState(10);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listExams();
        if (active) setExams(Array.isArray(data) ? data : []);
      } catch {
        if (active) setError(t("examsList.error"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  const canCreate = canCreateExams(user?.role);
  const isStudent = user?.role === "Student";

  const academicYearOptions = useMemo(() => {
    const years = new Set();
    exams.forEach((exam) => {
      const year = String(exam.academicYear || "").trim();
      if (year) years.add(year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [exams]);
  const filteredExams = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return exams.filter((exam) => {
      if (examStatusFilter === "published" && !exam.isPublished) return false;
      if (examStatusFilter === "draft" && exam.isPublished) return false;

  const filterOptions = useMemo(() => ({
    academicYears: uniqueSorted(exams.map((exam) => exam.academicYear)),
    semesters: uniqueSorted(exams.map((exam) => exam.semesterLabel)),
    courses: uniqueSorted(exams.map((exam) => formatCourseLabel(exam))),
    instructors: uniqueSorted(exams
      .filter((exam) => !filters.instructorType || exam.instructorType === filters.instructorType)
      .map((exam) => exam.instructorName)),
  }), [exams, filters.instructorType]);
  const filteredExams = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return exams.filter((exam) => {
      if (isStudent) {
        const submitted = exam.hasSubmittedAttempt || exam.studentExamStatus === "Submitted";
        if (examStatusFilter === "published" && (!exam.isPublished || submitted)) return false;
        if (examStatusFilter === "submitted" && !submitted) return false;
      } else {
        if (examStatusFilter === "published" && !exam.isPublished) return false;
        if (examStatusFilter === "draft" && exam.isPublished) return false;
      }

      if (filters.assessmentType && normalizeAssessmentTypeForUi(exam.assessmentType) !== filters.assessmentType) return false;
      if (filters.examPeriod && normalizeExamPeriodForUi(exam.examPeriod) !== filters.examPeriod) return false;
      if (filters.academicYear && exam.academicYear !== filters.academicYear) return false;
      if (filters.semester && exam.semesterLabel !== filters.semester) return false;
      if (filters.course && formatCourseLabel(exam) !== filters.course) return false;
      if (filters.instructorType && exam.instructorType !== filters.instructorType) return false;
      if (filters.instructor && exam.instructorName !== filters.instructor) return false;
      if (filters.scheduledFrom && toDateInputValue(exam.startsAt) < filters.scheduledFrom) return false;
      if (filters.scheduledTo && toDateInputValue(exam.startsAt) > filters.scheduledTo) return false;

      if (!search) return true;
      const haystack = [
        exam.title,
        exam.description,
        exam.assessmentType,
        exam.examPeriod,
        exam.academicYear,
        exam.semesterLabel,
        exam.cohortLabel,
        exam.instructorType,
        exam.instructorName,
        formatExamOffering(exam),
      ].join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }, [examStatusFilter, exams, filters, isStudent]);
  const examPageCount = Math.max(1, Math.ceil(filteredExams.length / examPageSize));
  const visibleExams = useMemo(() => {
    const startIndex = (examPage - 1) * examPageSize;
    return filteredExams.slice(startIndex, startIndex + examPageSize);
  }, [examPage, examPageSize, filteredExams]);
  const groupedVisibleExams = useMemo(() => groupExamsByOffering(visibleExams), [visibleExams]);
  const examStart = filteredExams.length === 0 ? 0 : (examPage - 1) * examPageSize + 1;
  const examEnd = Math.min(filteredExams.length, examPage * examPageSize);

  useEffect(() => {
    setExamPage(1);
  }, [examStatusFilter, examPageSize, filters]);

  useEffect(() => {
    setExamPage((current) => Math.min(current, examPageCount));
  }, [examPageCount]);

  if (userLoading) {
    return <div className="pageState">{t("examsList.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("examsList.userError")}</div>;
  }

  async function onDeleteDraft(exam) {
    if (!exam?.id || exam.isPublished) return;

    const confirmed = window.confirm(`Delete draft "${exam.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(exam.id);
      setError("");
      await deleteExam(exam.id);
      setExams((current) => current.filter((item) => item.id !== exam.id));
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to delete draft exam.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <AppShell
      user={user}
      badge={t("examsList.badge")}
      title={t("examsList.title")}
      subtitle={t("examsList.subtitle")}
      actions={canCreate ? <Link to="/exams/new" className="btn btnPrimary">{t("examsList.create")}</Link> : null}
    >
      <div className="stackXl">
        <section className="summaryStrip">
          <article className="summaryCard">
            <span className="summaryLabel">{t("examsList.total")}</span>
            <strong>{exams.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{t("examsList.published")}</span>
            <strong>{exams.filter((exam) => exam.isPublished).length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{t("examsList.draft")}</span>
            <strong>{exams.filter((exam) => !exam.isPublished).length}</strong>
          </article>
        </section>

        {error ? <div className="alert">{error}</div> : null}

        <section className="surfaceCard listControlPanel">
          <div className="sectionHeader">
            <div>
              <h3>Assessment directory</h3>
              <span className="sectionMeta">Search and filter assessments by academic type, period, status, and publish history.</span>
            </div>
            <div className="adminToolbarStatus">
              <span className="small">Showing {examStart}-{examEnd} of {filteredExams.length}</span>
              <select className="input inputCompact" value={examPageSize} onChange={(e) => setExamPageSize(Number(e.target.value))} aria-label="Exams per page">
                <option value={10}>{isStudent ? "10 cards" : "10 rows"}</option>
                <option value={25}>{isStudent ? "25 cards" : "25 rows"}</option>
                <option value={50}>{isStudent ? "50 cards" : "50 rows"}</option>
              </select>
            </div>
          </div>
          <div className="sectionBody stackLg">
            <div className="segmentedControl" aria-label="Exam status filter">
              <button className={examStatusFilter === "all" ? "active" : ""} type="button" onClick={() => setExamStatusFilter("all")}>All</button>
              <button className={examStatusFilter === "published" ? "active" : ""} type="button" onClick={() => setExamStatusFilter("published")}>{isStudent ? "Published / Available" : t("examsList.published")}</button>
              {isStudent ? <button className={examStatusFilter === "submitted" ? "active" : ""} type="button" onClick={() => setExamStatusFilter("submitted")}>Submitted</button> : null}
              {!isStudent ? <button className={examStatusFilter === "draft" ? "active" : ""} type="button" onClick={() => setExamStatusFilter("draft")}>{t("examsList.draft")}</button> : null}
            </div>

            <div className="assessmentFiltersGrid">
              <div className="field fieldSpanWide">
                <label className="label">Search</label>
                <input
                  className="input"
                  value={filters.search}
                  onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
                  placeholder="Search by title, course, cohort, semester..."
                />
              </div>
              <div className="field">
                <label className="label">Assessment category</label>
                <select className="input" value={filters.assessmentType} onChange={(e) => setFilters((current) => ({ ...current, assessmentType: e.target.value }))}>
                  <option value="">All categories</option>
                  {assessmentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Official exam period</label>
                <select className="input" value={filters.examPeriod} onChange={(e) => setFilters((current) => ({ ...current, examPeriod: e.target.value }))}>
                  <option value="">All official periods</option>
                  {examPeriods.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Academic year</label>
                <select className="input" value={filters.academicYear} onChange={(e) => setFilters((current) => ({ ...current, academicYear: e.target.value }))}>
                  <option value="">All academic years</option>

                  {academicYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}

                  {uniqueSorted([...academicYears, ...filterOptions.academicYears]).map((year) => <option key={year} value={year}>{year}</option>)}

                </select>
              </div>
              {isStudent ? (
                <>
                  <div className="field">
                    <label className="label">Semester</label>
                    <select className="input" value={filters.semester} onChange={(e) => setFilters((current) => ({ ...current, semester: e.target.value }))}>
                      <option value="">All semesters</option>
                      {filterOptions.semesters.map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Course</label>
                    <select className="input" value={filters.course} onChange={(e) => setFilters((current) => ({ ...current, course: e.target.value }))}>
                      <option value="">All courses</option>
                      {filterOptions.courses.map((course) => <option key={course} value={course}>{course}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Source</label>
                    <select className="input" value={filters.instructorType} onChange={(e) => setFilters((current) => ({ ...current, instructorType: e.target.value, instructor: "" }))}>
                      <option value="">Professor and Assistant</option>
                      <option value="Professor">Professor</option>
                      <option value="Assistant">Assistant</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Instructor</label>
                    <select className="input" value={filters.instructor} onChange={(e) => setFilters((current) => ({ ...current, instructor: e.target.value }))}>
                      <option value="">All instructors</option>
                      {filterOptions.instructors.map((instructor) => <option key={instructor} value={instructor}>{instructor}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Scheduled from</label>
                    <input className="input" type="date" value={filters.scheduledFrom} onChange={(e) => setFilters((current) => ({ ...current, scheduledFrom: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="label">Scheduled to</label>
                    <input className="input" type="date" value={filters.scheduledTo} onChange={(e) => setFilters((current) => ({ ...current, scheduledTo: e.target.value }))} />
                  </div>
                </>
              ) : null}
              <div className="field assessmentFilterReset">
                <label className="label">Filters</label>
                <button className="btn" type="button" onClick={() => {
                  setExamStatusFilter("all");
                  setFilters({
                    search: "",
                    assessmentType: "",
                    examPeriod: "",
                    academicYear: "",
                    semester: "",
                    course: "",
                    instructorType: "",
                    instructor: "",
                    scheduledFrom: "",
                    scheduledTo: "",
                  });
                }}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="pageStateCard">{t("examsList.loadingRecords")}</div>
        ) : filteredExams.length === 0 ? (
          <div className="emptyState">
            <p>{t("examsList.emptyTitle")}</p>
            <p>{t("examsList.emptyText")}</p>
          </div>
        ) : isStudent ? (
          <section className="stackLg studentExamsWorkspace">
            <div className="resourceGrid">
              {visibleExams.map((exam) => (
                <article key={exam.id} className="resourceCard">
                  <div className="resourceMetaRow">
                    <span className={`statusPill ${exam.isPublished ? "statusLive" : "statusDraft"}`}>
                      {exam.hasSubmittedAttempt ? "Submitted" : exam.isPublished ? "Available" : t("examsList.draft")}
                    </span>


                    <span className="statusPill statusDraft">{exam.instructorType || "Professor"}</span>

                    <span className="small">{exam.durationMinutes || 60} min</span>
                  </div>
                  <h3>{exam.title}</h3>
                  <p>{formatCourseLabel(exam)} · {exam.instructorName || "Instructor"}</p>
                  <p>Scheduled {formatDateTime(exam.startsAt)}</p>
                  <div className="resourceFooter">
                    <div className="small">{exam.hasSubmittedAttempt ? `Submitted ${formatDateTime(exam.studentSubmittedAt)}` : t("examsList.openHint")}</div>
                    <div className="resourceActionGroup">
                      {canCreate && !exam.isPublished ? (
                        <Link className="btn btnPrimary" to={`/exams/${exam.id}`}>Continue setup</Link>
                      ) : null}
                      {canCreate && !exam.isPublished ? (
                        <button
                          className="btn btnDanger"
                          type="button"
                          onClick={() => onDeleteDraft(exam)}
                          disabled={deletingId === exam.id}
                        >
                          {deletingId === exam.id ? "Deleting..." : "Delete draft"}
                        </button>
                      ) : null}

                      <Link className={isStudent ? "btn btnPrimary" : "btn"} to={isStudent ? `/exams/${exam.id}/attempt` : `/exams/${exam.id}`}>
                        {isStudent ? "Open" : t("examsList.open")}
                      </Link>

                      {exam.hasSubmittedAttempt ? (
                        <Link className="btn" to="/results">View result status</Link>
                      ) : (
                        <Link className={isStudent ? "btn btnPrimary" : "btn"} to={isStudent ? `/exams/${exam.id}/attempt` : `/exams/${exam.id}`}>
                          {isStudent ? "Start" : t("examsList.open")}
                        </Link>
                      )}

                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="paginationBar">
              <span>Showing {examStart}-{examEnd} of {filteredExams.length}</span>
              <div className="paginationActions">
                <button className="btn" type="button" disabled={examPage <= 1} onClick={() => setExamPage((current) => Math.max(1, current - 1))}>Previous</button>
                <span className="paginationCurrent">Page {examPage} of {examPageCount}</span>
                <button className="btn" type="button" disabled={examPage >= examPageCount} onClick={() => setExamPage((current) => Math.min(examPageCount, current + 1))}>Next</button>
              </div>
            </div>
          </section>
        ) : (
          <section className="stackLg">
            {groupedVisibleExams.map((group) => (
              <div className="examOfferingGroup" key={group.label}>
                <div className="examOfferingGroupHeader">
                  <div>
                    <span className="summaryLabel">Course offering</span>
                    <h3>{group.label}</h3>
                  </div>
                  <span className="statusPill statusDraft">{group.items.length} exam{group.items.length === 1 ? "" : "s"}</span>
                </div>
                <div className="tableWrap">
                  <table className="dataTable examDirectoryTable">
                    <thead>
                      <tr>
                        <th>Exam</th>
                        <th>Category / official period</th>
                        <th>Schedule</th>
                        <th>Created / published</th>
                        <th>Status</th>
                        <th>Next action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((exam) => (
                        <tr key={exam.id}>
                          <td>
                            <div className="examDirectoryTitle">
                              <strong>{exam.title}</strong>
                              <span>{[exam.academicYear, exam.semesterLabel, exam.cohortLabel].filter(Boolean).join(" / ") || exam.description || t("examsList.noDescription")}</span>
                            </div>
                          </td>
                          <td>
                            <div className="examDirectoryMeta">
                              <strong>{formatAssessmentType(exam.assessmentType)}</strong>
                              <span>{normalizeAssessmentTypeForUi(exam.assessmentType) === "Exam" ? formatExamPeriod(exam.examPeriod) : "During semester"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="examDirectoryMeta">
                              <strong>{formatDateTime(exam.startsAt)}</strong>
                              <span>{exam.durationMinutes || 60} min</span>
                            </div>
                          </td>
                          <td>
                            <div className="examDirectoryMeta">
                              <strong>{formatDateTime(exam.createdAt)}</strong>
                              <span>{exam.publishedAt ? `Published ${formatDateTime(exam.publishedAt)}` : "Not published"}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`statusPill ${exam.isPublished ? "statusLive" : "statusDraft"}`}>
                              {exam.isPublished ? t("examsList.published") : t("examsList.draft")}
                            </span>
                          </td>
                          <td>
                            <div className="examDirectoryActions">
                              {canCreate && !exam.isPublished ? (
                                <Link className="btn btnTiny btnPrimary" to={`/exams/${exam.id}`}>Setup</Link>
                              ) : null}
                              {exam.isPublished ? (
                                <>
                                  <Link className="btn btnTiny btnPrimary" to={`/exams/${exam.id}`}>Review</Link>
                                  <Link className="btn btnTiny" to={`/exams/${exam.id}/gradebook`}>Gradebook</Link>
                                  <Link className="btn btnTiny" to="/reports">Reports</Link>
                                </>
                              ) : null}
                              {canCreate && !exam.isPublished ? (
                                <button
                                  className="btn btnTiny btnDanger"
                                  type="button"
                                  onClick={() => onDeleteDraft(exam)}
                                  disabled={deletingId === exam.id}
                                >
                                  {deletingId === exam.id ? "Deleting..." : "Delete draft"}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="paginationBar">
              <span>Showing {examStart}-{examEnd} of {filteredExams.length}</span>
              <div className="paginationActions">
                <button className="btn" type="button" disabled={examPage <= 1} onClick={() => setExamPage((current) => Math.max(1, current - 1))}>Previous</button>
                <span className="paginationCurrent">Page {examPage} of {examPageCount}</span>
                <button className="btn" type="button" disabled={examPage >= examPageCount} onClick={() => setExamPage((current) => Math.min(examPageCount, current + 1))}>Next</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function formatExamOffering(exam) {
  const offering = exam.courseOffering;
  if (!offering) return "-";

  const course = offering.course;
  const courseLabel = course?.code && course?.name
    ? `${course.code} - ${course.name}`
    : course?.code || course?.name || "Course offering";
  const term = offering.term?.code || offering.term?.name;
  const section = offering.sectionCode ? `Section ${offering.sectionCode}` : "";

  return [courseLabel, term, section].filter(Boolean).join(" | ");
}

function formatCourseLabel(exam) {
  const course = exam?.courseOffering?.course;
  if (course?.code && course?.name) return `${course.code} - ${course.name}`;
  return course?.code || course?.name || "Course";
}

function uniqueSorted(values) {
  return Array.from(new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right));
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function groupExamsByOffering(exams) {
  const groups = new Map();

  for (const exam of exams) {
    const label = formatExamOffering(exam);
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label).push(exam);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function formatAssessmentType(value) {
  return assessmentTypes.find((type) => type.value === normalizeAssessmentTypeForUi(value))?.label || "Exam";
}

function formatExamPeriod(value) {
  return examPeriods.find((period) => period.value === normalizeExamPeriodForUi(value))?.label || "January Exam Period";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
