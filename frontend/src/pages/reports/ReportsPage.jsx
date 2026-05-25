import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listMyOfferings, listOfferings } from "../../lib/academicApi";
import { isAdmin } from "../../lib/permissions";
import {
  getIntegrityReport,
  getParticipationReport,
  getPublishStatusReport,
  getReportsOverview,
} from "../../lib/reportsApi";

const reportTabs = [
  { key: "participation", label: "Participation" },
  { key: "publish", label: "Publish status" },
  { key: "integrity", label: "Integrity" },
];

export default function ReportsPage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("participation");
  const [courseOfferingId, setCourseOfferingId] = useState("");
  const [offerings, setOfferings] = useState([]);
  const [overview, setOverview] = useState(null);
  const [participation, setParticipation] = useState([]);
  const [publishStatus, setPublishStatus] = useState([]);
  const [integrity, setIntegrity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo(
    () => ({ courseOfferingId: courseOfferingId || undefined }),
    [courseOfferingId],
  );

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadOfferings() {
      try {
        const data = isAdmin(user.role) ? await listOfferings() : await listMyOfferings();
        if (active) setOfferings(Array.isArray(data) ? data : []);
      } catch {
        if (active) setOfferings([]);
      }
    }

    loadOfferings();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadReports() {
      try {
        setLoading(true);
        setError("");
        const [overviewData, participationData, publishData, integrityData] = await Promise.all([
          getReportsOverview(filters),
          getParticipationReport(filters),
          getPublishStatusReport(filters),
          getIntegrityReport(filters),
        ]);

        if (!active) return;
        setOverview(overviewData);
        setParticipation(Array.isArray(participationData?.items) ? participationData.items : []);
        setPublishStatus(Array.isArray(publishData?.items) ? publishData.items : []);
        setIntegrity(Array.isArray(integrityData?.items) ? integrityData.items : []);
      } catch (err) {
        if (active) setError(readApiMessage(err) || "Reports could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReports();
    return () => {
      active = false;
    };
  }, [filters, user]);

  if (userLoading) return <div className="pageState">Loading reports...</div>;
  if (!user) return <div className="pageState">{userError || "Unable to load user profile."}</div>;

  const activeRows = getActiveRows(activeTab, participation, publishStatus, integrity);
  const activeColumns = getColumns(activeTab);

  function exportActiveCsv() {
    downloadCsv(`${activeTab}-report.csv`, activeColumns, activeRows);
  }

  return (
    <AppShell
      user={user}
      badge="Reports"
      title="Institutional reports"
      subtitle="Review participation, result publication status, and integrity activity in export-friendly tables."
      actions={
        <>
          <button className="btn" type="button" onClick={() => window.print()}>
            Print
          </button>
          <button className="btn btnPrimary" type="button" onClick={exportActiveCsv} disabled={activeRows.length === 0}>
            Export CSV
          </button>
        </>
      }
    >
      <div className="stackXl reportsPrintArea">
        {error ? <div className="alert">{error}</div> : null}

        <section className="surfaceCard reportControlPanel">
          <div className="sectionHeader">
            <div>
              <h3>Report scope</h3>
              <span className="sectionMeta">Filter reports by assigned course offering or print the current view.</span>
            </div>
            <span className="statusPill statusDraft">{overview?.scope?.accessibleOfferings ?? 0} offerings</span>
          </div>
          <div className="sectionBody">
            <div className="formGrid formGridTwo">
              <div className="field">
                <label className="label">Course offering</label>
                <select
                  className="input"
                  value={courseOfferingId}
                  onChange={(event) => setCourseOfferingId(event.target.value)}
                >
                  <option value="">All accessible offerings</option>
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {formatOffering(offering)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="reportScopeNote">
                <span className="summaryLabel">Current export</span>
                <strong>{reportTabs.find((tab) => tab.key === activeTab)?.label}</strong>
                <p>{activeRows.length} rows included in this table.</p>
              </div>
            </div>
          </div>
        </section>

        <ReportSummary summary={overview?.summary} loading={loading} />

        <section className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>Exam and results tables</h3>
              <span className="sectionMeta">Switch views without changing the selected report scope.</span>
            </div>
          </div>
          <div className="sectionBody stackLg">
            <div className="reportTabs">
              {reportTabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`filterTab${activeTab === tab.key ? " filterTabActive" : ""}`}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.label}</span>
                  <strong>{getActiveRows(tab.key, participation, publishStatus, integrity).length}</strong>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="pageStateCard">Loading report data...</div>
            ) : activeRows.length === 0 ? (
              <div className="emptyState">
                <strong>No report rows</strong>
                <span>Try another offering or wait until exams and attempts are available.</span>
              </div>
            ) : (
              <ReportTable columns={activeColumns} rows={activeRows} />
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ReportSummary({ summary, loading }) {
  const cards = [
    { label: "Exams", value: summary?.exams },
    { label: "Published exams", value: summary?.publishedExams },
    { label: "Submitted attempts", value: summary?.submittedAttempts },
    { label: "Published results", value: summary?.publishedResults },
    { label: "Pending results", value: summary?.pendingResults },
    { label: "Average score", value: summary?.averageScore ?? "-" },
    { label: "Integrity violations", value: summary?.integrityViolations },
    { label: "Offerings", value: summary?.offerings },
  ];

  return (
    <section className="reportSummaryGrid">
      {cards.map((card) => (
        <article className="summaryCard" key={card.label}>
          <span className="summaryLabel">{card.label}</span>
          <strong>{loading ? "..." : card.value ?? 0}</strong>
        </article>
      ))}
    </section>
  );
}

function ReportTable({ columns, rows }) {
  return (
    <div className="tableWrap reportTableWrap">
      <table className="dataTable reportTable">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>{renderCell(row, column)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(row, column) {
  const value = row[column.key];
  if (column.type === "date") return formatDate(value);
  if (column.type === "status") return <span className={`statusPill ${value ? "statusLive" : "statusDraft"}`}>{value ? "Published" : "Draft"}</span>;
  if (column.type === "score") return value == null ? "-" : Number(value).toFixed(2);
  if (column.type === "danger") return <span className={`statusPill ${Number(value || 0) > 0 ? "statusWarn" : "statusLive"}`}>{value ?? 0}</span>;
  return value ?? "-";
}

function getColumns(tab) {
  if (tab === "publish") {
    return [
      { key: "courseCode", label: "Course" },
      { key: "title", label: "Exam" },
      { key: "isPublished", label: "Exam status", type: "status" },
      { key: "submittedCount", label: "Submitted" },
      { key: "gradedCount", label: "Graded" },
      { key: "publishedCount", label: "Published" },
      { key: "pendingPublicationCount", label: "Pending publish" },
      { key: "pendingReviewCount", label: "Needs review" },
    ];
  }

  if (tab === "integrity") {
    return [
      { key: "courseCode", label: "Course" },
      { key: "title", label: "Exam" },
      { key: "attemptsWithViolations", label: "Attempts flagged", type: "danger" },
      { key: "totalViolationCount", label: "Violations", type: "danger" },
      { key: "highestAttemptViolationCount", label: "Highest attempt", type: "danger" },
      { key: "autoActionCount", label: "Auto actions", type: "danger" },
      { key: "eventCount", label: "Events" },
    ];
  }

  return [
    { key: "courseCode", label: "Course" },
    { key: "title", label: "Exam" },
    { key: "startsAt", label: "Starts", type: "date" },
    { key: "isPublished", label: "Status", type: "status" },
    { key: "attemptCount", label: "Attempts" },
    { key: "submittedCount", label: "Submitted" },
    { key: "publishedResultCount", label: "Results published" },
    { key: "averageFinalScore", label: "Average", type: "score" },
  ];
}

function getActiveRows(tab, participation, publishStatus, integrity) {
  if (tab === "publish") return publishStatus;
  if (tab === "integrity") return integrity;
  return participation;
}

function downloadCsv(filename, columns, rows) {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const body = rows
    .map((row) => columns.map((column) => csvEscape(formatCsvValue(row[column.key], column))).join(","))
    .join("\n");
  const blob = new Blob([[header, body].filter(Boolean).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatCsvValue(value, column) {
  if (column.type === "date") return formatDate(value);
  if (column.type === "status") return value ? "Published" : "Draft";
  if (column.type === "score") return value == null ? "" : Number(value).toFixed(2);
  return value ?? "";
}

function csvEscape(value) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

function formatOffering(offering) {
  const course = offering.course?.code
    ? `${offering.course.code} - ${offering.course.name || "Course"}`
    : offering.course?.name || "Course";
  const term = offering.term?.code || offering.term?.name || "Term";
  const section = offering.sectionCode || "-";
  return `${course} / ${term} / Section ${section}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
