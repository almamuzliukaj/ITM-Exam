import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listMyOfferings } from "../../lib/academicApi";
import {
  createQuestionBankQuestion,
  deleteQuestionBankQuestion,
  listQuestionBankQuestions,
} from "../../lib/questionBankApi";

const questionTypes = [
  { value: "MCQ", label: "MCQ", help: "Single correct option" },
  { value: "Text", label: "Text answer", help: "Model answer required" },
  { value: "CSharp", label: "C#", help: "Prompt and starter code" },
  { value: "SQL", label: "SQL", help: "Schema and expected query result" },
];

const starterTemplates = {
  CSharp: `using System;

public class Solution
{
    public static void Main()
    {
        // Write your solution here
    }
}`,
  SQL: `SELECT
    *
FROM
    table_name;`,
};

const initialQuestionForm = {
  type: "MCQ",
  text: "",
  points: 10,
  topic: "",
  difficulty: "Medium",
  correctAnswer: "",
  correctAnswers: [],
  options: ["", "", "", ""],
  starterCode: starterTemplates.CSharp,
  sqlSchema: "",
  expectedAnswer: "",
};

export default function QuestionBankPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    search: "",
    topic: "",
  });
  const [questionPage, setQuestionPage] = useState(1);
  const [questionPageSize, setQuestionPageSize] = useState(10);
  const [authoringOpen, setAuthoringOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState(initialQuestionForm);
  const [formErrors, setFormErrors] = useState({});
  const [savingQuestion, setSavingQuestion] = useState(false);

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
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedOfferingId, t]);

  const selectedOffering = useMemo(
    () => offerings.find((offering) => offering.id === selectedOfferingId) || null,
    [offerings, selectedOfferingId],
  );

  const filteredQuestions = useMemo(() => {
    const topic = filters.topic.trim().toLowerCase();
    if (!topic) return questions;
    return questions.filter((question) => String(question.topic || "").toLowerCase().includes(topic));
  }, [filters.topic, questions]);

  const questionStats = useMemo(() => {
    const stats = {
      total: filteredQuestions.length,
      mcq: 0,
      text: 0,
      technical: 0,
      points: 0,
    };

    for (const question of filteredQuestions) {
      if (question.type === "MCQ") stats.mcq += 1;
      else if (question.type === "Text") stats.text += 1;
      else stats.technical += 1;
      stats.points += Number(question.points || 0);
    }

    return stats;
  }, [filteredQuestions]);

  const questionPageCount = Math.max(1, Math.ceil(filteredQuestions.length / questionPageSize));
  const visibleQuestions = useMemo(() => {
    const startIndex = (questionPage - 1) * questionPageSize;
    return filteredQuestions.slice(startIndex, startIndex + questionPageSize);
  }, [questionPage, questionPageSize, filteredQuestions]);
  const questionStart = filteredQuestions.length === 0 ? 0 : (questionPage - 1) * questionPageSize + 1;
  const questionEnd = Math.min(filteredQuestions.length, questionPage * questionPageSize);

  useEffect(() => {
    setQuestionPage(1);
  }, [filters.type, filters.search, filters.topic, selectedOfferingId, questionPageSize]);

  useEffect(() => {
    setQuestionPage((current) => Math.min(current, questionPageCount));
  }, [questionPageCount]);

  async function loadQuestions() {
    if (!selectedOfferingId) {
      setQuestions([]);
      return;
    }

    try {
      setQuestionsLoading(true);
      setError("");
      const apiFilters = {
        type: filters.type,
        search: filters.search,
      };
      const data = await listQuestionBankQuestions(selectedOfferingId, apiFilters);
      setQuestions(Array.isArray(data) ? data : []);
    } catch {
      setError(t("questionBank.loadQuestionsError"));
    } finally {
      setQuestionsLoading(false);
    }
  }

  function openAuthoringPanel(nextType = "MCQ") {
    setAuthoringOpen(true);
    setSuccess("");
    setError("");
    setFormErrors({});
    setQuestionForm({
      ...initialQuestionForm,
      type: nextType,
      starterCode: starterTemplates[nextType] || initialQuestionForm.starterCode,
    });
  }

  function onTypeChange(nextType) {
    setFormErrors({});
    setQuestionForm((current) => ({
      ...current,
      type: nextType,
      correctAnswer: nextType === "MCQ" || nextType === "Text" ? current.correctAnswer : "",
      starterCode: isTechnicalType(nextType) ? current.starterCode || starterTemplates[nextType] || "" : current.starterCode,
      sqlSchema: nextType === "SQL" ? current.sqlSchema : "",
      expectedAnswer: isTechnicalType(nextType) ? current.expectedAnswer : "",
    }));
  }

  function updateOption(index, value) {
    setQuestionForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
    }));
  }

  function addOption() {
    setQuestionForm((current) => ({ ...current, options: [...current.options, ""] }));
  }

  function removeOption(index) {
    setQuestionForm((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  }

  async function saveQuestion({ keepAuthoringOpen = true } = {}) {
    if (!selectedOfferingId) return;

    const nextErrors = validateQuestionForm(questionForm);
    setFormErrors(nextErrors);
    setSuccess("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setSavingQuestion(true);
      setError("");

      const normalizedOptions = questionForm.options.map((option) => option.trim()).filter(Boolean);
      const payload = {
        text: buildQuestionText(questionForm),
        type: questionForm.type,
        points: Number(questionForm.points) || 0,
        topic: questionForm.topic.trim(),
        difficulty: questionForm.difficulty,
        correctAnswer: isTechnicalType(questionForm.type)
          ? questionForm.expectedAnswer.trim()
          : questionForm.type === "MCQ"
            ? serializeCorrectAnswers(questionForm.correctAnswers)
            : questionForm.correctAnswer.trim(),
        options: questionForm.type === "MCQ" ? normalizedOptions : [],
      };

      await createQuestionBankQuestion(selectedOfferingId, payload);
      await loadQuestions();
      setSuccess("Question saved in the selected offering.");
      setFormErrors({});

      if (keepAuthoringOpen) {
        setQuestionForm((current) => ({
          ...initialQuestionForm,
          type: current.type,
          starterCode: starterTemplates[current.type] || initialQuestionForm.starterCode,
        }));
      } else {
        setAuthoringOpen(false);
        setQuestionForm(initialQuestionForm);
      }
    } catch (err) {
      setError(readApiMessage(err) || "Question could not be saved.");
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleDelete(questionId) {
    if (!window.confirm(t("questionBank.deleteConfirm"))) {
      return;
    }

    try {
      setError("");
      setSuccess("");
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
      title="Question bank"
      subtitle="Manage reusable assessment questions by course offering without leaving the academic context."
    >
      <div className="stackXl questionBankWorkspace">
        {error ? <div className="alert">{error}</div> : null}
        {success ? <div className="successBanner">{success}</div> : null}

        <section className="surfaceCard listControlPanel">
          <div className="sectionHeader">
            <div>
              <h3>Question bank workspace</h3>
              <span className="sectionMeta">
                Select an offering, filter the bank, and add questions in place.
              </span>
            </div>
            <div className="resourceActionGroup">
              <Link
                className="btn"
                to={`/question-bank/ai-materials${selectedOfferingId ? `?offeringId=${selectedOfferingId}` : ""}`}
              >
                Generate from material
              </Link>
              <Link
                className="btn"
                to={`/question-bank/generated-review${selectedOfferingId ? `?offeringId=${selectedOfferingId}` : ""}`}
              >
                Review generated
              </Link>
              <button className="btn btnPrimary" type="button" onClick={() => openAuthoringPanel()} disabled={!selectedOfferingId}>
                Add question
              </button>
            </div>
          </div>
          <div className="sectionBody stackLg">
            <div className="filtersRow questionBankFilters">
              <div className="field questionBankFieldWide">
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

              <div className="field">
                <label className="label">{t("questionBank.type")}</label>
                <select
                  className="input"
                  value={filters.type}
                  onChange={(e) => setFilters((current) => ({ ...current, type: e.target.value }))}
                  disabled={!selectedOfferingId}
                >
                  <option value="">{t("questionBank.allTypes")}</option>
                  {questionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label">Topic</label>
                <input
                  className="input"
                  value={filters.topic}
                  onChange={(e) => setFilters((current) => ({ ...current, topic: e.target.value }))}
                  placeholder="Module, chapter, topic"
                  disabled={!selectedOfferingId}
                />
              </div>

              <div className="field">
                <label className="label">{t("questionBank.search")}</label>
                <input
                  className="input"
                  value={filters.search}
                  onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
                  placeholder={t("questionBank.searchPlaceholder")}
                  disabled={!selectedOfferingId}
                />
              </div>

              <div className="field">
                <label className="label">Rows</label>
                <select className="input" value={questionPageSize} onChange={(e) => setQuestionPageSize(Number(e.target.value))} disabled={!selectedOfferingId}>
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                </select>
              </div>
            </div>

            {selectedOffering ? (
              <div className="questionBankContextRow">
                <span>{formatOffering(selectedOffering)}</span>
                <span>Showing {questionStart}-{questionEnd} of {filteredQuestions.length}</span>
              </div>
            ) : null}
          </div>
        </section>

        {selectedOfferingId && authoringOpen ? (
          <QuestionAuthoringPanel
            form={questionForm}
            errors={formErrors}
            saving={savingQuestion}
            success={success}
            selectedOffering={selectedOffering}
            onClose={() => {
              setAuthoringOpen(false);
              setFormErrors({});
            }}
            onChange={(nextForm) => setQuestionForm(nextForm)}
            onTypeChange={onTypeChange}
            onUpdateOption={updateOption}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onSaveAnother={() => saveQuestion({ keepAuthoringOpen: true })}
            onSaveClose={() => saveQuestion({ keepAuthoringOpen: false })}
          />
        ) : null}

        <section className="questionBankSummaryGrid" aria-label="Question bank summary">
          <article className="summaryCard">
            <span className="summaryLabel">Questions</span>
            <strong>{questionStats.total}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">MCQ</span>
            <strong>{questionStats.mcq}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Text</span>
            <strong>{questionStats.text}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Code / SQL</span>
            <strong>{questionStats.technical}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Total points</span>
            <strong>{questionStats.points}</strong>
          </article>
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
        ) : filteredQuestions.length === 0 ? (
          <div className="emptyState">
            <p>{t("questionBank.emptyTitle")}</p>
            <p>{t("questionBank.emptyText")}</p>
            <button className="btn btnPrimary" type="button" onClick={() => openAuthoringPanel()}>
              Add first question
            </button>
          </div>
        ) : (
          <section className="stackLg">
            <div className="tableWrap questionBankTableWrap">
              <table className="dataTable questionBankTable">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Type</th>
                    <th>Topic</th>
                    <th>Level</th>
                    <th>Points</th>
                    <th>Answer readiness</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleQuestions.map((question) => (
                    <QuestionRow key={question.id} question={question} onDelete={handleDelete} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="paginationBar">
              <span>Showing {questionStart}-{questionEnd} of {filteredQuestions.length}</span>
              <div className="paginationActions">
                <button className="btn" type="button" disabled={questionPage <= 1} onClick={() => setQuestionPage((current) => Math.max(1, current - 1))}>
                  Previous
                </button>
                <span className="paginationCurrent">Page {questionPage} of {questionPageCount}</span>
                <button className="btn" type="button" disabled={questionPage >= questionPageCount} onClick={() => setQuestionPage((current) => Math.min(questionPageCount, current + 1))}>
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function QuestionAuthoringPanel({
  form,
  errors,
  saving,
  success,
  selectedOffering,
  onClose,
  onChange,
  onTypeChange,
  onUpdateOption,
  onAddOption,
  onRemoveOption,
  onSaveAnother,
  onSaveClose,
}) {
  const isTechnicalQuestion = isTechnicalType(form.type);
  const errorCount = Object.keys(errors).length;
  const modelAnswerLabel = form.type === "Text" ? "Model answer" : "Expected answer / grading note";

  return (
    <section className="surfaceCard questionAuthoringPanel">
      <div className="sectionHeader">
        <div>
          <h3>Add question</h3>
          <span className="sectionMeta">
            {selectedOffering ? formatOffering(selectedOffering) : "Selected offering"} - stay in context and add multiple entries.
          </span>
        </div>
        <button className="btn" type="button" onClick={onClose} disabled={saving}>
          Close
        </button>
      </div>

      <div className="sectionBody stackLg">
        {errorCount > 0 ? (
          <div className="formErrorSummary">
            <strong>Complete the required fields before saving.</strong>
            <span>{errorCount} item{errorCount === 1 ? "" : "s"} need attention.</span>
          </div>
        ) : null}

        <div className="questionTypeSelector" aria-label="Question type">
          {questionTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              className={form.type === type.value ? "active" : ""}
              onClick={() => onTypeChange(type.value)}
              disabled={saving}
            >
              <strong>{type.label}</strong>
              <span>{type.help}</span>
            </button>
          ))}
        </div>

        <div className="formGrid formGridTwo">
          <div className="field fieldSpanFull">
            <label className="label">Question prompt <RequiredMark /></label>
            <textarea
              className={`input textarea textareaCompact${errors.text ? " inputInvalid" : ""}`}
              rows={4}
              value={form.text}
              onChange={(e) => onChange({ ...form, text: e.target.value })}
              placeholder="Write the exact question students will see."
              disabled={saving}
            />
            <FieldError message={errors.text} />
          </div>

          <div className="field">
            <label className="label">Points <RequiredMark /></label>
            <input
              className={`input${errors.points ? " inputInvalid" : ""}`}
              type="number"
              min="1"
              value={form.points}
              onChange={(e) => onChange({ ...form, points: e.target.value })}
              disabled={saving}
            />
            <FieldError message={errors.points} />
          </div>

          <div className="field">
            <label className="label">Topic / module</label>
            <input
              className="input"
              value={form.topic}
              onChange={(e) => onChange({ ...form, topic: e.target.value })}
              placeholder="Example: Normalization, arrays, joins"
              disabled={saving}
            />
          </div>

          <div className="field">
            <label className="label">Difficulty</label>
            <select
              className="input"
              value={form.difficulty}
              onChange={(e) => onChange({ ...form, difficulty: e.target.value })}
              disabled={saving}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {form.type === "MCQ" ? (
          <div className="authoringSubsection">
            <div className="sectionHeader sectionHeaderInline">
              <div>
                <h3>Answer options</h3>
                <span className="sectionMeta">At least two options and one correct answer are required.</span>
              </div>
              <button className="btn" type="button" onClick={onAddOption} disabled={saving}>
                Add option
              </button>
            </div>
            <div className="questionOptionGrid">
              {form.options.map((option, index) => (
                <div className="questionOptionInput" key={index}>
                  <input
                    className="input"
                    value={option}
                    onChange={(e) => onUpdateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    disabled={saving}
                  />
                  <button className="btn btnGhost" type="button" onClick={() => onRemoveOption(index)} disabled={saving || form.options.length <= 2}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <FieldError message={errors.options} />

            <div className="field">
              <label className="label">Correct answer(s) <RequiredMark /></label>
              <div className={`correctAnswerChecklist${errors.correctAnswer ? " inputInvalid" : ""}`}>
                {form.options
                  .map((option) => option.trim())
                  .filter(Boolean)
                  .map((option) => {
                    const selected = form.correctAnswers.includes(option);
                    return (
                      <label key={option}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            onChange({
                              ...form,
                              correctAnswers: selected
                                ? form.correctAnswers.filter((answer) => answer !== option)
                                : [...form.correctAnswers, option],
                            })
                          }
                          disabled={saving}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
              </div>
              <span className="small">Select one or more correct options.</span>
              <FieldError message={errors.correctAnswer} />
            </div>
          </div>
        ) : null}

        {form.type === "Text" ? (
          <div className="field">
            <label className="label">Model answer <RequiredMark /></label>
            <textarea
              className={`input textarea textareaCompact${errors.correctAnswer ? " inputInvalid" : ""}`}
              rows={4}
              value={form.correctAnswer}
              onChange={(e) => onChange({ ...form, correctAnswer: e.target.value })}
              placeholder="Write the reference answer AI and staff should use for evaluation."
              disabled={saving}
            />
            <FieldError message={errors.correctAnswer} />
          </div>
        ) : null}

        {isTechnicalQuestion ? (
          <div className="authoringSubsection">
            {form.type === "SQL" ? (
              <div className="field">
                <label className="label">Schema / table context</label>
                <textarea
                  className="input textarea textareaCompact"
                  rows={3}
                  value={form.sqlSchema}
                  onChange={(e) => onChange({ ...form, sqlSchema: e.target.value })}
                  placeholder="Example: Students(Id, FullName), Exams(Id, Title)"
                  disabled={saving}
                />
              </div>
            ) : null}

            <div className="field">
              <label className="label">{form.type === "SQL" ? "Starter SQL" : "Starter C# code"}</label>
              <textarea
                className="input textarea technicalAuthoringTextarea"
                rows={7}
                value={form.starterCode}
                onChange={(e) => onChange({ ...form, starterCode: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="field">
              <label className="label">{modelAnswerLabel} <RequiredMark /></label>
              <textarea
                className={`input textarea textareaCompact${errors.expectedAnswer ? " inputInvalid" : ""}`}
                rows={4}
                value={form.expectedAnswer}
                onChange={(e) => onChange({ ...form, expectedAnswer: e.target.value })}
                placeholder="Describe expected output, query result, or grading criteria."
                disabled={saving}
              />
              <FieldError message={errors.expectedAnswer} />
            </div>
          </div>
        ) : null}

        <div className="formActionsBar questionAuthoringActions">
          <button className="btn btnPrimary" type="button" onClick={onSaveAnother} disabled={saving}>
            {saving ? "Saving..." : "Save and add another"}
          </button>
          <button className="btn" type="button" onClick={onSaveClose} disabled={saving}>
            Save and close
          </button>
          <span className="small">Saved questions stay attached to the selected offering.</span>
        </div>
        {success ? <div className="successBanner">{success}</div> : null}
      </div>
    </section>
  );
}

function QuestionRow({ question, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const prompt = extractPrompt(question);
  const readiness = getAnswerReadiness(question);

  return (
    <>
      <tr>
        <td>
          <button className="tableDisclosure" type="button" onClick={() => setExpanded((current) => !current)}>
            <strong>{truncate(prompt, 120)}</strong>
            <span>{expanded ? "Hide details" : "View details"}</span>
          </button>
        </td>
        <td>
          <span className="statusPill statusDraft">{formatQuestionType(question.type)}</span>
        </td>
        <td>{question.topic || "-"}</td>
        <td>{question.difficulty || "-"}</td>
        <td>{question.points ?? 0}</td>
        <td>
          <span className={`statusPill ${readiness.ready ? "statusLive" : "statusWarn"}`}>
            {readiness.label}
          </span>
        </td>
        <td>
          <div className="resourceActionGroup">
            <Link className="btn" to={`/question-bank/questions/${question.id}/edit`}>
              Edit
            </Link>
            <button className="btn btnDanger" type="button" onClick={() => onDelete(question.id)}>
              Delete
            </button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="questionDetailRow">
          <td colSpan={7}>
            <QuestionDetails question={question} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function QuestionDetails({ question }) {
  const parsed = parseTechnicalQuestion(question.text, question.type);
  const correctAnswers = parseCorrectAnswers(question.correctAnswer);

  return (
    <div className="questionDetailPanel">
      <div>
        <span className="summaryLabel">Prompt</span>
        <p>{parsed.prompt || question.text || "-"}</p>
      </div>

      {question.type === "MCQ" && Array.isArray(question.options) ? (
        <div>
          <span className="summaryLabel">Options</span>
          <div className="questionOptionPreview">
            {question.options.map((option) => (
              <span key={option} className={correctAnswers.includes(option) ? "correct" : ""}>
                {option}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {parsed.schema ? (
        <div>
          <span className="summaryLabel">Schema</span>
          <pre className="technicalCodeBlock">{parsed.schema}</pre>
        </div>
      ) : null}

      {parsed.code ? (
        <div>
          <span className="summaryLabel">{question.type === "SQL" ? "Starter SQL" : "Starter C# code"}</span>
          <pre className="technicalCodeBlock">{parsed.code}</pre>
        </div>
      ) : null}

      {question.correctAnswer ? (
        <div>
          <span className="summaryLabel">{question.type === "MCQ" ? "Correct answer(s)" : "Model / expected answer"}</span>
          <p>{question.type === "MCQ" ? correctAnswers.join(", ") : question.correctAnswer}</p>
        </div>
      ) : null}
    </div>
  );
}

function RequiredMark() {
  return <span className="requiredMark">*</span>;
}

function FieldError({ message }) {
  if (!message) return null;
  return <span className="fieldError">{message}</span>;
}

function validateQuestionForm(form) {
  const errors = {};
  const options = form.options.map((option) => option.trim()).filter(Boolean);

  if (!form.text.trim()) errors.text = "Question prompt is required.";
  if (!Number(form.points) || Number(form.points) <= 0) errors.points = "Points must be greater than zero.";

  if (form.type === "MCQ") {
    if (options.length < 2) errors.options = "Add at least two answer options.";
    if (form.correctAnswers.length === 0) {
      errors.correctAnswer = "Select at least one correct answer.";
    } else if (form.correctAnswers.some((answer) => !options.includes(answer))) {
      errors.correctAnswer = "Every correct answer must match one of the options.";
    }
  }

  if (form.type === "Text" && !form.correctAnswer.trim()) {
    errors.correctAnswer = "A model answer is required for text evaluation.";
  }

  if (isTechnicalType(form.type) && !form.expectedAnswer.trim()) {
    errors.expectedAnswer = "Expected answer or grading criteria are required.";
  }

  return errors;
}

function formatOffering(offering) {
  const code = offering.course?.code || "";
  const name = offering.course?.name || "";
  const term = offering.term?.code || offering.term?.name || "";
  const section = offering.sectionCode || "-";
  return [code && name ? `${code} - ${name}` : code || name, term, `Section ${section}`].filter(Boolean).join(" | ");
}

function buildQuestionText(form) {
  if (!isTechnicalType(form.type)) {
    return form.text.trim();
  }

  const sections = [`Prompt:\n${form.text.trim()}`];

  if (form.type === "SQL" && form.sqlSchema.trim()) {
    sections.push(`Schema:\n${form.sqlSchema.trim()}`);
  }

  if (form.starterCode.trim()) {
    sections.push(`${form.type === "SQL" ? "Starter SQL" : "Starter C# code"}:\n${form.starterCode.trim()}`);
  }

  return sections.join("\n\n---\n\n");
}

function isTechnicalType(type) {
  return type === "CSharp" || type === "SQL";
}

function isTechnicalQuestion(question) {
  return isTechnicalType(question.type);
}

function formatQuestionType(type) {
  if (type === "CSharp") return "C#";
  return type || "-";
}

function extractPrompt(question) {
  if (!isTechnicalQuestion(question)) return question.text || "";
  return parseTechnicalQuestion(question.text, question.type).prompt || question.text || "";
}

function getAnswerReadiness(question) {
  if (question.type === "MCQ") {
    const options = Array.isArray(question.options) ? question.options.filter(Boolean) : [];
    const correctAnswers = parseCorrectAnswers(question.correctAnswer);
    return {
      ready: options.length >= 2 && correctAnswers.length > 0,
      label: options.length >= 2 && correctAnswers.length > 0 ? `${correctAnswers.length} correct` : "Needs answer",
    };
  }

  return {
    ready: Boolean(question.correctAnswer),
    label: question.correctAnswer ? "Model answer" : "Needs model",
  };
}

function parseTechnicalQuestion(text, type) {
  const result = {
    prompt: "",
    schema: "",
    code: "",
  };

  if (type !== "CSharp" && type !== "SQL") {
    result.prompt = text || "";
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
    result.prompt = text || "";
  }

  return result;
}

function truncate(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function parseCorrectAnswers(correctAnswer) {
  const value = String(correctAnswer || "").trim();
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    }
  } catch {
    // Older questions store a single answer as plain text.
  }

  return [value];
}

function serializeCorrectAnswers(correctAnswers) {
  const normalized = Array.from(new Set((correctAnswers || []).map((answer) => String(answer || "").trim()).filter(Boolean)));
  if (normalized.length <= 1) return normalized[0] || "";
  return JSON.stringify(normalized);
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
