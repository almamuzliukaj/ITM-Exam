import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  allowExamStudentAccess,
  getExam,
  getExamLiveMonitor,
  rejectExamStudentAccess,
  revokeExamStudentAccess,
} from "../../lib/examsApi";

const REFRESH_MS = 5000;

const statusFilters = [
  { value: "all", label: "All students" },
  { value: "NotVerified", label: "Not verified" },
  { value: "WaitingForPhysicalVerification", label: "Waiting physical check" },
  { value: "ApprovalRequested", label: "Waiting approval" },
  { value: "DeviceChangeRequested", label: "Device change" },
  { value: "CodeVerified", label: "Code verified" },
  { value: "ManuallyApproved", label: "Approved" },
  { value: "Started", label: "Active" },
  { value: "Submitted", label: "Submitted" },
  { value: "Rejected", label: "Rejected" },
  { value: "Removed", label: "Revoked" },
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

  const students = useMemo(() => (Array.isArray(monitor?.students) ? monitor.students : []), [monitor]);
  const summary = monitor?.summary || {};

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch = !term || [
        student.fullName,
        student.email,
        student.studentNumber,
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

  const waitingCount = students.filter((student) => ["WaitingForPhysicalVerification", "ApprovalRequested", "DeviceChangeRequested"].includes(student.accessStatus)).length;
  const activeCount = Number(summary.active || students.filter((student) => student.attemptStatus === "InProgress").length || 0);
  const submittedCount = Number(summary.submitted || students.filter((student) => student.attemptStatus === "Submitted").length || 0);
  const flaggedCount = Number(summary.withViolations || students.filter((student) => Number(student.violationCount || 0) > 0).length || 0);
  const totalEnrolled = Number(summary.totalEnrolled || students.length || 0);

  async function onConfirmAction() {
    if (!examId || !pendingAction?.student?.studentId) return;

    try {
      setActionSaving(true);
      setError("");
      const reason = actionReason.trim() || defaultReasonForAction(pendingAction.type);

      if (pendingAction.type === "approve") {
        await allowExamStudentAccess(examId, pendingAction.student.studentId, reason);
      } else if (pendingAction.type === "reject") {
        await rejectExamStudentAccess(examId, pendingAction.student.studentId, reason);
      } else {
        await revokeExamStudentAccess(examId, pendingAction.student.studentId, reason);
      }

      setPendingAction(null);
      setActionReason("");
      await loadMonitor(true);
    } catch (err) {
      setError(readApiMessage(err) || "Student admission action failed.");
    } finally {
      setActionSaving(false);
    }
  }

  function openAction(type, student) {
    setPendingAction({ type, student });
    setActionReason(defaultReasonForAction(type));
  }

  if (userLoading) return <div className="pageState">Loading monitor...</div>;
  if (!user) return <div className="pageState">{userError || "You must be signed in."}</div>;

  return (
    <AppShell
      user={user}
      badge="Live exam dashboard"
      title={exam?.title ? `${exam.title} live dashboard` : "Live exam dashboard"}
      subtitle="Monitor enrolled students, physical admission, attempt activity, and integrity risk in one operational view."
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
              <MonitorMetric label="Waiting approval" value={waitingCount || summary.waitingForPhysicalVerification || 0} tone={waitingCount > 0 ? "warn" : "clear"} />
              <MonitorMetric label="In progress" value={activeCount} tone="live" />
              <MonitorMetric label="Enrolled" value={totalEnrolled} />
              <MonitorMetric label="Submitted" value={submittedCount} />
              <MonitorMetric label="Students flagged" value={flaggedCount} tone={flaggedCount > 0 ? "danger" : "clear"} />
            </section>

            <section className="surfaceCard monitorRosterCard">
              <div className="sectionHeader">
                <div>
                  <h3>Physical admission roster</h3>
                  <span className="sectionMeta">Search, filter, approve, reject, revoke, and monitor classroom access.</span>
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
                          <th>Admission</th>
                          <th>Attempt</th>
                          <th>Violations</th>
                          <th>Last activity</th>
                          <th>Started / submitted</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr key={student.studentId} className={Number(student.violationCount || 0) > 0 ? "monitorFlaggedRow" : ""}>
                            <td>
                              <div className="monitorStudentIdentity">
                                <div className="monitorStudentAvatar">
                                  {student.photoUrl ? <img src={student.photoUrl} alt="" /> : <span>{student.initials || "ST"}</span>}
                                </div>
                                <div>
                                  <strong>{student.fullName || "Student"}</strong>
                                  <span>{student.email}</span>
                                  <small>ID: {student.studentNumber || student.studentId}</small>
                                </div>
                              </div>
                            </td>
                            <td><AccessStatusBadge status={student.accessStatus} /></td>
                            <td><AttemptStatusBadge student={student} /></td>
                            <td>
                              <span className={`monitorViolationCount ${Number(student.violationCount || 0) >= 3 ? "danger" : ""}`}>
                                {student.violationCount || 0}/3
                              </span>
                              <small>{student.latestViolationType ? formatEventType(student.latestViolationType) : "No events"}</small>
                            </td>
                            <td>
                              <div className="monitorActivityCell">
                                <strong>{formatDateTime(student.lastActivityAt || student.startedAt || student.verifiedAt)}</strong>
                                <span>{student.admissionReason || student.enrollmentStatus || "No security event"}</span>
                              </div>
                            </td>
                            <td>
                              <div className="monitorTimeStack">
                                <span>{student.startedAt ? `Start ${formatDateTime(student.startedAt)}` : "Not started"}</span>
                                <span>{student.submittedAt ? `Submit ${formatDateTime(student.submittedAt)}` : `${student.durationUsedMinutes || 0} min used`}</span>
                              </div>
                            </td>
                            <td>
                              <div className="monitorActionGroup">
                                <button
                                  className="btn btnTiny btnPrimary"
                                  type="button"
                                  onClick={() => openAction("approve", student)}
                                  disabled={student.attemptStatus === "Submitted" || ["ManuallyApproved", "Started", "Submitted"].includes(student.accessStatus)}
                                >
                                  {student.accessStatus === "DeviceChangeRequested" ? "Approve device" : "Approve"}
                                </button>
                                <button
                                  className="btn btnTiny"
                                  type="button"
                                  onClick={() => openAction("reject", student)}
                                  disabled={student.attemptStatus === "Submitted" || student.accessStatus === "Rejected"}
                                >
                                  Reject
                                </button>
                                <button
                                  className="btn btnTiny btnDangerSoft"
                                  type="button"
                                  onClick={() => openAction("revoke", student)}
                                  disabled={student.attemptStatus === "Submitted" || student.accessStatus === "Removed"}
                                >
                                  Revoke
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
  if (["ManuallyApproved", "Started", "Submitted"].includes(status)) {
    return <span className="statusPill statusLive">Approved</span>;
  }

  if (["WaitingForPhysicalVerification", "ApprovalRequested"].includes(status)) {
    return <span className="statusPill statusWarn">Waiting physical check</span>;
  }

  if (status === "DeviceChangeRequested") {
    return <span className="statusPill statusWarn">Device change</span>;
  }

  if (status === "Rejected") {
    return <span className="statusPill statusDanger">Rejected</span>;
  }

  if (status === "Removed") {
    return <span className="statusPill statusDanger">Revoked</span>;
  }

  return <span className="statusPill statusDraft">Not joined</span>;
}

function AttemptStatusBadge({ student, status, accessStatus }) {
  const attemptStatus = status ?? student?.attemptStatus;
  const resolvedAccessStatus = accessStatus ?? student?.accessStatus;
  if (attemptStatus === "Submitted") return <span className="statusPill statusLive">Submitted</span>;
  if (attemptStatus === "InProgress") return <span className="statusPill statusPublished">In progress</span>;
  if (resolvedAccessStatus === "Removed") return <span className="statusPill statusDanger">Closed</span>;
  return <span className="statusPill statusDraft">Not started</span>;
}

function AccessActionModal({ action, reason, saving, onReasonChange, onCancel, onConfirm }) {
  const labels = {
    approve: ["Physical approval", "Approve exam admission", "Approve access"],
    reject: ["Reject admission", "Reject physical admission", "Reject access"],
    revoke: ["Revoke admission", "Revoke exam admission", "Revoke access"],
  };
  const [eyebrow, title, actionLabel] = labels[action.type] || labels.reject;
  const studentName = action.student.fullName || action.student.email || "this student";

  return (
    <div className="modalBackdrop" role="presentation">
      <div className="modalCard accessActionModal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modalHeader">
          <div>
            <span className="summaryLabel">{eyebrow}</span>
            <h3>{title}</h3>
          </div>
          <button className="btn btnTiny" type="button" onClick={onCancel} aria-label="Close">Close</button>
        </div>
        <div className="modalBody stackLg">
          <p className="small">This action changes exam admission for {studentName} and is recorded for audit review.</p>
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
          <button className={`btn ${action.type === "approve" ? "btnPrimary" : "btnDanger"}`} type="button" onClick={onConfirm} disabled={saving}>
            {saving ? "Saving..." : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function defaultReasonForAction(type) {
  if (type === "approve") return "Physical identity verified by staff.";
  if (type === "revoke") return "Admission/session revoked by staff.";
  return "Physical identity was not approved.";
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
  return String(value || "No events")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
