import { Link, useNavigate, useParams } from "react-router-dom";
import { addQuestion, getExam } from "../../lib/examsApi";
import { canManageExams } from "../../lib/permissions";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import AppShell from "../../components/AppShell";
import Editor from "@monaco-editor/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const technicalTypes = new Set(["CSharp", "SQL"]);

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

export default function QuestionCreatePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { examId } = useParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exam, setExam] = useState(null);
  const [form, setForm] = useState({
    text: "",
    type: "MCQ",
    points: 10,
    options: ["", ""],
    correctAnswer: "",
    starterCode: starterTemplates.CSharp,
    sqlSchema: "",
    expectedAnswer: "",
  });
  const [loadingExam, setLoadingExam] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canEdit = useMemo(() => canManageExams(user?.role), [user?.role]);
  const isTechnicalQuestion = technicalTypes.has(form.type);
  const editorLanguage = form.type === "SQL" ? "sql" : "csharp";

  useEffect(() => {
    if (!examId) return;

    (async () => {
      try {
        setLoadingExam(true);
        const data = await getExam(examId);
        setExam(data);
      } catch {
        setError(t("questionCreate.loadExamError"));
      } finally {
        setLoadingExam(false);
      }
    })();
  }, [examId, t]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!examId || !canEdit || !form.text.trim()) return;
    const validationError = validateQuestionForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      await addQuestion(examId, {
        text: buildQuestionText(form),
        type: form.type,
        points: Number(form.points) || 0,
        options: form.type === "MCQ" ? normalizeOptions(form.options) : [],
        correctAnswer: form.type === "MCQ" ? normalizeOptionalValue(form.correctAnswer) : null,
      });
      nav(`/exams/${examId}`);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;

      setError(apiMessage || t("questionCreate.saveError"));
    } finally {
      setSaving(false);
    }
  }

  function onTypeChange(nextType) {
    setForm((current) => ({
      ...current,
      type: nextType,
      options: nextType === "MCQ" ? (current.options.length > 0 ? current.options : ["", ""]) : current.options,
      correctAnswer: nextType === "MCQ" ? current.correctAnswer : "",
      starterCode: starterTemplates[nextType] || current.starterCode,
      sqlSchema: nextType === "SQL" ? current.sqlSchema : "",
    }));
  }

  function updateOption(index, value) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
    }));
  }

  function addOptionField() {
    setForm((current) => ({
      ...current,
      options: [...current.options, ""],
    }));
  }

  function removeOptionField(index) {
    setForm((current) => {
      const nextOptions = current.options.filter((_, optionIndex) => optionIndex !== index);
      const nextCorrectAnswer =
        current.correctAnswer === current.options[index] ? "" : current.correctAnswer;

      return {
        ...current,
        options: nextOptions.length > 0 ? nextOptions : ["", ""],
        correctAnswer: nextCorrectAnswer,
      };
    });
  }

  if (userLoading) {
    return <div className="pageState">{t("questionCreate.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("questionCreate.userError")}</div>;
  }

  return (
    <AppShell
      user={user}
      badge={t("questionCreate.badge")}
      title={t("questionCreate.title")}
      subtitle={loadingExam ? t("questionCreate.subtitleLoading") : t("questionCreate.subtitle", { title: exam?.title || t("examDetails.titleFallback") })}
      actions={<Link className="btn" to={`/exams/${examId}`}>{t("questionCreate.backToExam")}</Link>}
    >
      <section className="formSurface">
        <div className="surfaceCard">
          <div className="sectionHeader">
            <h3>{t("questionCreate.content")}</h3>
          </div>
          <div className="sectionBody">
            {error ? <div className="alert">{error}</div> : null}
            <form className="stackLg" onSubmit={onSubmit}>
              <div className="field">
                <label className="label">
                  {isTechnicalQuestion ? "Question prompt" : t("questionCreate.prompt")}
                </label>
                <textarea
                  className="input textarea"
                  value={form.text}
                  onChange={(e) => setForm((current) => ({ ...current, text: e.target.value }))}
                  disabled={saving || loadingExam}
                  placeholder={t("questionCreate.promptPlaceholder")}
                  rows={6}
                />
              </div>

              <div className="field">
                <label className="label">{t("questionCreate.type")}</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => onTypeChange(e.target.value)}
                  disabled={saving || loadingExam}
                >
                  <option value="MCQ">MCQ</option>
                  <option value="Text">{t("common.text")}</option>
                  <option value="CSharp">C#</option>
                  <option value="SQL">SQL</option>
                </select>
              </div>

              {form.type === "MCQ" ? (
                <div className="technicalQuestionPanel">
                  <div className="technicalQuestionHeader">
                    <div>
                      <h4>MCQ options</h4>
                      <p>Add the answer choices and select which one is correct.</p>
                    </div>
                    <span className="statusPill statusDraft">MCQ</span>
                  </div>

                  <div className="stackLg compactStack">
                    {form.options.map((option, index) => (
                      <div className="row questionBankOptionRow" key={`option-${index}`}>
                        <input
                          className="input"
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          disabled={saving || loadingExam}
                          placeholder={`Option ${index + 1}`}
                        />
                        <button
                          className="btn"
                          type="button"
                          onClick={() => removeOptionField(index)}
                          disabled={saving || loadingExam || form.options.length <= 2}
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    <div className="row">
                      <button className="btn" type="button" onClick={addOptionField} disabled={saving || loadingExam}>
                        Add option
                      </button>
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Correct answer</label>
                    <select
                      className="input"
                      value={form.correctAnswer}
                      onChange={(e) => setForm((current) => ({ ...current, correctAnswer: e.target.value }))}
                      disabled={saving || loadingExam}
                    >
                      <option value="">Select the correct option</option>
                      {normalizeOptions(form.options).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              {isTechnicalQuestion ? (
                <div className="technicalQuestionPanel">
                  <div className="technicalQuestionHeader">
                    <div>
                      <h4>{form.type === "SQL" ? "SQL editor" : "C# editor"}</h4>
                      <p>
                        Use structured input for technical questions. The editor content is saved together with the prompt.
                      </p>
                    </div>
                    <span className="statusPill statusDraft">{form.type}</span>
                  </div>

                  {form.type === "SQL" ? (
                    <div className="field">
                      <label className="label">Database schema or table context</label>
                      <textarea
                        className="input textarea textareaCompact"
                        value={form.sqlSchema}
                        onChange={(e) => setForm((current) => ({ ...current, sqlSchema: e.target.value }))}
                        disabled={saving || loadingExam}
                        placeholder="Example: Students(Id, FullName, YearOfStudy), Exams(Id, Title, StartsAt)"
                        rows={4}
                      />
                    </div>
                  ) : null}

                  <div className="field">
                    <label className="label">
                      {form.type === "SQL" ? "Starter SQL" : "Starter C# code"}
                    </label>
                    <div className="monacoShell">
                      <Editor
                        height="280px"
                        language={editorLanguage}
                        theme="vs-dark"
                        value={form.starterCode}
                        onChange={(value) => setForm((current) => ({ ...current, starterCode: value || "" }))}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: "on",
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Expected answer or grading note</label>
                    <textarea
                      className="input textarea textareaCompact"
                      value={form.expectedAnswer}
                      onChange={(e) => setForm((current) => ({ ...current, expectedAnswer: e.target.value }))}
                      disabled={saving || loadingExam}
                      placeholder="Describe the expected output, query result, or grading criteria."
                      rows={4}
                    />
                  </div>
                </div>
              ) : null}

              <div className="field">
                <label className="label">{t("questionCreate.points")}</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.points}
                  onChange={(e) => setForm((current) => ({ ...current, points: Number(e.target.value) }))}
                  disabled={saving || loadingExam}
                />
              </div>

              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn btnPrimary" type="submit" disabled={saving || loadingExam || !canEdit || !form.text.trim()}>
                  {saving ? t("questionCreate.saving") : t("questionCreate.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function validateQuestionForm(form) {
  if (form.type === "MCQ") {
    const options = normalizeOptions(form.options);
    if (options.length < 2) {
      return "MCQ questions require at least two options.";
    }

    if (!normalizeOptionalValue(form.correctAnswer)) {
      return "Please select the correct answer for the MCQ question.";
    }

    return "";
  }

  if (!technicalTypes.has(form.type)) {
    return "";
  }

  if (!form.starterCode.trim()) {
    return "Starter code is required for C# and SQL questions.";
  }

  if (form.type === "SQL" && !form.sqlSchema.trim()) {
    return "Database schema or table context is required for SQL questions.";
  }

  return "";
}

function buildQuestionText(form) {
  if (!technicalTypes.has(form.type)) {
    return form.text.trim();
  }

  const sections = [
    `Prompt:\n${form.text.trim()}`,
  ];

  if (form.type === "SQL" && form.sqlSchema.trim()) {
    sections.push(`Schema:\n${form.sqlSchema.trim()}`);
  }

  if (form.starterCode.trim()) {
    sections.push(`${form.type === "SQL" ? "Starter SQL" : "Starter C# code"}:\n${form.starterCode.trim()}`);
  }

  if (form.expectedAnswer.trim()) {
    sections.push(`Expected answer / grading note:\n${form.expectedAnswer.trim()}`);
  }

  return sections.join("\n\n---\n\n");
}

function normalizeOptions(options) {
  return options
    .map((option) => option.trim())
    .filter(Boolean);
}

function normalizeOptionalValue(value) {
  return value?.trim() ? value.trim() : "";
}
