import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { allowExamStudentAccess, getExam, getExamLiveMonitor, rejectExamStudentAccess, revokeExamStudentAccess } from "../../lib/examsApi";

const REFRESH_MS = 5000;

export default function ExamMonitorPage() {
  const { examId } = useParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exam, setExam] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionStudentId, setActionStudentId] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const seenEventIdsRef = useRef(new Set());
  const [newEventIds, setNewEventIds] = useState(new Set());

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

      const nextEvents = flattenMonitorEvents(monitorData?.students || []);
      const nextNewIds = new Set();
      for (const event of nextEvents) {
        if (!seenEventIdsRef.current.has(event.eventId)) {
          nextNewIds.add(event.eventId);
        }
      }

      if (seenEventIdsRef.current.size === 0) {
        nextNewIds.clear();
      }

      seenEventIdsRef.current = new Set(nextEvents.map((event) => event.eventId));
      setNewEventIds(nextNewIds);
      setExam(examData);
      setSummary(monitorData);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(readApiMessage(err) || "Failed to load live monitor.");
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

  const students = useMemo(() => Array.isArray(summary?.students) ? summary.students : [], [summary]);
  const activeStudents = useMemo(() => students.filter((student) => student.attemptStatus === "InProgress"), [students]);
  const submittedStudents = useMemo(() => students.filter((student) => student.attemptStatus === "Submitted"), [students]);
  const waitingStudents = useMemo(() => students.filter((student) => ["WaitingForPhysicalVerification", "ApprovalRequested", "DeviceChangeRequested"].includes(student.accessStatus)), [students]);
  const flaggedStudents = useMemo(() => students.filter((student) => Number(student.violationCount || 0) > 0), [students]);
  const latestEvents = useMemo(() => flattenMonitorEvents(students).slice(0, 10), [students]);

  async function performStudentAction(student, action) {
    if (!examId || !student?.studentId) return;
    const reason = window.prompt(
      action === "approve"
        ? "Approval note"
        : action === "reject"
          ? "Rejection reason"
          : "Revocation reason",
      action === "approve"
        ? "Physical identity verified by staff."
        : action === "reject"
          ? "Physical identity was not approved."
          : "Admission/session revoked by staff.",
    );

    if (reason === null) return;

    try {
      setActionStudentId(student.studentId);
      setError("");
      if (action === "approve") {
        await allowExamStudentAccess(examId, student.studentId, reason);
      } else if (action === "reject") {
        await rejectExamStudentAccess(examId, student.studentId, reason);
      } else {
        await revokeExamStudentAccess(examId, student.studentId, reason);
      }
      await loadMonitor(true);
    } catch (err) {
      setError(readApiMessage(err) || "Student admission action failed.");
    } finally {
      setActionStudentId("");
    }
  }

  if (userLoading) return <div className="pageState">Loading monitor...</div>;
  if (!user) return <div className="pageState">{userError || "You must be signed in."}</div>;

  return (
    <AppShell
      user={user}
      badge="Live monitor"
      title={exam?.title ? `${exam.title} monitor` : "Exam monitor"}
      subtitle="Track active attempts, integrity violations, and auto-submit policy actions while the exam is running."
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
          <div className="pageStateCard">Loading live exam monitor...</div>
        ) : (
          <>
            <section className="monitorHero">
              <div>
                <span className="summaryLabel">Monitoring workspace</span>
                <h2>{summary?.examTitle || exam?.title || "Exam monitor"}</h2>
                <p>
                  Auto-refresh checks the integrity stream every {Math.round(REFRESH_MS / 1000)} seconds.
                  New violations are highlighted as they arrive.
                </p>
              </div>
              <div className="monitorHeartbeat">
                <span className={autoRefresh ? "monitorLiveDot" : "monitorPausedDot"} />
                <strong>{autoRefresh ? "Live" : "Paused"}</strong>
                <small>{lastUpdated ? `Updated ${formatTime(lastUpdated)}` : "Waiting for first sync"}</small>
              </div>
            </section>

            <section className="monitorMetricGrid">
              <MonitorMetric label="Waiting approval" value={waitingStudents.length || summary?.summary?.waitingForPhysicalVerification || 0} tone={waitingStudents.length > 0 ? "warn" : "clear"} />
              <MonitorMetric label="In progress" value={activeStudents.length || summary?.summary?.active || 0} tone="live" />
              <MonitorMetric label="Submitted" value={submittedStudents.length || summary?.summary?.submitted || 0} />
              <MonitorMetric label="Students flagged" value={flaggedStudents.length || summary?.summary?.withViolations || 0} tone={flaggedStudents.length > 0 ? "danger" : "clear"} />
              <MonitorMetric label="Enrolled" value={summary?.summary?.totalEnrolled || students.length} />
            </section>

            <section className="monitorLayout">
              <div className="surfaceCard monitorRosterCard">
                <div className="sectionHeader">
                  <div>
                    <h3>Physical admission roster</h3>
                    <span className="sectionMeta">Verify classroom identity, control access, and monitor live exam state.</span>
                  </div>
                  <span className="statusPill statusDraft">{students.length} students</span>
                </div>
                <div className="sectionBody">
                  {students.length === 0 ? (
                    <div className="emptyState">
                      <strong>No enrolled students found</strong>
                      <span>Eligible students will appear here after the exam is linked to an offering.</span>
                    </div>
                  ) : (
                    <div className="monitorTableWrap">
                      <table className="dataTable monitorTable">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Admission</th>
                            <th>Attempt</th>
                            <th>Violations</th>
                            <th>Last activity</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => (
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
                              </td>
                              <td>
                                <div className="monitorActivityCell">
                                  <strong>{formatDateTime(student.lastActivityAt || student.startedAt || student.verifiedAt)}</strong>
                                  <span>{student.latestViolationType ? formatEventType(student.latestViolationType) : student.admissionReason || "No security event"}</span>
                                </div>
                              </td>
                              <td>
                                <div className="monitorActionGroup">
                                  <button className="btn btnTiny btnPrimary" type="button" onClick={() => performStudentAction(student, "approve")} disabled={actionStudentId === student.studentId || student.accessStatus === "ManuallyApproved" || student.attemptStatus === "Submitted"}>
                                    {student.accessStatus === "DeviceChangeRequested" ? "Approve device" : "Approve"}
                                  </button>
                                  <button className="btn btnTiny" type="button" onClick={() => performStudentAction(student, "reject")} disabled={actionStudentId === student.studentId || student.attemptStatus === "Submitted"}>
                                    Reject
                                  </button>
                                  <button className="btn btnTiny btnDangerSoft" type="button" onClick={() => performStudentAction(student, "revoke")} disabled={actionStudentId === student.studentId || student.accessStatus === "Removed" || student.attemptStatus === "Submitted"}>
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
              </div>

              <aside className="surfaceCard monitorEventsCard">
                <div className="sectionHeader">
                  <div>
                    <h3>Integrity stream</h3>
                    <span className="sectionMeta">Latest violation events.</span>
                  </div>
                </div>
                <div className="sectionBody">
                  {latestEvents.length === 0 ? (
                    <div className="emptyState compact">
                      <strong>No violations recorded</strong>
                      <span>The integrity stream is currently clear.</span>
                    </div>
                  ) : (
                    <ol className="monitorEventList">
                      {latestEvents.map((event) => (
                        <li key={event.eventId} className={newEventIds.has(event.eventId) ? "monitorNewEvent" : ""}>
                          <div>
                            <strong>{formatEventType(event.eventType)}</strong>
                            <span>{event.studentName}</span>
                          </div>
                          <small>{formatDateTime(event.occurredAt)} · #{event.attemptViolationCount}</small>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </aside>
            </section>
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

  return <span className="statusPill statusDraft">Not joined</span>;
}

function AttemptStatusBadge({ student }) {
  if (student.attemptStatus === "Submitted") {
    return <span className="statusPill statusLive">Submitted</span>;
  }

  if (student.attemptStatus === "InProgress") {
    return <span className="statusPill statusPublished">In progress</span>;
  }

  if (student.accessStatus === "Removed") {
    return <span className="statusPill statusDanger">Closed</span>;
  }

  return <span className="statusPill statusDraft">Not started</span>;
}

function flattenMonitorEvents(students) {
  return students
    .filter((student) => student.latestViolationAt || student.accessStatus === "DeviceChangeRequested" || student.accessStatus === "Removed")
    .map((student) => ({
      eventId: `${student.studentId}-${student.latestViolationAt || student.lastActivityAt || student.accessStatus}`,
      eventType: student.latestViolationType || student.accessStatus,
      studentName: student.fullName || student.email || "Student",
      occurredAt: student.latestViolationAt || student.lastActivityAt || student.verifiedAt,
      attemptViolationCount: student.violationCount || 0,
    }))
    .sort((left, right) => Date.parse(right.occurredAt || "") - Date.parse(left.occurredAt || ""));
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
    second: "2-digit",
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
  return String(value || "Integrity event")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
