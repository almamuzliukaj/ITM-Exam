import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getMyExamResults } from "../../lib/examsApi";
import { useEffect, useMemo, useState } from "react";

export default function StudentResultsPage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeResultView, setActiveResultView] = useState("published");
  const [resultPage, setResultPage] = useState(1);
  const [resultPageSize, setResultPageSize] = useState(6);

  useEffect(() => {
    if (!user || user.role !== "Student") return;

    let active = true;

    async function loadResults() {
      try {
        setLoading(true);
        setError("");
        const data = await getMyExamResults();
        if (active) setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setError(readApiMessage(err) || "Failed to load your exam results.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResults();
    return () => {
      active = false;
    };
  }, [user]);

  const published = useMemo(() => results.filter((result) => result.isPublished), [results]);
  const pending = useMemo(() => results.filter((result) => !result.isPublished), [results]);
  const averageScore = useMemo(() => {
    if (published.length === 0) return null;
    const total = published.reduce((sum, result) => sum + Number(result.finalScore || 0), 0);
    return total / published.length;
  }, [published]);
  const latestPublished = useMemo(
    () => [...published].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))[0] || null,
    [published],
  );
  const activeResults = activeResultView === "published" ? published : pending;
  const resultPageCount = Math.max(1, Math.ceil(activeResults.length / resultPageSize));
  const visibleResults = useMemo(() => {
    const startIndex = (resultPage - 1) * resultPageSize;
    return activeResults.slice(startIndex, startIndex + resultPageSize);
  }, [activeResults, resultPage, resultPageSize]);
  const resultStart = activeResults.length === 0 ? 0 : (resultPage - 1) * resultPageSize + 1;
  const resultEnd = Math.min(activeResults.length, resultPage * resultPageSize);

  useEffect(() => {
    setResultPage(1);
  }, [activeResultView, resultPageSize]);

  useEffect(() => {
    setResultPage((current) => Math.min(current, resultPageCount));
  }, [resultPageCount]);

  if (userLoading) return <div className="pageState">Loading results...</div>;
  if (!user) return <div className="pageState">{userError || "You must be signed in."}</div>;

  return (
    <AppShell
      user={user}
      badge="Result experience"
      title="My exam results"
      subtitle="Published scores appear here after staff review. Pending attempts stay hidden until the professor publishes them."
      actions={<Link className="btn" to="/exams">Available exams</Link>}
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}

        <section className="summaryStrip">
          <article className="summaryCard">
            <span className="summaryLabel">Submitted</span>
            <strong>{results.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Published</span>
            <strong>{published.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Pending</span>
            <strong>{pending.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Average</span>
            <strong>{averageScore == null ? "--" : formatScore(averageScore)}</strong>
          </article>
        </section>

        <section className="resultPolicyStrip">
          <div>
            <strong>Result visibility rule</strong>
            <span>Scores stay hidden until staff complete review and publish the result.</span>
          </div>
          <div>
            <strong>{latestPublished ? formatDateTime(latestPublished.publishedAt) : "No publication yet"}</strong>
            <span>Latest published result</span>
          </div>
        </section>

        <section className="surfaceCard">
            <div className="sectionHeader">
              <div>
                <h3>{activeResultView === "published" ? "Published results" : "Pending review"}</h3>
                <span className="sectionMeta">Showing {resultStart}-{resultEnd} of {activeResults.length} result{activeResults.length === 1 ? "" : "s"}.</span>
              </div>
            </div>
            <div className="sectionBody stackLg">
              <div className="adminToolbar">
                <div className="segmentedControl" aria-label="Result view">
                  <button className={activeResultView === "published" ? "active" : ""} type="button" onClick={() => setActiveResultView("published")}>
                    Published
                  </button>
                  <button className={activeResultView === "pending" ? "active" : ""} type="button" onClick={() => setActiveResultView("pending")}>
                    Pending
                  </button>
                </div>
                <div className="adminToolbarStatus">
                  <span className="statusPill statusLive">{published.length} published</span>
                  <span className="statusPill statusDraft">{pending.length} pending</span>
                  <select className="input inputCompact" value={resultPageSize} onChange={(e) => setResultPageSize(Number(e.target.value))} aria-label="Results per page">
                    <option value={6}>6 rows</option>
                    <option value={12}>12 rows</option>
                    <option value={24}>24 rows</option>
                  </select>
                </div>
              </div>
              {loading ? (
                <div className="pageStateCard">Loading results...</div>
              ) : activeResults.length === 0 ? (
                <div className="emptyState">
                  <p>{activeResultView === "published" ? "No published results yet." : "No pending attempts."}</p>
                  <p>{activeResultView === "published" ? "After grading and publication, your score and review notes will appear here." : "Submitted attempts waiting for review will appear here."}</p>
                </div>
              ) : activeResultView === "published" ? (
                <div className="resultCardStack">
                  {visibleResults.map((result) => (
                    <ResultCard key={result.attemptId} result={result} />
                  ))}
                </div>
              ) : (
                <div className="studentItemList">
                  {visibleResults.map((result) => (
                    <div key={result.attemptId} className="studentItemRow">
                      <div>
                        <strong>{result.examTitle}</strong>
                        <span>Submitted {formatDateTime(result.submittedAt)}</span>
                      </div>
                      <span className="statusPill statusDraft">{formatStatus(result.status)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="paginationBar">
                <span>Showing {resultStart}-{resultEnd} of {activeResults.length}</span>
                <div className="paginationActions">
                  <button className="btn" type="button" disabled={resultPage <= 1} onClick={() => setResultPage((current) => Math.max(1, current - 1))}>Previous</button>
                  <span className="paginationCurrent">Page {resultPage} of {resultPageCount}</span>
                  <button className="btn" type="button" disabled={resultPage >= resultPageCount} onClick={() => setResultPage((current) => Math.min(resultPageCount, current + 1))}>Next</button>
                </div>
              </div>
            </div>
        </section>
      </div>
    </AppShell>
  );
}

function ResultCard({ result }) {
  return (
    <article className="resultCard">
      <div>
        <span className="summaryLabel">Published result</span>
        <h4>{result.examTitle}</h4>
        <p>Submitted {formatDateTime(result.submittedAt)}</p>
      </div>
      <div className="resultScoreBlock">
        <strong>{formatScore(result.finalScore)}</strong>
        <span>Final score</span>
      </div>
      <dl className="resultMetaList">
        <div>
          <dt>Auto score</dt>
          <dd>{formatScore(result.autoScore)}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{formatDateTime(result.publishedAt)}</dd>
        </div>
        <div>
          <dt>Notes</dt>
          <dd>{result.gradingNotes || "No notes added."}</dd>
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

function formatStatus(status) {
  if (status === "ReadyToPublish") return "Ready";
  return status || "Pending";
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
