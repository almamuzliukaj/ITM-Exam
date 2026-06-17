import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listMyOfferings } from "../../lib/academicApi";
import {
  createQuestionBankQuestion,
  getQuestionBankQuestion,
  updateQuestionBankQuestion,
} from "../../lib/questionBankApi";

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

const EMPTY_FORM = {
  offeringId: "",
  text: "",
  type: "MCQ",
  points: 10,
  topic: "",
  difficulty: "Medium",
  correctAnswer: "",
  correctAnswers: [],
  options: ["", ""],
  starterCode: starterTemplates.CSharp,
  sqlSchema: "",
  expectedAnswer: "",
};

export default function QuestionBankEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { questionId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [offerings, setOfferings] = useState([]);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    offeringId: searchParams.get("offeringId") || "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(questionId);
  const isTechnicalQuestion = technicalTypes.has(form.type);
  const editorLanguage = form.type === "SQL" ? "sql" : "csharp";

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const offeringData = await listMyOfferings();
        if (!active) return;

        const nextOfferings = Array.isArray(offeringData) ? offeringData : [];
        setOfferings(nextOfferings);

        if (isEdit && questionId) {
          const question = await getQuestionBankQuestion(questionId);
          if (!active) return;

          setForm({
            offeringId: question.courseOfferingId,
            text: extractPrompt(question.text || ""),
            type: question.type || "MCQ",
            points: Number(question.points) || 10,
            topic: question.topic || "",
            difficulty: question.difficulty || "Medium",
            correctAnswer: !technicalTypes.has(question.type) ? (question.correctAnswer || "") : "",
            correctAnswers: question.type === "MCQ" ? parseCorrectAnswers(question.correctAnswer) : [],
            options: Array.isArray(question.options) && question.options.length > 0 ? question.options : ["", ""],
            starterCode: extractStarterCode(question.text || "", question.type || "MCQ"),
            sqlSchema: extractSqlSchema(question.text || ""),
            expectedAnswer: technicalTypes.has(question.type) ? (question.correctAnswer || "") : "",
          });
        } else if (!searchParams.get("offeringId") && nextOfferings[0]?.id) {
          setForm((current) => ({ ...current, offeringId: current.offeringId || nextOfferings[0].id }));
        }
      } catch {
        if (active) setError(isEdit ? t("questionBank.editor.loadQuestionError") : t("questionBank.editor.loadContextError"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isEdit, questionId, searchParams, t]);

  const selectedOffering = useMemo(
    () => offerings.find((offering) => offering.id === form.offeringId) || null,
    [form.offeringId, offerings]
  );

  function updateOption(index, value) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
    }));
  }

  function addOption() {
    setForm((current) => ({ ...current, options: [...current.options, ""] }));
  }

  function removeOption(index) {
    setForm((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  }

  function onTypeChange(nextType) {
    setForm((current) => ({
      ...current,
      type: nextType,
      correctAnswer: technicalTypes.has(nextType) ? "" : current.correctAnswer,
      correctAnswers: nextType === "MCQ" ? current.correctAnswers : [],
      starterCode: technicalTypes.has(nextType) ? (current.starterCode || starterTemplates[nextType] || "") : current.starterCode,
      sqlSchema: nextType === "SQL" ? current.sqlSchema : "",
      expectedAnswer: technicalTypes.has(nextType) ? current.expectedAnswer : "",
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.offeringId) return;

    try {
      setSaving(true);
      setError("");

      const payload = {
        text: buildQuestionText(form),
        type: form.type,
        points: Number(form.points) || 0,
        topic: form.topic.trim(),
        difficulty: form.difficulty,
        correctAnswer: technicalTypes.has(form.type)
          ? form.expectedAnswer.trim()
          : form.type === "MCQ"
            ? serializeCorrectAnswers(form.correctAnswers)
            : form.correctAnswer.trim(),
        options: form.type === "MCQ" ? form.options : [],
      };

      if (isEdit && questionId) {
        await updateQuestionBankQuestion(questionId, payload);
      } else {
        await createQuestionBankQuestion(form.offeringId, payload);
      }

      navigate(`/question-bank?offeringId=${form.offeringId}`);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;

      setError(apiMessage || t("questionBank.editor.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (userLoading || loading) {
    return <div className="pageState">{t("questionBank.editor.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("questionBank.userError")}</div>;
  }

  return (
    <AppShell
      user={user}
      badge={t("questionBank.badge")}
      title={isEdit ? t("questionBank.editor.editTitle") : t("questionBank.editor.createTitle")}
      subtitle={selectedOffering ? t("questionBank.editor.subtitle", { offering: formatOffering(selectedOffering) }) : t("questionBank.editor.subtitleEmpty")}
      actions={<Link className="btn" to={form.offeringId ? `/question-bank?offeringId=${form.offeringId}` : "/question-bank"}>{t("questionBank.editor.back")}</Link>}
    >
      <section className="formSurface">
        <div className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>{t("questionBank.editor.sectionTitle")}</h3>
              <span className="sectionMeta">Reusable question entries use the same authoring structure as exam questions.</span>
            </div>
            <span className="statusPill statusDraft">{isEdit ? "Editing" : "New entry"}</span>
          </div>
          <div className="sectionBody">
            {error ? <div className="alert">{error}</div> : null}

            <form className="formLayout" onSubmit={onSubmit}>
              <div className="formSection">
                <div className="formSectionHeader">
                  <div>
                    <h4>Question bank basics</h4>
                    <p>Assign the entry to one offering and keep scoring aligned with exam usage.</p>
                  </div>
                </div>

                <div className="formGrid formGridTwo">
                  <div className="field fieldSpanFull">
                    <label className="label">{t("questionBank.offering")}</label>
                    <select
                      className="input"
                      value={form.offeringId}
                      onChange={(e) => setForm((current) => ({ ...current, offeringId: e.target.value }))}
                      disabled={saving || isEdit}
                    >
                      <option value="">{t("questionBank.selectOffering")}</option>
                      {offerings.map((offering) => (
                        <option key={offering.id} value={offering.id}>
                          {formatOffering(offering)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field fieldSpanFull">
                    <label className="label">{t("questionBank.editor.prompt")}</label>
                    <textarea
                      className="input textarea"
                      value={form.text}
                      onChange={(e) => setForm((current) => ({ ...current, text: e.target.value }))}
                      rows={6}
                      disabled={saving}
                      placeholder={t("questionBank.editor.promptPlaceholder")}
                    />
                  </div>

                  <div className="field">
                    <label className="label">{t("questionBank.type")}</label>
                    <select
                      className="input"
                      value={form.type}
                      onChange={(e) => onTypeChange(e.target.value)}
                      disabled={saving}
                    >
                      <option value="MCQ">MCQ</option>
                      <option value="Text">{t("common.text")}</option>
                      <option value="CSharp">C#</option>
                      <option value="SQL">SQL</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="label">{t("questionBank.editor.points")}</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      value={form.points}
                      onChange={(e) => setForm((current) => ({ ...current, points: Number(e.target.value) }))}
                      disabled={saving}
                    />
                  </div>

                  <div className="field">
                    <label className="label">Topic / module</label>
                    <input
                      className="input"
                      value={form.topic}
                      onChange={(e) => setForm((current) => ({ ...current, topic: e.target.value }))}
                      disabled={saving}
                      placeholder="Example: Normalization, joins, arrays"
                    />
                  </div>

                  <div className="field">
                    <label className="label">Difficulty</label>
                    <select
                      className="input"
                      value={form.difficulty}
                      onChange={(e) => setForm((current) => ({ ...current, difficulty: e.target.value }))}
                      disabled={saving}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>

              {isTechnicalQuestion ? (
                <div className="technicalQuestionPanel">
                  <div className="technicalQuestionHeader">
                    <div>
                      <h4>{form.type === "SQL" ? "SQL editor" : "C# editor"}</h4>
                      <p>
                        Use structured input for technical question bank entries so they can be reused consistently in generated or manual exams.
                      </p>
                    </div>
                    <span className="statusPill statusDraft">{form.type === "CSharp" ? "C#" : form.type}</span>
                  </div>

                  {form.type === "SQL" ? (
                    <div className="field">
                      <label className="label">Database schema or table context</label>
                      <textarea
                        className="input textarea textareaCompact"
                        value={form.sqlSchema}
                        onChange={(e) => setForm((current) => ({ ...current, sqlSchema: e.target.value }))}
                        disabled={saving}
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
                      disabled={saving}
                      placeholder="Describe the expected output, query result, or grading criteria."
                      rows={4}
                    />
                  </div>
                </div>
              ) : null}

              {form.type === "MCQ" ? (
                <div className="stackLg">
                  <div className="sectionHeader sectionHeaderInline">
                    <div>
                      <h3>{t("questionBank.editor.options")}</h3>
                      <span className="sectionMeta">Add options first, then select one or more correct answers.</span>
                    </div>
                    <button className="btn" type="button" onClick={addOption} disabled={saving}>
                      {t("questionBank.editor.addOption")}
                    </button>
                  </div>

                  <div className="stackLg">
                    {form.options.map((option, index) => (
                      <div className="row questionBankOptionRow" key={index}>
                        <input
                          className="input"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          disabled={saving}
                          placeholder={t("questionBank.editor.optionPlaceholder", { index: index + 1 })}
                        />
                        <button
                          className="btn btnGhost"
                          type="button"
                          onClick={() => removeOption(index)}
                          disabled={saving || form.options.length <= 2}
                        >
                          {t("questionBank.editor.remove")}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="field">
                    <label className="label">Correct answer(s)</label>
                    <div className="correctAnswerChecklist">
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
                                  setForm((current) => ({
                                    ...current,
                                    correctAnswers: selected
                                      ? current.correctAnswers.filter((answer) => answer !== option)
                                      : [...current.correctAnswers, option],
                                  }))
                                }
                                disabled={saving}
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                    </div>
                    <span className="small">Select one or more correct options.</span>
                  </div>
                </div>
              ) : form.type === "Text" ? (
                <div className="field">
                  <label className="label">{t("questionBank.modelAnswer")}</label>
                  <textarea
                    className="input textarea"
                    value={form.correctAnswer}
                    onChange={(e) => setForm((current) => ({ ...current, correctAnswer: e.target.value }))}
                    rows={4}
                    disabled={saving}
                    placeholder={t("questionBank.editor.modelAnswerPlaceholder")}
                  />
                </div>
              ) : null}

              <div className="formActionsBar">
                <button className="btn btnPrimary" type="submit" disabled={saving || !form.offeringId || !form.text.trim()}>
                  {saving ? t("questionBank.editor.saving") : t("questionBank.editor.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
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

  return sections.join("\n\n---\n\n");
}

function extractPrompt(text) {
  const sections = splitTechnicalSections(text);
  return sections.prompt || text || "";
}

function extractSqlSchema(text) {
  const sections = splitTechnicalSections(text);
  return sections.schema || "";
}

function extractStarterCode(text, type) {
  const sections = splitTechnicalSections(text);
  if (sections.code) return sections.code;
  return starterTemplates[type] || starterTemplates.CSharp;
}

function splitTechnicalSections(text) {
  const result = {
    prompt: "",
    schema: "",
    code: "",
  };

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

  return result;
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
