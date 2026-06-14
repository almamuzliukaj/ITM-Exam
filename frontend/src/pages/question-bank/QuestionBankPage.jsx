import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listMyOfferings } from "../../lib/academicApi";
import { createQuestionBankQuestion, deleteQuestionBankQuestion, listQuestionBankQuestions } from "../../lib/questionBankApi";

const questionTypes = new Set(["MCQ", "Text", "CSharp", "SQL"]);

export default function QuestionBankPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    topic: "",
    difficulty: "",
    search: "",
  });
  const [questionPage, setQuestionPage] = useState(1);
  const [questionPageSize, setQuestionPageSize] = useState(6);

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
  }, [filters, refreshKey, selectedOfferingId, t]);

  const selectedOffering = useMemo(
    () => offerings.find((offering) => offering.id === selectedOfferingId) || null,
    [offerings, selectedOfferingId]
  );
  const questionPageCount = Math.max(1, Math.ceil(questions.length / questionPageSize));
  const visibleQuestions = useMemo(() => {
    const startIndex = (questionPage - 1) * questionPageSize;
    return questions.slice(startIndex, startIndex + questionPageSize);
  }, [questionPage, questionPageSize, questions]);
  const questionStart = questions.length === 0 ? 0 : (questionPage - 1) * questionPageSize + 1;
  const questionEnd = Math.min(questions.length, questionPage * questionPageSize);

  useEffect(() => {
    setQuestionPage(1);
  }, [filters.type, filters.search, selectedOfferingId, questionPageSize]);

  useEffect(() => {
    setQuestionPage((current) => Math.min(current, questionPageCount));
  }, [questionPageCount]);

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

  async function handleImportQuestions() {
    const readyRows = importRows.filter((row) => row.isValid);
    if (!selectedOfferingId || readyRows.length === 0) {
      setImportMessage(t("questionBank.import.fixRows"));
      return;
    }

    try {
      setImporting(true);
      setImportMessage("");
      for (const row of readyRows) {
        await createQuestionBankQuestion(selectedOfferingId, buildImportPayload(row));
      }
      setImportMessage(t("questionBank.import.success", { count: readyRows.length }));
      setImportRows([]);
      setImportOpen(false);
      setRefreshKey((current) => current + 1);
    } catch {
      setImportMessage(t("questionBank.import.error"));
    } finally {
      setImporting(false);
    }
  }

  function handleTemplateDownload() {
    const csv = [
      ["topic", "difficulty", "type", "points", "prompt", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "modelAnswer"],
      ["Programming", "Easy", "MCQ", "2", "Which HTTP method is used to create a resource?", "GET", "POST", "PUT", "DELETE", "POST", ""],
      ["Databases", "Medium", "Text", "5", "Explain normalization in relational databases.", "", "", "", "", "", "Reduces redundancy and improves data consistency."],
      ["SQL Practice", "Hard", "SQL", "10", "Write a query that returns all active students.", "", "", "", "", "", "SELECT * FROM Students WHERE IsActive = 1;"],
    ]
      .map((row) => row.map(formatCsvCell).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "question-bank-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsedRows = normalizeImportRows(parseCsv(text));
      setImportRows(parsedRows);
      setImportMessage(parsedRows.some((row) => !row.isValid) ? t("questionBank.import.previewIssue") : "");
    } catch {
      setImportRows([]);
      setImportMessage(t("questionBank.import.parseError"));
    }
  }

  const validImportCount = importRows.filter((row) => row.isValid).length;
  const invalidImportCount = importRows.length - validImportCount;
  const groupedQuestions = useMemo(() => groupQuestionsByTopic(questions, t("questionBank.uncategorized")), [questions, t]);

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
          <div className="row questionBankPageActions">
            <button className="btn" type="button" onClick={() => setImportOpen(true)}>
              {t("questionBank.import.open")}
            </button>
            <Link className="btn btnPrimary" to={`/question-bank/new?offeringId=${selectedOfferingId}`}>
              {t("questionBank.create")}
            </Link>
          </div>
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
                <label className="label">{t("questionBank.topic")}</label>
                <input
                  className="input"
                  value={filters.topic}
                  onChange={(e) => setFilters((current) => ({ ...current, topic: e.target.value }))}
                  placeholder={t("questionBank.topicPlaceholder")}
                  disabled={!selectedOfferingId}
                />
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

              <div className="field questionBankField">
                <label className="label">Per page</label>
                <select className="input" value={questionPageSize} onChange={(e) => setQuestionPageSize(Number(e.target.value))} disabled={!selectedOfferingId}>
                  <option value={6}>6 questions</option>
                  <option value={12}>12 questions</option>
                  <option value={24}>24 questions</option>
                </select>
              </div>
            </div>

            {selectedOffering ? (
              <div className="small questionBankContext">
                {t("questionBank.selectedOffering", { offering: formatOffering(selectedOffering) })} · Showing {questionStart}-{questionEnd} of {questions.length}
              </div>
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
 exam-session-question-bank-fixes
          <section className="questionBankTopicStack">
            {groupedQuestions.map((group) => (
              <section className="questionBankTopicSection" key={group.topic}>
                <div className="questionBankTopicHeader">
                  <div>
                    <span className="sectionMeta">{t("questionBank.topicSection")}</span>
                    <h3>{group.topic}</h3>
                  </div>
                  <span className="statusPill statusReady">{t("questionBank.questionCount", { count: group.questions.length })}</span>
                </div>

                <div className="questionBankGrid">
                  {group.questions.map((question) => (
                    <article key={question.id} className="resourceCard questionBankCard">
                      <div className="resourceMetaRow">
                        <span className={`statusPill ${question.type === "MCQ" ? "statusLive" : "statusDraft"}`}>{formatQuestionType(question.type)}</span>
                        <span className="statusPill statusReady">{formatDifficulty(question.difficulty, t)}</span>
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
                </div>
              </section>
            ))}

          <section className="stackLg">
            <div className="questionBankGrid">
              {visibleQuestions.map((question) => (
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
            </div>
            <div className="paginationBar">
              <span>Showing {questionStart}-{questionEnd} of {questions.length}</span>
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
 main
          </section>
        )}

        {importOpen ? (
          <div className="modalBackdrop" role="presentation">
            <section className="modalCard questionImportModal" role="dialog" aria-modal="true" aria-labelledby="question-import-title">
              <div className="sectionHeader sectionHeaderInline">
                <div>
                  <h3 id="question-import-title">{t("questionBank.import.title")}</h3>
                  <p>{t("questionBank.import.subtitle")}</p>
                </div>
                <div className="row questionImportHeaderActions">
                  <span className="statusPill statusDraft">{t("questionBank.import.csv")}</span>
                  <button className="iconButton questionImportClose" type="button" onClick={() => setImportOpen(false)} aria-label={t("common.close")}>
                    X
                  </button>
                </div>
              </div>

              <div className="questionImportLayout">
                <div className="questionImportDrop">
                  <label className="label" htmlFor="question-import-file">{t("questionBank.import.file")}</label>
                  <input id="question-import-file" className="input" type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
                  <p>{t("questionBank.import.columns")}</p>
                  <div className="row questionBankPageActions">
                    <button className="btn" type="button" onClick={handleTemplateDownload}>
                      {t("questionBank.import.template")}
                    </button>
                  </div>
                </div>

                <div className="questionImportSummary" aria-live="polite">
                  <span>
                    <strong>{validImportCount}</strong>
                    {t("questionBank.import.ready")}
                  </span>
                  <span>
                    <strong>{invalidImportCount}</strong>
                    {t("questionBank.import.needsFix")}
                  </span>
                </div>
              </div>

              {importMessage ? <div className="alert">{importMessage}</div> : null}

              {importRows.length > 0 ? (
                <div className="questionImportTableWrap">
                  <table className="dataTable questionImportTable">
                    <thead>
                      <tr>
                        <th>{t("questionBank.import.row")}</th>
                        <th>{t("questionBank.topic")}</th>
                        <th>{t("questionBank.difficulty")}</th>
                        <th>{t("questionBank.type")}</th>
                        <th>{t("questionBank.editor.prompt")}</th>
                        <th>{t("questionBank.editor.points")}</th>
                        <th>{t("questionBank.import.status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td>{row.rowNumber}</td>
                          <td>{row.topic || t("questionBank.uncategorized")}</td>
                          <td>{formatDifficulty(row.difficulty, t)}</td>
                          <td>{formatQuestionType(row.type)}</td>
                          <td>{row.prompt}</td>
                          <td>{row.points}</td>
                          <td>
                            <span className={`statusPill ${row.isValid ? "statusLive" : "statusDanger"}`}>
                              {row.isValid ? t("questionBank.import.readyLabel") : row.errors.join(", ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="emptyState questionImportEmpty">
                  <p>{t("questionBank.import.emptyTitle")}</p>
                  <p>{t("questionBank.import.emptyText")}</p>
                </div>
              )}

              <div className="formActionsBar">
                <button className="btn" type="button" onClick={() => setImportOpen(false)} disabled={importing}>
                  {t("common.cancel")}
                </button>
                <button className="btn btnPrimary" type="button" onClick={handleImportQuestions} disabled={importing || validImportCount === 0}>
                  {importing ? t("questionBank.import.importing") : t("questionBank.import.import")}
                </button>
              </div>
            </section>
          </div>
        ) : null}
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

function formatDifficulty(difficulty, t) {
  if (difficulty === "Easy") return t("questionBank.difficulties.easy");
  if (difficulty === "Hard") return t("questionBank.difficulties.hard");
  return t("questionBank.difficulties.medium");
}

function groupQuestionsByTopic(questions, fallbackTopic) {
  const groups = new Map();

  for (const question of questions) {
    const topic = question.topic?.trim() || fallbackTopic;
    if (!groups.has(topic)) {
      groups.set(topic, []);
    }
    groups.get(topic).push(question);
  }

  return Array.from(groups.entries()).map(([topic, groupQuestions]) => ({
    topic,
    questions: groupQuestions,
  }));
}

function buildImportPayload(row) {
  const technicalText = row.type === "SQL" || row.type === "CSharp"
    ? `Prompt:\n${row.prompt}\n\n---\n\n${row.type === "SQL" ? "Starter SQL" : "Starter C# code"}:\n`
    : row.prompt;

  return {
    text: technicalText,
    type: row.type,
    points: row.points,
    topic: row.topic,
    difficulty: row.difficulty,
    correctAnswer: row.type === "MCQ" ? row.correctAnswer : row.modelAnswer,
    options: row.type === "MCQ" ? row.options : [],
  };
}

function normalizeImportRows(rows) {
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => normalizeHeader(header));
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell || "").trim()));

  return dataRows.map((row, index) => {
    const source = Object.fromEntries(headers.map((header, cellIndex) => [header, String(row[cellIndex] || "").trim()]));
    const type = normalizeQuestionType(source.type);
    const options = [source.optiona, source.optionb, source.optionc, source.optiond].filter(Boolean);
    const points = Number(source.points);
    const prompt = source.prompt || source.question || "";
    const topic = source.topic || source.section || source.subject || "";
    const difficulty = normalizeDifficulty(source.difficulty);
    const correctAnswer = source.correctanswer || "";
    const modelAnswer = source.modelanswer || source.answer || "";
    const errors = [];

    if (!questionTypes.has(type)) errors.push("type");
    if (!prompt) errors.push("prompt");
    if (!Number.isFinite(points) || points <= 0) errors.push("points");
    if (type === "MCQ" && options.length < 2) errors.push("options");
    if (type === "MCQ" && !options.includes(correctAnswer)) errors.push("correctAnswer");

    return {
      rowNumber: index + 2,
      type,
      points: Number.isFinite(points) ? points : "",
      topic,
      difficulty,
      prompt,
      options,
      correctAnswer,
      modelAnswer,
      errors,
      isValid: errors.length === 0,
    };
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeQuestionType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "mcq" || normalized === "multiplechoice") return "MCQ";
  if (normalized === "text" || normalized === "essay") return "Text";
  if (normalized === "c#" || normalized === "csharp") return "CSharp";
  if (normalized === "sql") return "SQL";
  return value || "";
}

function normalizeDifficulty(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy") return "Easy";
  if (normalized === "hard") return "Hard";
  return "Medium";
}

function formatCsvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
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
