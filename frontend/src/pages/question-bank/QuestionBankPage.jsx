import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listMyOfferings } from "../../lib/academicApi";
import { deleteQuestionBankQuestion, listQuestionBankQuestions } from "../../lib/questionBankApi";

export default function QuestionBankPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    difficulty: "",
    search: "",
  });

  const selectedOfferingId = searchParams.get("offeringId") || "";

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setOfferingsLoading(true);
        setError("");
        const data = await listMyOfferings();
        if (!active) return;
        const nextOfferings = Array.isArray(data) ? data : [];
        setOfferings(nextOfferings);

        if (!selectedOfferingId && nextOfferings[0]?.id) {
          setSearchParams({ offeringId: nextOfferings[0].id }, { replace: true });
        }
      } catch {
        if (active) setError(t("questionBank.loadOfferingsError"));
      } finally {
        if (active) setOfferingsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedOfferingId, setSearchParams, t]);

  useEffect(() => {
    if (!selectedOfferingId) {
      setQuestions([]);
      return;
    }

    let active = true;

    (async () => {
      try {
        setQuestionsLoading(true);
        setError("");
        const data = await listQuestionBankQuestions(selectedOfferingId, filters);
        if (active) setQuestions(Array.isArray(data) ? data : []);
      } catch {
        if (active) setError(t("questionBank.loadQuestionsError"));
      } finally {
        if (active) setQuestionsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [filters, selectedOfferingId, t]);

  const selectedOffering = useMemo(
    () => offerings.find((offering) => offering.id === selectedOfferingId) || null,
    [offerings, selectedOfferingId]
  );

  async function handleDelete(questionId) {
    if (!window.confirm(t("questionBank.deleteConfirm"))) {
      return;
    }

    try {
      setError("");
      await deleteQuestionBankQuestion(questionId);
      setQuestions((current) => current.filter((item) => item.id !== questionId));
    } catch {
      setError(t("questionBank.deleteError"));
    }
  }

  if (userLoading) {
    return <div className="pageState">{t("questionBank.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("questionBank.userError")}</div>;
  }

  return (
    <AppShell
      user={user}
      badge={t("questionBank.badge")}
      title={t("questionBank.title")}
      subtitle={t("questionBank.subtitle")}
      actions={
        selectedOfferingId ? (
          <Link className="btn btnPrimary" to={`/question-bank/new?offeringId=${selectedOfferingId}`}>
            {t("questionBank.create")}
          </Link>
        ) : null
      }
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}

        <section className="surfaceCard">
          <div className="sectionHeader">
            <h3>{t("questionBank.filters")}</h3>
          </div>
          <div className="sectionBody stackLg">
            <div className="filtersRow questionBankFilters">
              <div className="field questionBankField">
                <label className="label">{t("questionBank.offering")}</label>
                <select
                  className="input"
                  value={selectedOfferingId}
                  onChange={(e) => setSearchParams(e.target.value ? { offeringId: e.target.value } : {}, { replace: true })}
                  disabled={offeringsLoading}
                >
                  <option value="">{t("questionBank.selectOffering")}</option>
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {formatOffering(offering)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field questionBankField">
                <label className="label">{t("questionBank.type")}</label>
                <select
                  className="input"
                  value={filters.type}
                  onChange={(e) => setFilters((current) => ({ ...current, type: e.target.value }))}
                  disabled={!selectedOfferingId}
                >
                  <option value="">{t("questionBank.allTypes")}</option>
                  <option value="MCQ">MCQ</option>
                  <option value="Text">{t("common.text")}</option>
                </select>
              </div>

              <div className="field questionBankField">
                <label className="label">{t("questionBank.difficulty")}</label>
                <select
                  className="input"
                  value={filters.difficulty}
                  onChange={(e) => setFilters((current) => ({ ...current, difficulty: e.target.value }))}
                  disabled={!selectedOfferingId}
                >
                  <option value="">{t("questionBank.allDifficulties")}</option>
                  <option value="Easy">{t("questionBank.difficulties.easy")}</option>
                  <option value="Medium">{t("questionBank.difficulties.medium")}</option>
                  <option value="Hard">{t("questionBank.difficulties.hard")}</option>
                </select>
              </div>

              <div className="field questionBankField">
                <label className="label">{t("questionBank.search")}</label>
                <input
                  className="input"
                  value={filters.search}
                  onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
                  placeholder={t("questionBank.searchPlaceholder")}
                  disabled={!selectedOfferingId}
                />
              </div>
            </div>

            {selectedOffering ? (
              <div className="small questionBankContext">{t("questionBank.selectedOffering", { offering: formatOffering(selectedOffering) })}</div>
            ) : null}
          </div>
        </section>

        {offeringsLoading ? (
          <div className="pageStateCard">{t("questionBank.loadingOfferings")}</div>
        ) : !selectedOfferingId ? (
          <div className="emptyState">
            <p>{t("questionBank.emptyOfferingTitle")}</p>
            <p>{t("questionBank.emptyOfferingText")}</p>
          </div>
        ) : questionsLoading ? (
          <div className="pageStateCard">{t("questionBank.loadingQuestions")}</div>
        ) : questions.length === 0 ? (
          <div className="emptyState">
            <p>{t("questionBank.emptyTitle")}</p>
            <p>{t("questionBank.emptyText")}</p>
          </div>
        ) : (
          <section className="questionBankGrid">
            {questions.map((question) => (
              <article key={question.id} className="resourceCard questionBankCard">
                <div className="resourceMetaRow">
                  <span className={`statusPill ${question.type === "MCQ" ? "statusLive" : "statusDraft"}`}>{question.type}</span>
                  <span className="small">{t("questionBank.pointsValue", { count: question.points })}</span>
                </div>
                <h3>{question.text}</h3>
                <p>{question.difficulty || t("questionBank.noDifficulty")}</p>

                {question.type === "MCQ" ? (
                  <div className="bulletStack compactStack">
                    {question.options?.map((option) => (
                      <div key={option} className="listRow">
                        <span className="listDot" />
                        <span>{option}{question.correctAnswer === option ? ` ${t("questionBank.correctTag")}` : ""}</span>
                      </div>
                    ))}
                  </div>
                ) : question.correctAnswer ? (
                  <div className="questionBankModelAnswer">
                    <strong>{t("questionBank.modelAnswer")}:</strong> {question.correctAnswer}
                  </div>
                ) : null}

                <div className="resourceFooter">
                  <div className="small">{t("questionBank.cardHint")}</div>
                  <div className="row questionBankActions">
                    <Link className="btn" to={`/question-bank/questions/${question.id}/edit`}>
                      {t("questionBank.edit")}
                    </Link>
                    <button className="btn btnGhost" type="button" onClick={() => handleDelete(question.id)}>
                      {t("questionBank.delete")}
                    </button>
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

function formatOffering(offering) {
  const code = offering.course?.code || "";
  const name = offering.course?.name || "";
  const term = offering.term?.code || offering.term?.name || "";
  const section = offering.sectionCode || "-";
  return [code && name ? `${code} - ${name}` : code || name, term, `Section ${section}`].filter(Boolean).join(" | ");
}
