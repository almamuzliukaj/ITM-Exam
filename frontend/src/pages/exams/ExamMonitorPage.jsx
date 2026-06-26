import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  allowExamStudentAccess,
  getExam,
  getExamLiveMonitor,
  rejectExamStudentAccess,
} from "../../lib/examsApi";

const REFRESH_MS = 5000;

const statusFilters = [
  { value: "all", label: "All students" },
  { value: "NotVerified", label: "Not verified" },
  { value: "ApprovalRequested", label: "Waiting approval" },
  { value: "CodeVerified", label: "Code verified" },
  { value: "ManuallyApproved", label: "Approved" },
  { value: "Started", label: "Active" },
  { value: "Submitted", label: "Submitted" },
  { value: "Rejected", label: "Rejected" },
  { value: "flagged", label: "With violations" },
];

export default function ExamMonitorPage() {
  const { examId } = useParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exam, setExam] = useState(null);
  const [monitor, setMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingAction, setPendingAction] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  const loadMonitor = useCallback(async (silent = false) => {
    if (!examId) return;

    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [examData, monitorData] = await Promise.all([
        getExam(examId),
        getExamLiveMonitor(examId),
      ]);

      setExam(examData);
      setMonitor(monitorData);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(readApiMessage(err) || "Failed to load live exam dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [examId]);

  useEffect(() => {
    loadMonitor(false);
  }, [loadMonitor]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => loadMonitor(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadMonitor]);

  const students = useMemo(
    () => (Array.isArray(monitor?.students) ? monitor.students : []),
    [monitor],
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch = !term || [
        student.fullName,
        student.email,
        student.enrollmentStatus,
        student.accessStatus,
        student.attemptStatus,
      ].join(" ").toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "flagged") return Number(student.violationCount || 0) > 0;
      return student.accessStatus === statusFilter || student.attemptStatus === statusFilter;
    });
  }, [search, statusFilter, students]);

  const summary = monitor?.summary || {};
  const totalEnrolled = Number(summary.totalEnrolled || students.length || 0);
  const activeCount = Number(summary.active || 0);
  const submittedCount = Number(summary.submitted || 0);
  const notJoinedCount = Number(summary.notJoined || 0);
  const violationsCount = Number(summary.withViolations || 0);
  const verifiedCount = Number(summary.verified || 0);

  if (userLoading) return <div className="pageState">Loading monitor...</div>;
  if (!user) return <div className="pageState">{userError || "You must be signed in."}</div>;

  async function onConfirmAction() {
    if (!examId || !pendingAction?.student?.studentId) return;

    try {
      setActionSaving(true);
      setError("");
      const reason = actionReason.trim() || defaultReasonForAction(pendingAction.type);

      if (pendingAction.type === "approve") {
        await allowExamStudentAccess(examId, pendingAction.student.studentId, reason);
      } else {
        await rejectExamStudentAccess(examId, pendingAction.student.studentId, reason);
      }

      setPendingAction(null);
      setActionReason("");
      await loadMonitor(true);
    } catch (err) {
      setError(readApiMessage(err) || "Student access action failed.");
    } finally {
      setActionSaving(false);
    }
  }

  return (
    <AppShell
      user={user}
      badge="Live exam dashboard"
      title={exam?.title ? `${exam.title} live dashboard` : "Live exam dashboard"}
      subtitle="Monitor enrolled students, classroom entry status, attempt activity, and integrity risk in one operational view."
      actions={
        <>
          <Link className="btn" to={`/exams/${examId}`}>Exam details</Link>
          <Link className="btn" to={`/exams/${examId}/gradebook`}>Gradebook</Link>
          <button className="btn" type="button" onClick={() => loadMonitor(true)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button className={`btn ${autoRefresh ? "btnPrimary" : ""}`} type="button" onClick={() => setAutoRefresh((current) => !current)}>
            {autoRefresh ? "Live refresh on" : "Live refresh off"}
          </button>
        </>
      }
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}

        {loading ? (
          <div className="pageStateCard">Loading live exam dashboard...</div>
        ) : (
          <>
            <section className="monitorHero">
              <div>
                <span className="summaryLabel">Monitoring workspace</span>
                <h2>{monitor?.examTitle || exam?.title || "Live dashboard"}</h2>
                <p>
                  This view uses the course offering roster, not only started attempts. It refreshes every {Math.round(REFRESH_MS / 1000)} seconds while live refresh is enabled.
                </p>
              </div>
              <div className="monitorHeartbeat">
                <span className={autoRefresh ? "monitorLiveDot" : "monitorPausedDot"} />
                <strong>{autoRefresh ? "Live" : "Paused"}</strong>
                <small>{lastUpdated ? `Updated ${formatTime(lastUpdated)}` : "Waiting for first sync"}</small>
              </div>
            </section>

            <section className="monitorMetricGrid">
              <MonitorMetric label="Enrolled" value={totalEnrolled} />
              <MonitorMetric label="Verified" value={verifiedCount} tone="live" />
              <MonitorMetric label="Active" value={activeCount} tone="live" />
              <MonitorMetric label="Submitted" value={submittedCount} />
              <MonitorMetric label="Not joined" value={notJoinedCount} tone={notJoinedCount > 0 ? "warn" : "clear"} />
              <MonitorMetric label="With violations" value={violationsCount} tone={violationsCount > 0 ? "danger" : "clear"} />
            </section>

            <section className="surfaceCard monitorRosterCard">
              <div className="sectionHeader">
                <div>
                  <h3>Student roster</h3>
                  <span className="sectionMeta">Search, filter, approve, or reject classroom access for eligible students.</span>
                </div>
                <span className="statusPill statusDraft">{filteredStudents.length} shown</span>
              </div>
              <div className="sectionBody stackLg">
                <div className="monitorToolbar">
                  <div className="field">
                    <label className="label">Search students</label>
                    <input
                      className="input"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Name, email, status..."
                    />
                  </div>
                  <div className="field">
                    <label className="label">Status</label>
                    <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                      {statusFilters.map((filter) => (
                        <option key={filter.value} value={filter.value}>{filter.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="emptyState">
                    <strong>No students match the current filters</strong>
                    <span>Clear search or choose a broader status filter.</span>
                  </div>
                ) : (
                  <div className="monitorTableWrap">
                    <table className="dataTable monitorTable liveExamRosterTable">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Access</th>
                          <th>Attempt</th>
                          <th>Last activity</th>
                          <th>Violations</th>
                          <th>Started / submitted</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr key={student.studentId} className={Number(student.violationCount || 0) > 0 ? "monitorFlaggedRow" : ""}>
                            <td>
                              <strong>{student.fullName || "Student"}</strong>
                              <span>{student.email}</span>
                              <small>{student.enrollmentStatus || "Eligible"}</small>
                            </td>
                            <td><AccessStatusBadge status={student.accessStatus} /></td>
                            <td><AttemptStatusBadge status={student.attemptStatus} /></td>
                            <td>{student.lastActivityAt ? formatDateTime(student.lastActivityAt) : "No activity"}</td>
                            <td>
                              <span className={`monitorViolationCount ${Number(student.violationCount || 0) >= 3 ? "danger" : ""}`}>
                                {student.violationCount || 0}
                              </span>
                              <small>{student.latestViolationType ? formatEventType(student.latestViolationType) : "No events"}</small>
                            </td>
                            <td>
                              <div className="monitorTimeStack">
                                <span>{student.startedAt ? `Start ${formatDateTime(student.startedAt)}` : "Not started"}</span>
                                <span>{student.submittedAt ? `Submit ${formatDateTime(student.submittedAt)}` : `${student.durationUsedMinutes || 0} min used`}</span>
                              </div>
                            </td>
                            <td>
                              <div className="tableActionGroup">
                                <button
                                  className="btn btnTiny"
                                  type="button"
                                  onClick={() => {
                                    setPendingAction({ type: "approve", student });
                                    setActionReason(defaultReasonForAction("approve"));
                                  }}
                                  disabled={student.attemptStatus === "Submitted" || student.accessStatus === "ManuallyApproved"}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btnTiny btnDanger"
                                  type="button"
                                  onClick={() => {
                                    setPendingAction({ type: "reject", student });
                                    setActionReason(defaultReasonForAction("reject"));
                                  }}
                                  disabled={student.attemptStatus === "Submitted" || student.accessStatus === "Rejected"}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {pendingAction ? (
              <AccessActionModal
                action={pendingAction}
                reason={actionReason}
                saving={actionSaving}
                onReasonChange={setActionReason}
                onCancel={() => {
                  setPendingAction(null);
                  setActionReason("");
                }}
                onConfirm={onConfirmAction}
              />
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

function MonitorMetric({ label, value, tone = "neutral" }) {
  return (
    <article className={`monitorMetric monitorMetric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AccessStatusBadge({ status }) {
  const normalized = status || "NotVerified";
  const tone = normalized === "Started" || normalized === "CodeVerified" || normalized === "ManuallyApproved"
    ? "statusLive"
    : normalized === "Rejected" || normalized === "Removed"
      ? "statusWarn"
      : "statusDraft";
  return <span className={`statusPill ${tone}`}>{formatAccessStatus(normalized)}</span>;
}

function AttemptStatusBadge({ status }) {
  if (status === "Submitted") return <span className="statusPill statusLive">Submitted</span>;
  if (status === "InProgress") return <span className="statusPill statusPublished">Active</span>;
  return <span className="statusPill statusDraft">Not started</span>;
}

function AccessActionModal({ action, reason, saving, onReasonChange, onCancel, onConfirm }) {
  const isApprove = action.type === "approve";
  const studentName = action.student.fullName || action.student.email || "this student";

  return (
    <div className="modalBackdrop" role="presentation">
      <div className="modalCard accessActionModal" role="dialog" aria-modal="true" aria-label={`${isApprove ? "Approve" : "Reject"} student access`}>
        <div className="modalHeader">
          <div>
            <span className="summaryLabel">{isApprove ? "Manual approval" : "Reject admission"}</span>
            <h3>{isApprove ? "Allow exam access" : "Reject access request"}</h3>
          </div>
          <button className="btn btnTiny" type="button" onClick={onCancel} aria-label="Close">Close</button>
        </div>
        <div className="modalBody stackLg">
          <p className="small">
            {isApprove
              ? `Allow ${studentName} to enter this exam without the active entry code?`
              : `Reject the manual admission request for ${studentName}?`}
          </p>
          <div className="field">
            <label className="label">Reason</label>
            <textarea
              className="textarea textareaCompact"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Reason for audit log and student status..."
            />
          </div>
        </div>
        <div className="modalFooter">
          <button className="btn" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className={`btn ${isApprove ? "btnPrimary" : "btnDanger"}`} type="button" onClick={onConfirm} disabled={saving}>
            {saving ? "Saving..." : isApprove ? "Approve access" : "Reject access"}
          </button>
        </div>
      </div>
    </div>
  );
}

function defaultReasonForAction(type) {
  return type === "approve" ? "Professor approved classroom admission." : "Professor rejected manual admission.";
}

function formatAccessStatus(value) {
  const labels = {
    NotVerified: "Not verified",
    ApprovalRequested: "Waiting approval",
    CodeVerified: "Code verified",
    ManuallyApproved: "Approved",
    Started: "Started",
    Submitted: "Submitted",
    Rejected: "Rejected",
    Removed: "Removed",
  };
  return labels[value] || value || "Not verified";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatEventType(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || "No events";
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
