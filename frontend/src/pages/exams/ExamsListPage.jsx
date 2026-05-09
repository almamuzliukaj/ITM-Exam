import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listExams } from "../../lib/examsApi";
import { canCreateExams } from "../../lib/permissions";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ExamsListPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
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

 feat/sprint-11-monaco-editor
  const canCreate = canManageExams(user.role);
  const isStudent = user.role === "Student";

  async function onPublish(examId) {
    try {
      setPublishingId(examId);
      setError("");
      await publishExam(examId);
      setExams((current) =>
        current.map((exam) =>
          exam.id === examId
            ? { ...exam, isPublished: true, status: "Published" }
            : exam
        )
      );
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to publish exam.");
    } finally {
      setPublishingId("");
    }
  }

  const canCreate = canCreateExams(user.role);
 main

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
                    <Link className={isStudent ? "btn btnPrimary" : "btn"} to={isStudent ? `/exams/${exam.id}/session` : `/exams/${exam.id}`}>
                      {isStudent ? "Start" : t("examsList.open")}
                    </Link>
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
