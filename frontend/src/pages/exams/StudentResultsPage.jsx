import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getMyExamResults } from "../../lib/examsApi";

export default function StudentResultsPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [resultPage, setResultPage] = useState(1);
  const [resultPageSize, setResultPageSize] = useState(6);
  const [filters, setFilters] = useState({
    academicYear: "",
    semester: "",
    course: "",
    instructorType: "",
    instructor: "",
    takenFrom: "",
    takenTo: "",
    status: "",
  });

  const loadResults = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      const data = await getMyExamResults();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(readApiMessage(err) || t("studentResults.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    if (!user || user.role !== "Student") return;
    loadResults();
  }, [loadResults, user]);

  const published = useMemo(() => results.filter((result) => result.isPublished !== false), [results]);
  const filterOptions = useMemo(() => ({
    academicYears: uniqueSorted(published.map((result) => result.academicYear)),
    semesters: uniqueSorted(published.map((result) => result.semesterLabel)),
    courses: uniqueSorted(published.map((result) => formatCourseLabel(result))),
    instructors: uniqueSorted(published
      .filter((result) => !filters.instructorType || result.instructorType === filters.instructorType)
      .map((result) => result.instructorName)),
    statuses: uniqueSorted(published.map((result) => result.status)),
  }), [filters.instructorType, published]);
  const filteredPublished = useMemo(() => published.filter((result) => {
    const takenDate = toDateInputValue(result.examTakenAt || result.submittedAt);
    if (filters.academicYear && result.academicYear !== filters.academicYear) return false;
    if (filters.semester && result.semesterLabel !== filters.semester) return false;
    if (filters.course && formatCourseLabel(result) !== filters.course) return false;
    if (filters.instructorType && result.instructorType !== filters.instructorType) return false;
    if (filters.instructor && result.instructorName !== filters.instructor) return false;
    if (filters.status && result.status !== filters.status) return false;
    if (filters.takenFrom && takenDate < filters.takenFrom) return false;
    if (filters.takenTo && takenDate > filters.takenTo) return false;
    return true;
  }), [filters, published]);
  const averageScore = useMemo(() => {
    if (filteredPublished.length === 0) return null;
    const total = filteredPublished.reduce((sum, result) => sum + Number(result.finalScore || 0), 0);
    return total / filteredPublished.length;
  }, [filteredPublished]);
  const latestPublished = useMemo(
    () => [...filteredPublished].sort((a, b) => new Date(b.examTakenAt || b.submittedAt || 0) - new Date(a.examTakenAt || a.submittedAt || 0))[0] || null,
    [filteredPublished],
  );
  const resultPageCount = Math.max(1, Math.ceil(filteredPublished.length / resultPageSize));
  const visibleResults = useMemo(() => {
    const startIndex = (resultPage - 1) * resultPageSize;
    return filteredPublished.slice(startIndex, startIndex + resultPageSize);
  }, [filteredPublished, resultPage, resultPageSize]);
  const resultStart = filteredPublished.length === 0 ? 0 : (resultPage - 1) * resultPageSize + 1;
  const resultEnd = Math.min(filteredPublished.length, resultPage * resultPageSize);

  useEffect(() => {
    setResultPage(1);
  }, [filters, resultPageSize]);

  useEffect(() => {
    setResultPage((current) => Math.min(current, resultPageCount));
  }, [resultPageCount]);

  if (userLoading) return <div className="pageState">{t("studentResults.loading")}</div>;
  if (!user) return <div className="pageState">{userError || t("studentResults.userRequired")}</div>;

  return (
    <AppShell
      user={user}
      badge={t("studentResults.badge")}
      title={t("studentResults.title")}
      subtitle={t("studentResults.subtitle")}
      actions={
        <>
          <button className="btn" type="button" onClick={() => loadResults({ silent: true })} disabled={loading || refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <Link className="btn" to="/exams">{t("studentResults.availableExams")}</Link>
        </>
      }
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}

        <section className="summaryStrip">
          <article className="summaryCard">
            <span className="summaryLabel">{t("studentResults.published")}</span>
            <strong>{filteredPublished.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{t("studentResults.average")}</span>
            <strong>{averageScore == null ? "--" : formatScore(averageScore)}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{t("studentResults.latestPublished")}</span>
            <strong>{latestPublished ? formatDateTime(latestPublished.examTakenAt || latestPublished.submittedAt) : "-"}</strong>
          </article>
        </section>

        <section className="resultPolicyStrip">
          <div>
            <strong>{t("studentResults.visibilityTitle")}</strong>
            <span>{t("studentResults.visibilityText")}</span>
          </div>
          <div>
            <strong>{latestPublished ? formatDateTime(latestPublished.publishedAt) : t("studentResults.noPublication")}</strong>
            <span>{t("studentResults.latestPublished")}</span>
          </div>
        </section>

        <section className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>{t("studentResults.publishedResults")}</h3>
              <span className="sectionMeta">
                {t("studentResults.showing", { start: resultStart, end: resultEnd, count: filteredPublished.length, suffix: filteredPublished.length === 1 ? "" : "s" })}
              </span>
            </div>
          </div>
          <div className="sectionBody stackLg">
            <div className="adminToolbar">
              <div className="resultLifecycleHint">
                <strong>Organized by exam taken date</strong>
                <span>Filters use the attempt/submission date, not the publication date.</span>
              </div>
              <div className="adminToolbarStatus">
                <span className="statusPill statusLive">{t("studentResults.publishedCount", { count: filteredPublished.length })}</span>
                <select className="input inputCompact" value={resultPageSize} onChange={(e) => setResultPageSize(Number(e.target.value))} aria-label={t("studentResults.rowsAria")}>
                  <option value={6}>{t("studentResults.rows", { count: 6 })}</option>
                  <option value={12}>{t("studentResults.rows", { count: 12 })}</option>
                  <option value={24}>{t("studentResults.rows", { count: 24 })}</option>
                </select>
              </div>
            </div>

            <div className="assessmentFiltersGrid">
              <div className="field">
                <label className="label">Academic year</label>
                <select className="input" value={filters.academicYear} onChange={(e) => setFilters((current) => ({ ...current, academicYear: e.target.value }))}>
                  <option value="">All years</option>
                  {filterOptions.academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
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
                <label className="label">Instructor type</label>
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
                <label className="label">Taken from</label>
                <input className="input" type="date" value={filters.takenFrom} onChange={(e) => setFilters((current) => ({ ...current, takenFrom: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Taken to</label>
                <input className="input" type="date" value={filters.takenTo} onChange={(e) => setFilters((current) => ({ ...current, takenTo: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Status</label>
                <select className="input" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}>
                  <option value="">All statuses</option>
                  {filterOptions.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="field assessmentFilterReset">
                <label className="label">Filters</label>
                <button className="btn" type="button" onClick={() => setFilters({ academicYear: "", semester: "", course: "", instructorType: "", instructor: "", takenFrom: "", takenTo: "", status: "" })}>
                  Reset
                </button>
              </div>
            </div>

            {loading ? (
              <div className="pageStateCard">{t("studentResults.loadingRecords")}</div>
            ) : filteredPublished.length === 0 ? (
              <div className="emptyState">
                <p>{t("studentResults.emptyPublishedTitle")}</p>
                <p>{t("studentResults.emptyPublishedText")}</p>
              </div>
            ) : (
              <div className="resultCardStack">
                {visibleResults.map((result) => (
                  <ResultCard key={result.attemptId} result={result} t={t} />
                ))}
              </div>
            )}

            <div className="paginationBar">
              <span>{t("studentResults.showing", { start: resultStart, end: resultEnd, count: filteredPublished.length, suffix: filteredPublished.length === 1 ? "" : "s" })}</span>
              <div className="paginationActions">
                <button className="btn" type="button" disabled={resultPage <= 1} onClick={() => setResultPage((current) => Math.max(1, current - 1))}>{t("studentResults.previous")}</button>
                <span className="paginationCurrent">{t("studentResults.page", { page: resultPage, count: resultPageCount })}</span>
                <button className="btn" type="button" disabled={resultPage >= resultPageCount} onClick={() => setResultPage((current) => Math.min(resultPageCount, current + 1))}>{t("studentResults.next")}</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ResultCard({ result, t }) {
  return (
    <article className="resultCard">
      <div>
        <span className="summaryLabel">{t("studentResults.publishedResult")}</span>
        <h4>{result.examTitle}</h4>
        <p>{formatCourseLabel(result)} · {result.instructorType || "Professor"} {result.instructorName || ""}</p>
        <p>Exam taken {formatDateTime(result.examTakenAt || result.submittedAt)}</p>
      </div>
      <dl className="resultMetaList">
        <div>
          <dt>{t("studentResults.grade")}</dt>
          <dd>{formatGrade(result.finalGrade, result.isPassed, t)}</dd>
        </div>
        <div>
          <dt>{t("studentResults.percentage")}</dt>
          <dd>{formatPercentage(result.scorePercentage)}</dd>
        </div>
        <div>
          <dt>{t("studentResults.autoScore")}</dt>
          <dd>{formatScore(result.autoScore)}</dd>
        </div>
        <div>
          <dt>Submitted</dt>
          <dd>{formatDateTime(result.submittedAt)}</dd>
        </div>
        <div>
          <dt>Publication status</dt>
          <dd>{result.status || (result.isPublished ? "Published" : "Pending")}</dd>
        </div>
        <div>
          <dt>Published at</dt>
          <dd>{formatDateTime(result.publishedAt)}</dd>
        </div>
        <div>
          <dt>{t("studentResults.notes")}</dt>
          <dd>{result.gradingNotes || t("studentResults.noNotes")}</dd>
        </div>
      </dl>
    </article>
  );
}

function formatScore(value) {
  const parsed = Number(value || 0);
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2);
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCourseLabel(result) {
  if (result?.courseCode && result?.courseName) return `${result.courseCode} - ${result.courseName}`;
  return result?.courseCode || result?.courseName || "Course";
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

function formatPercentage(value) {
  if (value == null) return "-";
  return `${Number(value).toFixed(2)}%`;
}

function formatGrade(grade, passed, t) {
  if (!grade) return "-";
  return `${grade} (${passed ? t("studentResults.pass") : t("studentResults.fail")})`;
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
