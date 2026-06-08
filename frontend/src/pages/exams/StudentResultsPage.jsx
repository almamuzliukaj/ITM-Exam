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

        <section className="studentJourneyPanel">
          <div className="sectionHeader">
            <div>
              <h3>Result validation checkpoint</h3>
              <span className="sectionMeta">Use this during final testing to confirm pending and published states are separated.</span>
            </div>
            <span className="statusPill statusLive">{published.length}/{results.length || 0} published</span>
          </div>
          <div className="studentJourneyGrid">
            <article className={results.length > 0 ? "journeyCheckPassed" : "journeyCheckWarn"}>
              <span>{results.length > 0 ? "Ready" : "Check"}</span>
              <strong>Submitted attempts</strong>
              <small>{results.length > 0 ? `${results.length} attempt(s) returned` : "Submit an exam first"}</small>
            </article>
            <article className={pending.length >= 0 ? "journeyCheckPassed" : "journeyCheckWarn"}>
              <span>Ready</span>
              <strong>Pending privacy</strong>
              <small>{pending.length} attempt(s) waiting for publication</small>
            </article>
            <article className={published.length > 0 ? "journeyCheckPassed" : "journeyCheckWarn"}>
              <span>{published.length > 0 ? "Ready" : "Check"}</span>
              <strong>Published visibility</strong>
              <small>{published.length > 0 ? "Score and notes are visible" : "Publish a graded result to verify"}</small>
            </article>
          </div>
        </section>

        <section className="resultsLayout">
          <article className="surfaceCard">
            <div className="sectionHeader">
              <div>
                <h3>Published results</h3>
                <span className="small">Visible to the student after staff approval.</span>
              </div>
            </div>
            <div className="sectionBody">
              {loading ? (
                <div className="pageStateCard">Loading published results...</div>
              ) : published.length === 0 ? (
                <div className="emptyState">
                  <p>No published results yet.</p>
                  <p>After grading and publication, your score and review notes will appear here.</p>
                </div>
              ) : (
                <div className="resultCardStack">
                  {published.map((result) => (
                    <ResultCard key={result.attemptId} result={result} />
                  ))}
                </div>
              )}
            </div>
          </article>

          <aside className="surfaceCard resultStatusPanel">
            <div className="sectionHeader">
              <h3>Review queue</h3>
            </div>
            <div className="sectionBody">
              {loading ? (
                <div className="pageStateCard">Checking attempts...</div>
              ) : pending.length === 0 ? (
                <div className="emptyState">No pending attempts.</div>
              ) : (
                <div className="studentItemList">
                  {pending.map((result) => (
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
            </div>
          </aside>
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
