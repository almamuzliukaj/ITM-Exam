import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { deleteExam, listExams } from "../../lib/examsApi";
import { canCreateExams } from "../../lib/permissions";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ExamsListPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [examStatusFilter, setExamStatusFilter] = useState("all");
  const [examPage, setExamPage] = useState(1);
  const [examPageSize, setExamPageSize] = useState(6);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listExams();
        if (active) setExams(Array.isArray(data) ? data : []);
      } catch {
        if (active) setError(t("examsList.error"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  const canCreate = canCreateExams(user?.role);
  const isStudent = user?.role === "Student";
  const filteredExams = useMemo(() => {
    if (examStatusFilter === "published") return exams.filter((exam) => exam.isPublished);
    if (examStatusFilter === "draft") return exams.filter((exam) => !exam.isPublished);
    if (examStatusFilter === "lockdown") return exams.filter((exam) => exam.requiresLockdown);
    return exams;
  }, [examStatusFilter, exams]);
  const examPageCount = Math.max(1, Math.ceil(filteredExams.length / examPageSize));
  const visibleExams = useMemo(() => {
    const startIndex = (examPage - 1) * examPageSize;
    return filteredExams.slice(startIndex, startIndex + examPageSize);
  }, [examPage, examPageSize, filteredExams]);
  const examStart = filteredExams.length === 0 ? 0 : (examPage - 1) * examPageSize + 1;
  const examEnd = Math.min(filteredExams.length, examPage * examPageSize);

  useEffect(() => {
    setExamPage(1);
  }, [examStatusFilter, examPageSize]);

  useEffect(() => {
    setExamPage((current) => Math.min(current, examPageCount));
  }, [examPageCount]);

  if (userLoading) {
    return <div className="pageState">{t("examsList.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("examsList.userError")}</div>;
  }

  async function onDeleteDraft(exam) {
    if (!exam?.id || exam.isPublished) return;

    const confirmed = window.confirm(`Delete draft "${exam.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(exam.id);
      setError("");
      await deleteExam(exam.id);
      setExams((current) => current.filter((item) => item.id !== exam.id));
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to delete draft exam.");
    } finally {
      setDeletingId("");
    }
  }

  function onStartExam(exam) {
    if (!exam?.id) return;
    window.location.href = `/exams/${exam.id}/attempt`;
  }

  return (
    <AppShell
      user={user}
      badge={t("examsList.badge")}
      title={t("examsList.title")}
      subtitle={t("examsList.subtitle")}
      actions={canCreate ? <Link to="/exams/new" className="btn btnPrimary">{t("examsList.create")}</Link> : null}
    >
      <div className="stackXl">
        <section className="summaryStrip">
          <article className="summaryCard">
            <span className="summaryLabel">{t("examsList.total")}</span>
            <strong>{exams.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{t("examsList.published")}</span>
            <strong>{exams.filter((exam) => exam.isPublished).length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{t("examsList.draft")}</span>
            <strong>{exams.filter((exam) => !exam.isPublished).length}</strong>
          </article>
        </section>

        {error ? <div className="alert">{error}</div> : null}

        <section className="surfaceCard listControlPanel">
          <div className="sectionBody">
            <div className="adminToolbar">
              <div className="segmentedControl" aria-label="Exam status filter">
                <button className={examStatusFilter === "all" ? "active" : ""} type="button" onClick={() => setExamStatusFilter("all")}>All</button>
                <button className={examStatusFilter === "published" ? "active" : ""} type="button" onClick={() => setExamStatusFilter("published")}>{t("examsList.published")}</button>
                {!isStudent ? <button className={examStatusFilter === "draft" ? "active" : ""} type="button" onClick={() => setExamStatusFilter("draft")}>{t("examsList.draft")}</button> : null}
                <button className={examStatusFilter === "lockdown" ? "active" : ""} type="button" onClick={() => setExamStatusFilter("lockdown")}>Lockdown</button>
              </div>
              <div className="adminToolbarStatus">
                <span className="small">Showing {examStart}-{examEnd} of {filteredExams.length}</span>
                <select className="input inputCompact" value={examPageSize} onChange={(e) => setExamPageSize(Number(e.target.value))} aria-label="Exams per page">
                  <option value={6}>{isStudent ? "6 cards" : "6 rows"}</option>
                  <option value={12}>{isStudent ? "12 cards" : "12 rows"}</option>
                  <option value={24}>{isStudent ? "24 cards" : "24 rows"}</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="pageStateCard">{t("examsList.loadingRecords")}</div>
        ) : filteredExams.length === 0 ? (
          <div className="emptyState">
            <p>{t("examsList.emptyTitle")}</p>
            <p>{t("examsList.emptyText")}</p>
          </div>
 exam-session-question-bank-fixes
        ) : (
          <section className="resourceGrid">
            {exams.map((exam) => (
              <article key={exam.id} className="resourceCard">
                <div className="resourceMetaRow">
                  <span className={`statusPill ${exam.isPublished ? "statusLive" : "statusDraft"}`}>
                    {exam.isPublished ? t("examsList.published") : t("examsList.draft")}
                  </span>
                  <span className="small">{exam.durationMinutes || 60} min</span>
                </div>
                <h3>{exam.title}</h3>
                <p>{exam.description || t("examsList.noDescription")}</p>
                <div className="resourceFooter">
                  <div className="small">{t("examsList.openHint")}</div>
                  <div className="resourceActionGroup">
                    {canCreate && !exam.isPublished ? (
                      <Link className="btn btnPrimary" to={`/exams/${exam.id}`}>Continue setup</Link>
                    ) : null}
                    {canCreate && !exam.isPublished ? (
                      <button
                        className="btn btnDanger"
                        type="button"
                        onClick={() => onDeleteDraft(exam)}
                        disabled={deletingId === exam.id}
                      >
                        {deletingId === exam.id ? "Deleting..." : "Delete draft"}
                      </button>
                    ) : null}
                    {isStudent ? (
                      <button className="btn btnPrimary" type="button" onClick={() => onStartExam(exam)}>
                        Start
                      </button>
                    ) : (
                      <Link className="btn" to={`/exams/${exam.id}`}>
                        {t("examsList.open")}
                      </Link>
                    )}

        ) : isStudent ? (
          <section className="stackLg">
            <div className="resourceGrid">
              {visibleExams.map((exam) => (
                <article key={exam.id} className="resourceCard">
                  <div className="resourceMetaRow">
                    <span className={`statusPill ${exam.isPublished ? "statusLive" : "statusDraft"}`}>
                      {exam.isPublished ? t("examsList.published") : t("examsList.draft")}
                    </span>
                    {exam.requiresLockdown ? (
                      <span className="statusPill statusWarn">Lockdown</span>
                    ) : null}
                    <span className="small">{exam.durationMinutes || 60} min</span>
                  </div>
                  <h3>{exam.title}</h3>
                  <p>{exam.description || t("examsList.noDescription")}</p>
                  <div className="resourceFooter">
                    <div className="small">{t("examsList.openHint")}</div>
                    <div className="resourceActionGroup">
                      {canCreate && !exam.isPublished ? (
                        <Link className="btn btnPrimary" to={`/exams/${exam.id}`}>Continue setup</Link>
                      ) : null}
                      {canCreate && !exam.isPublished ? (
                        <button
                          className="btn btnDanger"
                          type="button"
                          onClick={() => onDeleteDraft(exam)}
                          disabled={deletingId === exam.id}
                        >
                          {deletingId === exam.id ? "Deleting..." : "Delete draft"}
                        </button>
                      ) : null}
                      <Link className={isStudent ? "btn btnPrimary" : "btn"} to={isStudent ? `/exams/${exam.id}/attempt` : `/exams/${exam.id}`}>
                        {isStudent ? (exam.requiresLockdown ? "Check setup" : "Start") : t("examsList.open")}
                      </Link>
                    </div>
 main
                  </div>
                </article>
              ))}
            </div>
            <div className="paginationBar">
              <span>Showing {examStart}-{examEnd} of {filteredExams.length}</span>
              <div className="paginationActions">
                <button className="btn" type="button" disabled={examPage <= 1} onClick={() => setExamPage((current) => Math.max(1, current - 1))}>Previous</button>
                <span className="paginationCurrent">Page {examPage} of {examPageCount}</span>
                <button className="btn" type="button" disabled={examPage >= examPageCount} onClick={() => setExamPage((current) => Math.min(examPageCount, current + 1))}>Next</button>
              </div>
            </div>
          </section>
        ) : (
          <section className="stackLg">
            <div className="tableWrap">
              <table className="dataTable examDirectoryTable">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Offering</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Security</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleExams.map((exam) => (
                    <tr key={exam.id}>
                      <td>
                        <div className="examDirectoryTitle">
                          <strong>{exam.title}</strong>
                          <span>{exam.description || t("examsList.noDescription")}</span>
                        </div>
                      </td>
                      <td>{formatExamOffering(exam)}</td>
                      <td>
                        <span className={`statusPill ${exam.isPublished ? "statusLive" : "statusDraft"}`}>
                          {exam.isPublished ? t("examsList.published") : t("examsList.draft")}
                        </span>
                      </td>
                      <td>{exam.durationMinutes || 60} min</td>
                      <td>
                        {exam.requiresLockdown ? (
                          <span className="statusPill statusWarn">Lockdown</span>
                        ) : (
                          <span className="statusPill statusDraft">Standard</span>
                        )}
                      </td>
                      <td>
                        <div className="resourceActionGroup">
                          {canCreate && !exam.isPublished ? (
                            <Link className="btn btnPrimary" to={`/exams/${exam.id}`}>Continue setup</Link>
                          ) : null}
                          {canCreate && !exam.isPublished ? (
                            <button
                              className="btn btnDanger"
                              type="button"
                              onClick={() => onDeleteDraft(exam)}
                              disabled={deletingId === exam.id}
                            >
                              {deletingId === exam.id ? "Deleting..." : "Delete draft"}
                            </button>
                          ) : null}
                          <Link className="btn" to={`/exams/${exam.id}`}>
                            {t("examsList.open")}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="paginationBar">
              <span>Showing {examStart}-{examEnd} of {filteredExams.length}</span>
              <div className="paginationActions">
                <button className="btn" type="button" disabled={examPage <= 1} onClick={() => setExamPage((current) => Math.max(1, current - 1))}>Previous</button>
                <span className="paginationCurrent">Page {examPage} of {examPageCount}</span>
                <button className="btn" type="button" disabled={examPage >= examPageCount} onClick={() => setExamPage((current) => Math.min(examPageCount, current + 1))}>Next</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function formatExamOffering(exam) {
  const offering = exam.courseOffering;
  if (!offering) return "-";

  const course = offering.course;
  const courseLabel = course?.code && course?.name
    ? `${course.code} - ${course.name}`
    : course?.code || course?.name || "Course offering";
  const term = offering.term?.code || offering.term?.name;
  const section = offering.sectionCode ? `Section ${offering.sectionCode}` : "";

  return [courseLabel, term, section].filter(Boolean).join(" | ");
}
