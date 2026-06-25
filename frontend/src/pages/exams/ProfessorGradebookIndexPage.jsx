import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listExams } from "../../lib/examsApi";
import { useEffect, useMemo, useState } from "react";

const assessmentTypes = [
  { value: "Provim", label: "Provim" },
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

export default function ProfessorGradebookIndexPage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "", category: "", examPeriod: "", academicYear: "", status: "published" });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listExams();
        if (active) setExams(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(readApiMessage(err) || "Failed to load gradebook assessments.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const visibleExams = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return exams.filter((exam) => {
      if (filters.status === "published" && !exam.isPublished) return false;
      if (filters.status === "draft" && exam.isPublished) return false;
      if (filters.category && normalizeAssessmentTypeForUi(exam.assessmentType) !== filters.category) return false;
      if (filters.examPeriod && normalizeExamPeriodForUi(exam.examPeriod) !== filters.examPeriod) return false;
      if (filters.academicYear && exam.academicYear !== filters.academicYear) return false;
      if (!search) return true;
      return [exam.title, exam.description, exam.academicYear, exam.semesterLabel, exam.cohortLabel, formatOffering(exam)]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [exams, filters]);

  if (userLoading) return <div className="pageState">Loading gradebook...</div>;
  if (!user) return <div className="pageState">{userError || "User session could not be loaded."}</div>;

  return (
    <AppShell
      user={user}
      badge="Gradebook"
      title="Assessment gradebooks"
      subtitle="Select the course assessment you want to review, grade, or publish."
      actions={<Link className="btn" to="/exams">Back to assessments</Link>}
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}

        <section className="surfaceCard listControlPanel">
          <div className="sectionHeader">
            <div>
              <h3>Gradebook selector</h3>
              <span className="sectionMeta">Filter by course, assessment type, status, semester, or cohort before opening student results.</span>
            </div>
            <span className="statusPill statusDraft">{visibleExams.length} assessment{visibleExams.length === 1 ? "" : "s"}</span>
          </div>
          <div className="sectionBody">
            <div className="assessmentFiltersGrid">
              <div className="field fieldSpanWide">
                <label className="label">Search</label>
                <input
                  className="input"
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Course, title, semester, cohort..."
                />
              </div>
              <div className="field">
                <label className="label">Assessment category</label>
                <select className="input" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
                  <option value="">All categories</option>
                  {assessmentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Official exam period</label>
                <select className="input" value={filters.examPeriod} onChange={(event) => setFilters((current) => ({ ...current, examPeriod: event.target.value }))}>
                  <option value="">All official periods</option>
                  {examPeriods.map((period) => <option key={period.value} value={period.value}>{period.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Academic year</label>
                <select className="input" value={filters.academicYear} onChange={(event) => setFilters((current) => ({ ...current, academicYear: event.target.value }))}>
                  <option value="">All academic years</option>
                  {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Status</label>
                <select className="input" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="pageStateCard">Loading assessments...</div>
        ) : visibleExams.length === 0 ? (
          <div className="emptyState">
            <strong>No gradebooks found</strong>
            <span>Adjust filters or publish an assessment before opening its gradebook.</span>
          </div>
        ) : (
          <div className="tableWrap">
            <table className="dataTable examDirectoryTable">
              <thead>
                <tr>
                  <th>Assessment</th>
                  <th>Course offering</th>
                  <th>Assessment category</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleExams.map((exam) => (
                  <tr key={exam.id}>
                    <td>
                      <div className="examDirectoryTitle">
                        <strong>{exam.title}</strong>
                        <span>{[exam.academicYear, exam.semesterLabel, exam.cohortLabel].filter(Boolean).join(" / ") || "No academic metadata"}</span>
                      </div>
                    </td>
                    <td>{formatOffering(exam)}</td>
                    <td>{formatAssessmentType(exam.assessmentType)}</td>
                    <td>{formatDateTime(exam.startsAt)}</td>
                    <td>
                      <span className={`statusPill ${exam.isPublished ? "statusLive" : "statusDraft"}`}>
                        {exam.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <Link className="btn btnPrimary" to={`/exams/${exam.id}/gradebook`}>Open gradebook</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function formatAssessmentType(value) {
  return assessmentTypes.find((type) => type.value === normalizeAssessmentTypeForUi(value))?.label || "Provim";
}

function formatOffering(exam) {
  const offering = exam.courseOffering;
  if (!offering) return "-";
  const course = offering.course;
  const courseLabel = course?.code && course?.name ? `${course.code} - ${course.name}` : course?.code || course?.name || "Course";
  const term = offering.term?.code || offering.term?.name || "";
  const section = offering.sectionCode ? `Section ${offering.sectionCode}` : "";
  return [courseLabel, term, section].filter(Boolean).join(" | ");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
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

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
