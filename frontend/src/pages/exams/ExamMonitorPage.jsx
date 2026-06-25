import { Link, useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getExam, getExamIntegritySummary } from "../../lib/examsApi";

const REFRESH_MS = 5000;

export default function ExamMonitorPage() {
  const { examId } = useParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exam, setExam] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

      const [examData, summaryData] = await Promise.all([
        getExam(examId),
        getExamIntegritySummary(examId),
      ]);

      const nextEvents = flattenEvents(summaryData?.attempts || []);
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
      setSummary(summaryData);
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

  const attempts = useMemo(() => Array.isArray(summary?.attempts) ? summary.attempts : [], [summary]);
  const activeAttempts = useMemo(() => attempts.filter((attempt) => attempt.attemptStatus === "InProgress"), [attempts]);
  const submittedAttempts = useMemo(() => attempts.filter((attempt) => attempt.attemptStatus === "Submitted"), [attempts]);
  const flaggedAttempts = useMemo(() => attempts.filter((attempt) => Number(attempt.attemptViolationCount || 0) > 0), [attempts]);
  const autoSubmittedAttempts = useMemo(() => attempts.filter((attempt) => Boolean(attempt.autoActionTriggeredAt)), [attempts]);
  const latestEvents = useMemo(() => flattenEvents(attempts).slice(0, 10), [attempts]);

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
              <MonitorMetric label="Active attempts" value={activeAttempts.length} tone="live" />
              <MonitorMetric label="Submitted" value={submittedAttempts.length} />
              <MonitorMetric label="Students flagged" value={flaggedAttempts.length} tone={flaggedAttempts.length > 0 ? "warn" : "clear"} />
              <MonitorMetric label="Total violations" value={summary?.totalViolations || 0} tone={Number(summary?.totalViolations || 0) > 0 ? "danger" : "clear"} />
              <MonitorMetric label="Auto actions" value={autoSubmittedAttempts.length} tone={autoSubmittedAttempts.length > 0 ? "danger" : "clear"} />
            </section>

            <section className="monitorLayout">
              <div className="surfaceCard monitorRosterCard">
                <div className="sectionHeader">
                  <div>
                    <h3>Student activity</h3>
                    <span className="sectionMeta">Current attempt state, violation count, and latest policy action.</span>
                  </div>
                  <span className="statusPill statusDraft">{attempts.length} attempts</span>
                </div>
                <div className="sectionBody">
                  {attempts.length === 0 ? (
                    <div className="emptyState">
                      <strong>No active attempts yet</strong>
                      <span>Students will appear here after they start the exam.</span>
                    </div>
                  ) : (
                    <div className="monitorTableWrap">
                      <table className="dataTable monitorTable">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Status</th>
                            <th>Violations</th>
                            <th>Last event</th>
                            <th>Policy</th>
                            <th>Started</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attempts.map((attempt) => (
                            <tr key={attempt.attemptId} className={Number(attempt.attemptViolationCount || 0) > 0 ? "monitorFlaggedRow" : ""}>
                              <td>
                                <strong>{attempt.studentName || "Student"}</strong>
                                <span>{attempt.studentEmail}</span>
                              </td>
                              <td><AttemptStatusBadge attempt={attempt} /></td>
                              <td>
                                <span className={`monitorViolationCount ${Number(attempt.attemptViolationCount || 0) >= Number(summary?.autoActionThreshold || 3) ? "danger" : ""}`}>
                                  {attempt.attemptViolationCount || 0}/{summary?.autoActionThreshold || 3}
                                </span>
                              </td>
                              <td>{attempt.lastViolationAt ? formatDateTime(attempt.lastViolationAt) : "No events"}</td>
                              <td><PolicyBadge value={attempt.currentPolicyAction} /></td>
                              <td>{formatDateTime(attempt.startedAt)}</td>
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

function AttemptStatusBadge({ attempt }) {
  if (attempt.autoActionTriggeredAt) {
    return <span className="statusPill statusWarn">Auto submitted</span>;
  }

  if (attempt.attemptStatus === "Submitted") {
    return <span className="statusPill statusLive">Submitted</span>;
  }

  return <span className="statusPill statusDraft">In progress</span>;
}

function PolicyBadge({ value }) {
  const normalized = value || "None";
  const warn = normalized !== "None";
  return <span className={`statusPill ${warn ? "statusWarn" : "statusLive"}`}>{formatPolicy(normalized)}</span>;
}

function flattenEvents(attempts) {
  return attempts
    .flatMap((attempt) => (Array.isArray(attempt.events) ? attempt.events : []).map((event) => ({
      ...event,
      studentName: attempt.studentName || attempt.studentEmail || "Student",
      attemptId: attempt.attemptId,
    })))
    .filter((event) => event.eventId)
    .sort((left, right) => Date.parse(right.occurredAt || right.recordedAt || "") - Date.parse(left.occurredAt || left.recordedAt || ""));
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

function formatPolicy(value) {
  if (value === "AutoSubmit") return "Auto submit";
  if (value === "FinalWarning") return "Final warning";
  return value || "None";
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
