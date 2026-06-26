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
  { value: "ApprovalRequested", label: "Waiting approval" },
  { value: "WaitingForPhysicalVerification", label: "Waiting physical check" },
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
    if (!autoRefresh) return undefined;
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

  const summary = monitor?.summary || {};
  const totalEnrolled = Number(summary.totalEnrolled || students.length || 0);
  const verifiedCount = Number(summary.verified || 0);
  const activeCount = Number(summary.active || 0);
  const submittedCount = Number(summary.submitted || 0);
  const notJoinedCount = Number(summary.notJoined || 0);
  const waitingCount = Number(summary.waitingForPhysicalVerification || 0);
  const violationsCount = Number(summary.withViolations || 0);

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
      } else if (pendingAction.type === "reject") {
        await rejectExamStudentAccess(examId, pendingAction.student.studentId, reason);
      } else {
        await revokeExamStudentAccess(examId, pendingAction.student.studentId, reason);
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
              <MonitorMetric label="Waiting check" value={waitingCount} tone={waitingCount > 0 ? "warn" : "clear"} />
              <MonitorMetric label="Active" value={activeCount} tone="live" />
              <MonitorMetric label="Submitted" value={submittedCount} />
              <MonitorMetric label="Not joined" value={notJoinedCount} tone={notJoinedCount > 0 ? "warn" : "clear"} />
              <MonitorMetric label="With violations" value={violationsCount} tone={violationsCount > 0 ? "danger" : "clear"} />
            </section>

            <section className="surfaceCard monitorRosterCard">
              <div className="sectionHeader">
                <div>
                  <h3>Student roster</h3>
                  <span className="sectionMeta">Search, filter, approve, reject, or revoke classroom access for eligible students.</span>
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
                    <table className="dataTable monitorTable">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Access</th>
                          <th>Attempt</th>
                          <th>Started</th>
                          <th>Last activity</th>
                          <th>Violations</th>
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
                            <td><AttemptStatusBadge status={student.attemptStatus} accessStatus={student.accessStatus} /></td>
                            <td>{formatDateTime(student.startedAt)}</td>
                            <td>
                              <div className="monitorActivityCell">
                                <strong>{formatDateTime(student.lastActivityAt || student.submittedAt || student.verifiedAt)}</strong>
                                <span>{student.latestViolationType ? formatEventType(student.latestViolationType) : student.admissionReason || "No security event"}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`monitorViolationCount ${Number(student.violationCount || 0) >= 3 ? "danger" : ""}`}>
                                {student.violationCount || 0}/3
                              </span>
                            </td>
                            <td>
                              <div className="monitorActionGroup">
                                <button
                                  className="btn btnTiny btnPrimary"
                                  type="button"
                                  onClick={() => {
                                    setPendingAction({ type: "approve", student });
                                    setActionReason(defaultReasonForAction("approve"));
                                  }}
                                  disabled={student.accessStatus === "ManuallyApproved" || student.attemptStatus === "Submitted"}
                                >
                                  {student.accessStatus === "DeviceChangeRequested" ? "Approve device" : "Approve"}
                                </button>
                                <button
                                  className="btn btnTiny"
                                  type="button"
                                  onClick={() => {
                                    setPendingAction({ type: "reject", student });
                                    setActionReason(defaultReasonForAction("reject"));
                                  }}
                                  disabled={student.accessStatus === "Rejected" || student.attemptStatus === "Submitted"}
                                >
                                  Reject
                                </button>
                                <button
                                  className="btn btnTiny btnDangerSoft"
                                  type="button"
                                  onClick={() => {
                                    setPendingAction({ type: "revoke", student });
                                    setActionReason(defaultReasonForAction("revoke"));
                                  }}
                                  disabled={student.accessStatus === "Removed" || student.attemptStatus === "Submitted"}
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
  if (status === "ManuallyApproved" || status === "Started" || status === "Submitted") {
    return <span className="statusPill statusLive">Approved</span>;
  }

  if (status === "WaitingForPhysicalVerification" || status === "ApprovalRequested") {
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

  if (status === "CodeVerified") {
    return <span className="statusPill statusPublished">Code verified</span>;
  }

  return <span className="statusPill statusDraft">Not joined</span>;
}

function AttemptStatusBadge({ status, accessStatus }) {
  if (status === "Submitted") return <span className="statusPill statusLive">Submitted</span>;
  if (status === "InProgress") return <span className="statusPill statusPublished">In progress</span>;
  if (accessStatus === "Removed") return <span className="statusPill statusDanger">Closed</span>;
  return <span className="statusPill statusDraft">Not started</span>;
}

function AccessActionModal({ action, reason, saving, onReasonChange, onCancel, onConfirm }) {
  const labels = {
    approve: {
      eyebrow: "Manual approval",
      title: "Allow exam access",
      body: "Allow this student to enter this exam without the active entry code?",
      button: "Approve access",
      tone: "btnPrimary",
    },
    reject: {
      eyebrow: "Reject admission",
      title: "Reject access request",
      body: "Reject this student's manual admission request?",
      button: "Reject access",
      tone: "btnDanger",
    },
    revoke: {
      eyebrow: "Revoke admission",
      title: "Revoke exam access",
      body: "Revoke this student's exam access and prevent further activity unless access is granted again?",
      button: "Revoke access",
      tone: "btnDanger",
    },
  };

  const copy = labels[action.type] || labels.reject;
  const studentName = action.student.fullName || action.student.email || "this student";

  return (
    <div className="modalBackdrop" role="presentation">
      <div className="modalCard accessActionModal" role="dialog" aria-modal="true" aria-label={copy.title}>
        <div className="modalHeader">
          <div>
            <span className="summaryLabel">{copy.eyebrow}</span>
            <h3>{copy.title}</h3>
          </div>
          <button className="btn btnTiny" type="button" onClick={onCancel} aria-label="Close">Close</button>
        </div>
        <div className="modalBody stackLg">
          <p className="small">{copy.body.replace("this student", studentName)}</p>
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
          <button className={`btn ${copy.tone}`} type="button" onClick={onConfirm} disabled={saving}>
            {saving ? "Saving..." : copy.button}
          </button>
        </div>
      </div>
    </div>
  );
}

function defaultReasonForAction(type) {
  if (type === "approve") return "Professor approved classroom admission.";
  if (type === "revoke") return "Professor revoked exam admission.";
  return "Professor rejected manual admission.";
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
