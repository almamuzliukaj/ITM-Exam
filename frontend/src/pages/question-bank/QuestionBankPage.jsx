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
                  <option value="CSharp">C#</option>
                  <option value="SQL">SQL</option>
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
                  <span className={`statusPill ${question.type === "MCQ" ? "statusLive" : "statusDraft"}`}>{formatQuestionType(question.type)}</span>
                  <span className="small">{t("questionBank.pointsValue", { count: question.points })}</span>
                </div>
                <h3>{extractPrompt(question)}</h3>

                {question.type === "MCQ" ? (
                  <div className="bulletStack compactStack">
                    {question.options?.map((option) => (
                      <div key={option} className="listRow">
                        <span className="listDot" />
                        <span>{option}{question.correctAnswer === option ? ` ${t("questionBank.correctTag")}` : ""}</span>
                      </div>
                    ))}
                  </div>
                ) : isTechnicalQuestion(question) ? (
                  <TechnicalQuestionPreview question={question} />
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

function TechnicalQuestionPreview({ question }) {
  const parsed = parseTechnicalQuestion(question.text, question.type);

  return (
    <div className="stackLg">
      {parsed.schema ? (
        <div className="questionBankModelAnswer">
          <strong>Schema:</strong> {parsed.schema}
        </div>
      ) : null}

      {parsed.code ? (
        <div className="questionBankModelAnswer">
          <strong>{question.type === "SQL" ? "Starter SQL" : "Starter C# code"}:</strong>
          <pre className="technicalCodeBlock">{parsed.code}</pre>
        </div>
      ) : null}

      {question.correctAnswer ? (
        <div className="questionBankModelAnswer">
          <strong>Expected answer / grading note:</strong> {question.correctAnswer}
        </div>
      ) : null}
    </div>
  );
}

function isTechnicalQuestion(question) {
  return question.type === "CSharp" || question.type === "SQL";
}

function formatQuestionType(type) {
  if (type === "CSharp") return "C#";
  return type;
}

function extractPrompt(question) {
  if (!isTechnicalQuestion(question)) return question.text;
  return parseTechnicalQuestion(question.text, question.type).prompt || question.text;
}

function parseTechnicalQuestion(text, type) {
  const result = {
    prompt: "",
    schema: "",
    code: "",
  };

  if (type !== "CSharp" && type !== "SQL") {
    result.prompt = text;
    return result;
  }

  const sections = String(text || "").split("\n\n---\n\n");
  for (const section of sections) {
    if (section.startsWith("Prompt:\n")) {
      result.prompt = section.replace("Prompt:\n", "").trim();
    } else if (section.startsWith("Schema:\n")) {
      result.schema = section.replace("Schema:\n", "").trim();
    } else if (section.startsWith("Starter SQL:\n")) {
      result.code = section.replace("Starter SQL:\n", "").trim();
    } else if (section.startsWith("Starter C# code:\n")) {
      result.code = section.replace("Starter C# code:\n", "").trim();
    }
  }

  if (!result.prompt) {
    result.prompt = text;
  }

  return result;
}
