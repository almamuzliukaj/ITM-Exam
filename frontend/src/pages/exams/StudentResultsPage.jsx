import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getMyExamResults } from "../../lib/examsApi";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function StudentResultsPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [resultPage, setResultPage] = useState(1);
  const [resultPageSize, setResultPageSize] = useState(6);

 feature/alma-published-result-e2e
  async function loadResults({ silent = false } = {}) {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");
      const data = await getMyExamResults();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(readApiMessage(err) || "Failed to load your published exam results.");
    } finally {
      setLoading(false);
      setRefreshing(false);

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
        if (active) setError(readApiMessage(err) || t("studentResults.loadError"));
      } finally {
        if (active) setLoading(false);
      }
      main
    }
  }

  useEffect(() => {
    if (!user || user.role !== "Student") return;
    loadResults();
 feature/alma-published-result-e2e
  }, [user]);

    return () => {
      active = false;
    };
  }, [user, t]);
 main

  const published = useMemo(() => results.filter((result) => result.isPublished !== false), [results]);
  const averageScore = useMemo(() => {
    if (published.length === 0) return null;
    const total = published.reduce((sum, result) => sum + Number(result.finalScore || 0), 0);
    return total / published.length;
  }, [published]);
  const latestPublished = useMemo(
    () => [...published].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))[0] || null,
    [published],
  );
  const activeResults = published;
  const resultPageCount = Math.max(1, Math.ceil(activeResults.length / resultPageSize));
  const visibleResults = useMemo(() => {
    const startIndex = (resultPage - 1) * resultPageSize;
    return activeResults.slice(startIndex, startIndex + resultPageSize);
  }, [activeResults, resultPage, resultPageSize]);
  const resultStart = activeResults.length === 0 ? 0 : (resultPage - 1) * resultPageSize + 1;
  const resultEnd = Math.min(activeResults.length, resultPage * resultPageSize);

  useEffect(() => {
    setResultPage(1);
  }, [resultPageSize]);

  useEffect(() => {
    setResultPage((current) => Math.min(current, resultPageCount));
  }, [resultPageCount]);

  if (userLoading) return <div className="pageState">{t("studentResults.loading")}</div>;
  if (!user) return <div className="pageState">{userError || t("studentResults.userRequired")}</div>;

  return (
    <AppShell
      user={user}
feature/alma-published-result-e2e
      badge="Result experience"
      title="My exam results"
      subtitle="Only professor-published scores appear here after staff review."
      actions={
        <>
          <button className="btn" type="button" onClick={() => loadResults({ silent: true })} disabled={loading || refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <Link className="btn" to="/exams">Available exams</Link>
        </>
      }

      badge={t("studentResults.badge")}
      title={t("studentResults.title")}
      subtitle={t("studentResults.subtitle")}
      actions={<Link className="btn" to="/exams">{t("studentResults.availableExams")}</Link>}
main
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}

        <section className="summaryStrip">
          <article className="summaryCard">
 feature/alma-published-result-e2e
            <span className="summaryLabel">Visible results</span>

            <span className="summaryLabel">{t("studentResults.submitted")}</span>
 main
            <strong>{results.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{t("studentResults.published")}</span>
            <strong>{published.length}</strong>
          </article>
          <article className="summaryCard">
 feature/alma-published-result-e2e
            <span className="summaryLabel">Hidden pending</span>
            <strong>Protected</strong>

            <span className="summaryLabel">{t("studentResults.pending")}</span>
            <strong>{pending.length}</strong>
 main
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{t("studentResults.average")}</span>
            <strong>{averageScore == null ? "--" : formatScore(averageScore)}</strong>
          </article>
        </section>

        <section className="resultPolicyStrip">
          <div>
 feature/alma-published-result-e2e
            <strong>Result visibility rule</strong>
            <span>Submitted attempts stay hidden until staff save grading and publish the final result.</span>

            <strong>{t("studentResults.visibilityTitle")}</strong>
            <span>{t("studentResults.visibilityText")}</span>
 main
          </div>
          <div>
            <strong>{latestPublished ? formatDateTime(latestPublished.publishedAt) : t("studentResults.noPublication")}</strong>
            <span>{t("studentResults.latestPublished")}</span>
          </div>
        </section>

        <section className="surfaceCard">
            <div className="sectionHeader">
              <div>
 feature/alma-published-result-e2e
                <h3>Published results</h3>
                <span className="sectionMeta">Showing {resultStart}-{resultEnd} of {activeResults.length} result{activeResults.length === 1 ? "" : "s"}.</span>

                <h3>{activeResultView === "published" ? t("studentResults.publishedResults") : t("studentResults.pendingReview")}</h3>
                <span className="sectionMeta">{t("studentResults.showing", { start: resultStart, end: resultEnd, count: activeResults.length, suffix: activeResults.length === 1 ? "" : "s" })}</span>
 main
              </div>
            </div>
            <div className="sectionBody stackLg">
              <div className="adminToolbar">
 feature/alma-published-result-e2e
                <div className="resultLifecycleHint">
                  <strong>Lifecycle check</strong>
                  <span>Save grading {"->"} publish result {"->"} student refreshes this page.</span>
                </div>
                <div className="adminToolbarStatus">
                  <span className="statusPill statusLive">{published.length} published</span>
                  <select className="input inputCompact" value={resultPageSize} onChange={(e) => setResultPageSize(Number(e.target.value))} aria-label="Results per page">
                    <option value={6}>6 rows</option>
                    <option value={12}>12 rows</option>
                    <option value={24}>24 rows</option>

                <div className="segmentedControl" aria-label={t("studentResults.resultView")}>
                  <button className={activeResultView === "published" ? "active" : ""} type="button" onClick={() => setActiveResultView("published")}>
                    {t("studentResults.published")}
                  </button>
                  <button className={activeResultView === "pending" ? "active" : ""} type="button" onClick={() => setActiveResultView("pending")}>
                    {t("studentResults.pending")}
                  </button>
                </div>
                <div className="adminToolbarStatus">
                  <span className="statusPill statusLive">{t("studentResults.publishedCount", { count: published.length })}</span>
                  <span className="statusPill statusDraft">{t("studentResults.pendingCount", { count: pending.length })}</span>
                  <select className="input inputCompact" value={resultPageSize} onChange={(e) => setResultPageSize(Number(e.target.value))} aria-label={t("studentResults.rowsAria")}>
                    <option value={6}>{t("studentResults.rows", { count: 6 })}</option>
                    <option value={12}>{t("studentResults.rows", { count: 12 })}</option>
                    <option value={24}>{t("studentResults.rows", { count: 24 })}</option>
 main
                  </select>
                </div>
              </div>
              {loading ? (
 feature/alma-published-result-e2e
                <div className="pageStateCard">Loading published results...</div>
              ) : activeResults.length === 0 ? (
                <div className="emptyState">
                  <p>No published results yet.</p>
                  <p>After the professor saves grading and publishes the result, refresh this page to see your score.</p>

                <div className="pageStateCard">{t("studentResults.loadingRecords")}</div>
              ) : activeResults.length === 0 ? (
                <div className="emptyState">
                  <p>{activeResultView === "published" ? t("studentResults.emptyPublishedTitle") : t("studentResults.emptyPendingTitle")}</p>
                  <p>{activeResultView === "published" ? t("studentResults.emptyPublishedText") : t("studentResults.emptyPendingText")}</p>
main
                </div>
              ) : (
                <div className="resultCardStack">
                  {visibleResults.map((result) => (
                    <ResultCard key={result.attemptId} result={result} t={t} />
                  ))}
                </div>
 feature/alma-published-result-e2e

              ) : (
                <div className="studentItemList">
                  {visibleResults.map((result) => (
                    <div key={result.attemptId} className="studentItemRow">
                      <div>
                        <strong>{result.examTitle}</strong>
                        <span>{t("studentResults.submittedAt", { date: formatDateTime(result.submittedAt) })}</span>
                      </div>
                      <span className="statusPill statusDraft">{formatStatus(result.status, t)}</span>
                    </div>
                  ))}
                </div>
 main
              )}
              <div className="paginationBar">
                <span>{t("studentResults.showing", { start: resultStart, end: resultEnd, count: activeResults.length, suffix: activeResults.length === 1 ? "" : "s" })}</span>
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
        <p>{t("studentResults.submittedAt", { date: formatDateTime(result.submittedAt) })}</p>
      </div>
      <div className="resultScoreBlock">
        <strong>{formatScore(result.finalScore)}</strong>
        <span>{t("studentResults.finalScore")}</span>
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
          <dt>{t("studentResults.publishedAt")}</dt>
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

feature/alma-published-result-e2e

function formatStatus(status, t) {
  if (status === "ReadyToPublish") return t("studentResults.ready");
  return status || t("studentResults.pending");
}

 main
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
