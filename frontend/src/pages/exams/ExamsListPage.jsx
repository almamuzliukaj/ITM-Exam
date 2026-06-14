import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { deleteExam, listExams } from "../../lib/examsApi";
import { canCreateExams } from "../../lib/permissions";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ExamsListPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

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

  if (userLoading) {
    return <div className="pageState">{t("examsList.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("examsList.userError")}</div>;
  }

  const canCreate = canCreateExams(user.role);
  const isStudent = user.role === "Student";

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

        {loading ? (
          <div className="pageStateCard">{t("examsList.loadingRecords")}</div>
        ) : exams.length === 0 ? (
          <div className="emptyState">
            <p>{t("examsList.emptyTitle")}</p>
            <p>{t("examsList.emptyText")}</p>
          </div>
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
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
