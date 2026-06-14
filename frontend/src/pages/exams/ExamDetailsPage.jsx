import { Link, useParams } from "react-router-dom";
import { generateRandomQuestions, getExam, listQuestions, publishExam, replaceExamQuestion } from "../../lib/examsApi";
import { listMyOfferings } from "../../lib/academicApi";
import { canManageExams } from "../../lib/permissions";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import AppShell from "../../components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ExamDetailsPage() {
  const { t } = useTranslation();
  const { examId } = useParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [replacingId, setReplacingId] = useState("");
  const [error, setError] = useState("");
  const [generator, setGenerator] = useState({
    numberOfQuestions: 3,
    type: "",
  });
  const canEdit = canManageExams(user?.role);
  const isStudent = user?.role === "Student";

  const canGenerate = useMemo(
    () => isPositiveNumber(generator.numberOfQuestions) && Boolean(exam?.courseOfferingId),
    [exam?.courseOfferingId, generator.numberOfQuestions],
  );

  useEffect(() => {
    if (!examId) return;

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const [examData, questionData] = await Promise.all([getExam(examId), listQuestions(examId)]);
        if (!active) return;
        setExam(examData);
        setSelectedOfferingId(examData?.courseOfferingId || "");
        setQuestions(Array.isArray(questionData) ? questionData : []);
      } catch {
        if (active) setError(t("examDetails.error"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [examId, t]);

  useEffect(() => {
    if (!canEdit) return;

    let active = true;

    async function loadOfferings() {
      try {
        const data = await listMyOfferings();
        if (active) setOfferings(Array.isArray(data) ? data : []);
      } catch {
        if (active) setOfferings([]);
      }
    }

    loadOfferings();

    return () => {
      active = false;
    };
  }, [canEdit]);

  if (userLoading) {
    return <div className="pageState">{t("examDetails.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("examDetails.userError")}</div>;
  }

  const isDraft = canEdit && exam && !exam.isPublished;
  const canPublishDraft = isDraft && questions.length > 0 && Boolean(exam?.courseOfferingId || selectedOfferingId);

  async function onPublish() {
    if (!examId || !isDraft) return;

    try {
      setPublishing(true);
      setError("");
      await publishExam(examId, selectedOfferingId ? { courseOfferingId: selectedOfferingId } : {});
      const updated = await getExam(examId);
      setExam(updated);
      setSelectedOfferingId(updated?.courseOfferingId || "");
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to publish exam.");
    } finally {
      setPublishing(false);
    }
  }

  async function onGenerateRandomQuestions() {
    if (!examId || !canGenerate) return;

    try {
      setGenerating(true);
      setError("");
      const created = await generateRandomQuestions(examId, {
        numberOfQuestions: Number(generator.numberOfQuestions),
        type: generator.type || null,
      });
      const newQuestions = Array.isArray(created) ? created : [];
      setQuestions((current) => [...current, ...newQuestions]);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to generate random questions.");
    } finally {
      setGenerating(false);
    }
  }

  async function onReplaceQuestion(question) {
    if (!examId || !question?.id) return;

    try {
      setReplacingId(question.id);
      setError("");
      const replacement = await replaceExamQuestion(examId, question.id, {
        type: question.type || null,
      });
      setQuestions((current) =>
        current.map((item) => (item.id === question.id ? replacement : item)),
      );
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to replace question.");
    } finally {
      setReplacingId("");
    }
  }

  function onStartAttempt() {
    if (!examId) return;
    window.location.href = `/exams/${examId}/attempt`;
  }

  return (
    <AppShell
      user={user}
      badge={t("examDetails.badge")}
      title={exam?.title || t("examDetails.titleFallback")}
      subtitle={exam?.description || t("examDetails.subtitleFallback")}
      actions={
        <>
          <Link className="btn" to="/exams">{t("examDetails.backToExams")}</Link>
          {canEdit && examId ? <Link className="btn" to={`/exams/${examId}/gradebook`}>Gradebook</Link> : null}
          {isDraft ? (
            <button className="btn btnPrimary" type="button" onClick={onPublish} disabled={publishing || !canPublishDraft}>
              {publishing ? "Publishing..." : "Publish exam"}
            </button>
          ) : null}
          {isStudent && examId ? (
            <button className="btn btnPrimary" type="button" onClick={onStartAttempt}>
              Start attempt
            </button>
          ) : null}
          {canEdit && examId ? <Link className="btn btnPrimary" to={`/exams/${examId}/questions/new`}>{t("examDetails.addQuestion")}</Link> : null}
        </>
      }
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}

        {loading ? (
          <div className="pageStateCard">{t("examDetails.loadingStructure")}</div>
        ) : (
          <>
            <section className="summaryStrip">
              <article className="summaryCard">
                <span className="summaryLabel">{t("examDetails.status")}</span>
                <strong>{exam?.isPublished ? t("examsList.published") : t("examsList.draft")}</strong>
              </article>
              <article className="summaryCard">
                <span className="summaryLabel">{t("examDetails.duration")}</span>
                <strong>{exam?.durationMinutes || 60} min</strong>
              </article>
              <article className="summaryCard">
                <span className="summaryLabel">{t("examDetails.questions")}</span>
                <strong>{questions.length}</strong>
              </article>
            </section>

            {isDraft && !exam?.courseOfferingId ? (
              <section className="surfaceCard">
                <div className="sectionHeader">
                  <h3>Publish setup</h3>
                  <span className="small">Link this draft to a course offering before publishing.</span>
                </div>
                <div className="sectionBody">
                  <div className="field">
                    <label className="label">Course offering</label>
                    <select
                      className="input"
                      value={selectedOfferingId}
                      onChange={(e) => setSelectedOfferingId(e.target.value)}
                      disabled={publishing}
                    >
                      <option value="">Select course offering</option>
                      {offerings.map((offering) => (
                        <option key={offering.id} value={offering.id}>
                          {formatOfferingLabel(offering)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            ) : null}

            {isDraft && exam?.courseOfferingId ? (
              <section className="surfaceCard">
                <div className="sectionHeader">
                  <h3>{t("examDetails.generator.title")}</h3>
                  <span className="small">{t("examDetails.generator.subtitle")}</span>
                </div>
                <div className="sectionBody stackLg">
                  <div className="questionBankFormGrid">
                    <div className="field">
                      <label className="label">{t("examDetails.generator.count")}</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={generator.numberOfQuestions}
                        onChange={(e) => setGenerator((current) => ({ ...current, numberOfQuestions: Number(e.target.value) }))}
                        disabled={generating}
                      />
                    </div>
                    <div className="field">
                      <label className="label">{t("questionBank.type")}</label>
                      <select
                        className="input"
                        value={generator.type}
                        onChange={(e) => setGenerator((current) => ({ ...current, type: e.target.value }))}
                        disabled={generating}
                      >
                        <option value="">{t("questionBank.allTypes")}</option>
                        <option value="MCQ">MCQ</option>
                        <option value="Text">{t("common.text")}</option>
                      </select>
                    </div>
                  </div>

                  <div className="row examFormActions" style={{ justifyContent: "flex-end" }}>
                    <button
                      className="btn btnPrimary"
                      type="button"
                      onClick={onGenerateRandomQuestions}
                      disabled={!canGenerate || generating}
                    >
                      {generating ? t("examDetails.generator.generating") : t("examDetails.generator.generate")}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {isDraft && questions.length === 0 ? (
              <div className="publishNotice">
                <strong>Question required before publishing</strong>
                <span>Add at least one question to complete the manual exam builder workflow.</span>
              </div>
            ) : null}

            <section className="surfaceCard">
              <div className="sectionHeader">
                <h3>{t("examDetails.coverage")}</h3>
                <span className="small">{t("examDetails.progress")}</span>
              </div>
              <div className="sectionBody">
                {questions.length === 0 ? (
                  <div className="emptyState">
                    <p>{t("examDetails.noQuestionsTitle")}</p>
                    <p>{t("examDetails.noQuestionsText")}</p>
                  </div>
                ) : (
                  <div className="questionList">
                    {questions.map((question, index) => (
                      <QuestionPreview
                        key={question.id}
                        question={question}
                        index={index}
                        t={t}
                        isDraft={isDraft}
                        replacing={replacingId === question.id}
                        onReplace={onReplaceQuestion}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function QuestionPreview({ question, index, t, isDraft, replacing, onReplace }) {
  const parsed = parseTechnicalQuestion(question);

  return (
    <article className="questionCard">
      <div className="questionIndex">{String(index + 1).padStart(2, "0")}</div>
      <div className="questionBody">
        <strong>{parsed.prompt || question.text || "(no text)"}</strong>
        <div className="questionMeta">
          <span>{question.type ? `${t("examDetails.type")}: ${formatQuestionType(question.type)}` : `${t("examDetails.type")}: -`}</span>
          <span>{typeof question.points === "number" ? `${t("examDetails.points")}: ${question.points}` : `${t("examDetails.points")}: -`}</span>
        </div>

        {parsed.isTechnical ? (
          <div className="technicalQuestionPreview">
            {parsed.schema ? (
              <div>
                <span className="summaryLabel">Schema / context</span>
                <pre>{parsed.schema}</pre>
              </div>
            ) : null}
            {parsed.code ? (
              <div>
                <span className="summaryLabel">{question.type === "SQL" ? "Starter SQL" : "Starter C# code"}</span>
                <pre>{parsed.code}</pre>
              </div>
            ) : null}
            {parsed.expected ? (
              <div>
                <span className="summaryLabel">Expected answer / grading note</span>
                <pre>{parsed.expected}</pre>
              </div>
            ) : null}
          </div>
        ) : null}

        {isDraft ? (
          <div className="resourceActionGroup" style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => onReplace(question)} disabled={replacing}>
              {replacing ? t("examDetails.generator.replacing") : t("examDetails.generator.replace")}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function formatQuestionType(type) {
  if (type === "CSharp") return "C#";
  return type;
}

function parseTechnicalQuestion(question) {
  const isTechnical = question.type === "CSharp" || question.type === "SQL";
  if (!isTechnical) {
    return {
      isTechnical: false,
      prompt: question.text || "",
      schema: "",
      code: "",
      expected: "",
    };
  }

  const sections = String(question.text || "")
    .split(/\n---\n/g)
    .map((section) => section.trim())
    .filter(Boolean);

  const result = {
    isTechnical: true,
    prompt: "",
    schema: "",
    code: "",
    expected: "",
  };

  for (const section of sections) {
    if (section.startsWith("Prompt:\n")) {
      result.prompt = section.replace("Prompt:\n", "").trim();
    } else if (section.startsWith("Schema:\n")) {
      result.schema = section.replace("Schema:\n", "").trim();
    } else if (section.startsWith("Starter SQL:\n")) {
      result.code = section.replace("Starter SQL:\n", "").trim();
    } else if (section.startsWith("Starter C# code:\n")) {
      result.code = section.replace("Starter C# code:\n", "").trim();
    } else if (section.startsWith("Expected answer / grading note:\n")) {
      result.expected = section.replace("Expected answer / grading note:\n", "").trim();
    }
  }

  return result;
}

function formatOfferingLabel(offering) {
  const code = offering.course?.code || "Course";
  const name = offering.course?.name || "";
  const term = offering.term?.name || "Term";
  const year = offering.yearOfStudy ? `Year ${offering.yearOfStudy}` : "Year -";
  const semester = offering.semesterNo ? `Semester ${offering.semesterNo}` : "Semester -";
  const section = offering.sectionCode ? `Section ${offering.sectionCode}` : "Section -";

  return `${code}${name ? ` - ${name}` : ""} / ${term} / ${year}, ${semester}, ${section}`;
}

function isPositiveNumber(value) {
  return Number(value) > 0;
}
