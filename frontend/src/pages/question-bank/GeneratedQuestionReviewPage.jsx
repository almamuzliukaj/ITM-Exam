import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { listMyOfferings } from "../../lib/academicApi";
import { createQuestionBankQuestion } from "../../lib/questionBankApi";

const questionTypes = ["MCQ", "Text", "CSharp", "SQL"];
const difficulties = ["Easy", "Medium", "Hard"];
const statuses = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  added: "Added",
};

const sourceExcerpt = `Object-oriented programming organizes software around objects that combine state and behavior. Encapsulation hides internal details, inheritance reuses shared behavior, and polymorphism allows the same interface to represent different implementations.`;

function createSeedQuestions() {
  return [
    {
      id: crypto.randomUUID(),
      status: statuses.pending,
      sourceLabel: "Uploaded material - page 2",
      sourceExcerpt,
      type: "MCQ",
      text: "Which object-oriented programming principle hides internal implementation details?",
      points: 10,
      topic: "OOP principles",
      difficulty: "Medium",
      options: ["Inheritance", "Encapsulation", "Polymorphism", "Compilation"],
      correctAnswer: "Encapsulation",
      modelAnswer: "",
      explanation: "Encapsulation protects object state by exposing behavior through controlled methods.",
    },
    {
      id: crypto.randomUUID(),
      status: statuses.pending,
      sourceLabel: "Uploaded material - page 3",
      sourceExcerpt: "Polymorphism enables code to work with a general interface while the runtime object provides the concrete behavior.",
      type: "Text",
      text: "Explain polymorphism in object-oriented programming and give one practical example.",
      points: 15,
      topic: "Polymorphism",
      difficulty: "Medium",
      options: ["", "", ""],
      correctAnswer: "",
      modelAnswer: "Polymorphism lets one interface represent multiple concrete behaviors, for example calling Draw() on different Shape objects.",
      explanation: "The answer should mention shared interface, runtime behavior, and a simple example.",
    },
  ];
}

export default function GeneratedQuestionReviewPage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offerings, setOfferings] = useState([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [questions, setQuestions] = useState(() => createSeedQuestions());
  const [activeQuestionId, setActiveQuestionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedOfferingId = searchParams.get("offeringId") || "";
  const selectedOffering = useMemo(
    () => offerings.find((offering) => offering.id === selectedOfferingId) || null,
    [offerings, selectedOfferingId],
  );
  const activeQuestion = questions.find((question) => question.id === activeQuestionId) || questions[0] || null;
  const reviewStats = useMemo(
    () => ({
      pending: questions.filter((question) => question.status === statuses.pending).length,
      approved: questions.filter((question) => question.status === statuses.approved).length,
      rejected: questions.filter((question) => question.status === statuses.rejected).length,
      added: questions.filter((question) => question.status === statuses.added).length,
    }),
    [questions],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoadingOfferings(true);
        setError("");
        const data = await listMyOfferings();
        if (!active) return;
        const nextOfferings = Array.isArray(data) ? data : [];
        setOfferings(nextOfferings);
        if (!selectedOfferingId && nextOfferings[0]?.id) {
          setSearchParams({ offeringId: nextOfferings[0].id }, { replace: true });
        }
      } catch {
        if (active) setError("Course offerings could not be loaded.");
      } finally {
        if (active) setLoadingOfferings(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedOfferingId, setSearchParams]);

  useEffect(() => {
    if (!activeQuestionId && questions[0]?.id) {
      setActiveQuestionId(questions[0].id);
    }
  }, [activeQuestionId, questions]);

  function updateActiveQuestion(patch) {
    if (!activeQuestion) return;
    setQuestions((current) =>
      current.map((question) => (question.id === activeQuestion.id ? { ...question, ...patch } : question)),
    );
    setMessage("");
    setError("");
  }

  function updateOption(index, value) {
    if (!activeQuestion) return;
    updateActiveQuestion({
      options: activeQuestion.options.map((option, optionIndex) => (optionIndex === index ? value : option)),
      status: activeQuestion.status === statuses.added ? statuses.approved : activeQuestion.status,
    });
  }

  function addOption() {
    if (!activeQuestion) return;
    updateActiveQuestion({ options: [...activeQuestion.options, ""] });
  }

  function removeOption(index) {
    if (!activeQuestion) return;
    updateActiveQuestion({ options: activeQuestion.options.filter((_, optionIndex) => optionIndex !== index) });
  }

  function setStatus(nextStatus) {
    if (!activeQuestion) return;
    const validationError = nextStatus === statuses.approved ? validateGeneratedQuestion(activeQuestion) : "";
    if (validationError) {
      setError(validationError);
      return;
    }

    updateActiveQuestion({ status: nextStatus });
    setMessage(nextStatus === statuses.approved ? "Question approved for Question Bank import." : "Question rejected and blocked from import.");
  }

  function regenerateQuestion() {
    if (!activeQuestion) return;
    const regenerated = buildRegeneratedQuestion(activeQuestion);
    setQuestions((current) => current.map((question) => (question.id === activeQuestion.id ? regenerated : question)));
    setActiveQuestionId(regenerated.id);
    setMessage("Question regenerated as a new pending draft.");
    setError("");
  }

  async function addApprovedToQuestionBank() {
    if (!selectedOfferingId) {
      setError("Select a course offering before adding approved questions.");
      return;
    }

    const approvedQuestions = questions.filter((question) => question.status === statuses.approved);
    if (approvedQuestions.length === 0) {
      setError("Approve at least one generated question first.");
      return;
    }

    const invalidQuestion = approvedQuestions.find((question) => validateGeneratedQuestion(question));
    if (invalidQuestion) {
      setActiveQuestionId(invalidQuestion.id);
      setError(validateGeneratedQuestion(invalidQuestion));
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      for (const question of approvedQuestions) {
        await createQuestionBankQuestion(selectedOfferingId, buildQuestionBankPayload(question));
      }

      setQuestions((current) =>
        current.map((question) =>
          question.status === statuses.approved ? { ...question, status: statuses.added } : question,
        ),
      );
      setMessage(`${approvedQuestions.length} approved question${approvedQuestions.length === 1 ? "" : "s"} added to the Question Bank.`);
    } catch (err) {
      setError(readApiMessage(err) || "Approved questions could not be added to the Question Bank.");
    } finally {
      setSaving(false);
    }
  }

  if (userLoading) {
    return <div className="pageState">Loading generated review workspace...</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || "User context could not be loaded."}</div>;
  }

  return (
    <AppShell
      user={user}
      badge="AI review"
      title="Generated question review"
      subtitle="Review AI-generated drafts, edit academic content, approve only reliable questions, and add them to the selected Question Bank."
      actions={<Link className="btn" to={selectedOfferingId ? `/question-bank?offeringId=${selectedOfferingId}` : "/question-bank"}>Question bank</Link>}
    >
      <div className="stackXl generatedReviewWorkspace">
        {error ? <div className="alert">{error}</div> : null}
        {message ? <div className="successBanner">{message}</div> : null}

        <section className="surfaceCard generatedReviewControl">
          <div className="sectionHeader">
            <div>
              <h3>Review scope</h3>
              <span className="sectionMeta">Only approved questions can be inserted into the reusable Question Bank.</span>
            </div>
            <button className="btn btnPrimary" type="button" onClick={addApprovedToQuestionBank} disabled={saving || reviewStats.approved === 0}>
              {saving ? "Adding..." : "Add approved to Question Bank"}
            </button>
          </div>
          <div className="sectionBody generatedReviewScopeGrid">
            <div className="field">
              <label className="label">Course offering</label>
              <select
                className="input"
                value={selectedOfferingId}
                onChange={(event) => setSearchParams(event.target.value ? { offeringId: event.target.value } : {}, { replace: true })}
                disabled={loadingOfferings}
              >
                <option value="">Select offering</option>
                {offerings.map((offering) => (
                  <option key={offering.id} value={offering.id}>
                    {formatOffering(offering)}
                  </option>
                ))}
              </select>
            </div>
            <div className="generatedReviewStats" aria-label="Generated review status">
              <span><strong>{reviewStats.pending}</strong> Pending</span>
              <span><strong>{reviewStats.approved}</strong> Approved</span>
              <span><strong>{reviewStats.rejected}</strong> Rejected</span>
              <span><strong>{reviewStats.added}</strong> Added</span>
            </div>
          </div>
        </section>

        <div className="generatedReviewLayout">
          <aside className="surfaceCard generatedQuestionQueue" aria-label="Generated question queue">
            <div className="sectionHeader">
              <div>
                <h3>Generated drafts</h3>
                <span className="sectionMeta">{questions.length} candidates from AI output</span>
              </div>
            </div>
            <div className="generatedQuestionList">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  className={`generatedQuestionListItem${question.id === activeQuestion?.id ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveQuestionId(question.id)}
                >
                  <span>Question {index + 1}</span>
                  <strong>{truncate(question.text, 74)}</strong>
                  <em className={getStatusClass(question.status)}>{question.status}</em>
                </button>
              ))}
            </div>
          </aside>

          {activeQuestion ? (
            <section className="surfaceCard generatedQuestionEditor">
              <div className="sectionHeader">
                <div>
                  <h3>Review candidate</h3>
                  <span className="sectionMeta">
                    {selectedOffering ? formatOffering(selectedOffering) : "No offering selected"} - source-aware approval
                  </span>
                </div>
                <span className={`statusPill ${getStatusClass(activeQuestion.status)}`}>{activeQuestion.status}</span>
              </div>

              <div className="sectionBody stackLg">
                <div className="generatedSourcePanel">
                  <div>
                    <span className="summaryLabel">Source excerpt</span>
                    <strong>{activeQuestion.sourceLabel}</strong>
                  </div>
                  <p>{activeQuestion.sourceExcerpt}</p>
                </div>

                <div className="formGrid formGridTwo">
                  <div className="field">
                    <label className="label">Type</label>
                    <select className="input" value={activeQuestion.type} onChange={(event) => updateActiveQuestion({ type: event.target.value })}>
                      {questionTypes.map((type) => (
                        <option key={type} value={type}>{formatQuestionType(type)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label className="label">Difficulty</label>
                    <select className="input" value={activeQuestion.difficulty} onChange={(event) => updateActiveQuestion({ difficulty: event.target.value })}>
                      {difficulties.map((difficulty) => (
                        <option key={difficulty} value={difficulty}>{difficulty}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label className="label">Points</label>
                    <input className="input" type="number" min="1" value={activeQuestion.points} onChange={(event) => updateActiveQuestion({ points: event.target.value })} />
                  </div>

                  <div className="field">
                    <label className="label">Topic</label>
                    <input className="input" value={activeQuestion.topic} onChange={(event) => updateActiveQuestion({ topic: event.target.value })} />
                  </div>

                  <div className="field fieldSpanFull">
                    <label className="label">Question text</label>
                    <textarea className="input textarea textareaCompact" rows={4} value={activeQuestion.text} onChange={(event) => updateActiveQuestion({ text: event.target.value })} />
                  </div>
                </div>

                {activeQuestion.type === "MCQ" ? (
                  <div className="generatedOptionsPanel">
                    <div className="sectionHeader sectionHeaderInline">
                      <div>
                        <h3>Alternatives</h3>
                        <span className="sectionMeta">Choose the verified correct answer before approval.</span>
                      </div>
                      <button className="btn" type="button" onClick={addOption}>Add option</button>
                    </div>
                    <div className="questionOptionGrid">
                      {activeQuestion.options.map((option, index) => (
                        <div className="questionOptionInput" key={`${activeQuestion.id}-${index}`}>
                          <input className="input" value={option} onChange={(event) => updateOption(index, event.target.value)} placeholder={`Option ${index + 1}`} />
                          <button className="btn btnGhost" type="button" onClick={() => removeOption(index)} disabled={activeQuestion.options.length <= 2}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="field">
                      <label className="label">Correct answer</label>
                      <select className="input" value={activeQuestion.correctAnswer} onChange={(event) => updateActiveQuestion({ correctAnswer: event.target.value })}>
                        <option value="">Select correct answer</option>
                        {activeQuestion.options.filter(Boolean).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="field">
                    <label className="label">Model answer / expected output</label>
                    <textarea className="input textarea textareaCompact" rows={4} value={activeQuestion.modelAnswer} onChange={(event) => updateActiveQuestion({ modelAnswer: event.target.value })} />
                  </div>
                )}

                <div className="field">
                  <label className="label">Explanation for reviewer</label>
                  <textarea className="input textarea textareaCompact" rows={3} value={activeQuestion.explanation} onChange={(event) => updateActiveQuestion({ explanation: event.target.value })} />
                  <span className="small">Explanation stays in review until backend adds a dedicated Question Bank explanation field.</span>
                </div>

                <div className="generatedReviewActions">
                  <button className="btn btnPrimary" type="button" onClick={() => setStatus(statuses.approved)} disabled={activeQuestion.status === statuses.added}>
                    Approve
                  </button>
                  <button className="btn btnDangerSoft" type="button" onClick={() => setStatus(statuses.rejected)} disabled={activeQuestion.status === statuses.added}>
                    Reject
                  </button>
                  <button className="btn" type="button" onClick={regenerateQuestion} disabled={activeQuestion.status === statuses.added}>
                    Regenerate this question
                  </button>
                  <span className="small">
                    Pending and rejected questions are blocked from Question Bank import.
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <div className="emptyState">
              <p>No generated questions are waiting for review.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function validateGeneratedQuestion(question) {
  const options = question.options.map((option) => option.trim()).filter(Boolean);
  if (!question.text.trim()) return "Question text is required before approval.";
  if (!Number(question.points) || Number(question.points) <= 0) return "Points must be greater than zero.";
  if (!question.difficulty) return "Difficulty is required before approval.";
  if (!question.explanation.trim()) return "Reviewer explanation is required before approval.";
  if (question.type === "MCQ" && options.length < 2) return "MCQ questions need at least two alternatives.";
  if (question.type === "MCQ" && !options.includes(question.correctAnswer)) return "MCQ correct answer must match one of the alternatives.";
  if (question.type !== "MCQ" && !question.modelAnswer.trim()) return "Model answer or expected output is required.";
  return "";
}

function buildQuestionBankPayload(question) {
  const options = question.options.map((option) => option.trim()).filter(Boolean);
  return {
    text: question.text.trim(),
    type: question.type,
    points: Number(question.points) || 0,
    topic: question.topic.trim(),
    difficulty: question.difficulty,
    correctAnswer: question.type === "MCQ" ? JSON.stringify([question.correctAnswer]) : question.modelAnswer.trim(),
    options: question.type === "MCQ" ? options : [],
  };
}

function buildRegeneratedQuestion(question) {
  const baseText = question.type === "MCQ"
    ? `Based on the same source, which statement best matches ${question.topic || "the selected topic"}?`
    : `Using the same source excerpt, explain ${question.topic || "the key concept"} with one example.`;

  return {
    ...question,
    id: crypto.randomUUID(),
    status: statuses.pending,
    text: baseText,
    explanation: "Regenerated draft. Review the wording, answer, and difficulty before approval.",
  };
}

function formatOffering(offering) {
  const code = offering.course?.code || "";
  const name = offering.course?.name || "";
  const term = offering.term?.code || offering.term?.name || "";
  const section = offering.sectionCode || "-";
  return [code && name ? `${code} - ${name}` : code || name, term, `Section ${section}`].filter(Boolean).join(" | ");
}

function formatQuestionType(type) {
  if (type === "CSharp") return "C#";
  return type || "-";
}

function getStatusClass(status) {
  if (status === statuses.approved || status === statuses.added) return "statusLive";
  if (status === statuses.rejected) return "statusDanger";
  return "statusDraft";
}

function truncate(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function readApiMessage(err) {
  return err?.response?.data?.message || (typeof err?.response?.data === "string" ? err.response.data : "") || err?.message;
}
