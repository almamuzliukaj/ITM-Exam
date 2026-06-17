import { Link, useParams } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { canManageExams } from "../../lib/permissions";
import {
  evaluateTextAttempt,
  getExam,
  getExamGradebook,
  gradeExamAttempt,
  publishExamResults,
} from "../../lib/examsApi";
import { useEffect, useMemo, useState } from "react";

export default function ExamGradebookPage() {
  const { examId } = useParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exam, setExam] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [aiReviews, setAiReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const canReview = canManageExams(user?.role);

  useEffect(() => {
    if (!examId) return;

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const [examData, gradebookData] = await Promise.all([getExam(examId), getExamGradebook(examId)]);
        if (!active) return;

        const rows = Array.isArray(gradebookData) ? gradebookData : [];
        setExam(examData);
        setAttempts(rows);
        setDrafts(buildDrafts(rows));
      } catch (err) {
        if (active) setError(readApiMessage(err) || "Failed to load gradebook.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [examId]);

  useEffect(() => {
    const pendingAiAttempts = attempts.filter(
      (attempt) => attempt.requiresManualGrading && !attempt.isGraded && !aiReviews[attempt.attemptId],
    );

    if (pendingAiAttempts.length === 0) return;

    let active = true;

    (async () => {
      const reviews = await Promise.all(
        pendingAiAttempts.map(async (attempt) => {
          try {
            const review = await evaluateTextAttempt(attempt.attemptId);
            return { attemptId: attempt.attemptId, attempt, review };
          } catch {
            return null;
          }
        }),
      );

      if (!active) return;

      const successful = reviews.filter(Boolean);
      if (successful.length === 0) return;

      setAiReviews((current) => {
        const next = { ...current };
        for (const item of successful) {
          next[item.attemptId] = item.review;
        }
        return next;
      });

      setDrafts((current) => {
        const next = { ...current };
        for (const item of successful) {
          const suggestedManualScore = Number(item.review?.suggestedManualScore || 0);
          next[item.attemptId] = {
            manualScore: String(suggestedManualScore),
            finalScore: String(Number(item.attempt.autoScore || 0) + suggestedManualScore),
            notes: item.review?.reviewReminder || current[item.attemptId]?.notes || "",
          };
        }
        return next;
      });
    })();

    return () => {
      active = false;
    };
  }, [attempts, aiReviews]);

  const gradedCount = useMemo(() => attempts.filter((attempt) => attempt.isGraded).length, [attempts]);
  const pendingCount = useMemo(() => attempts.filter((attempt) => !attempt.isGraded).length, [attempts]);
  const integrityCount = useMemo(
    () => attempts.reduce((total, attempt) => total + Number(attempt.integrityViolationCount || 0), 0),
    [attempts],
  );
  const publishedCount = useMemo(() => attempts.filter((attempt) => attempt.isPublished).length, [attempts]);
  const visibleAttempts = useMemo(
    () => attempts.filter((attempt) => matchesReviewFilter(attempt, reviewFilter)),
    [attempts, reviewFilter],
  );

  if (userLoading) {
    return <div className="pageState">Loading gradebook...</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || "User session could not be loaded."}</div>;
  }

  async function onAiReview(attempt) {
    try {
      setReviewingId(attempt.attemptId);
      setError("");
      setSuccess("");
      const review = await evaluateTextAttempt(attempt.attemptId);
      setAiReviews((current) => ({ ...current, [attempt.attemptId]: review }));
      setDrafts((current) => {
        const suggestedManualScore = Number(review?.suggestedManualScore || 0);
        return {
          ...current,
          [attempt.attemptId]: {
            manualScore: String(suggestedManualScore),
            finalScore: String(Number(attempt.autoScore || 0) + suggestedManualScore),
            notes: review?.reviewReminder || current[attempt.attemptId]?.notes || "",
          },
        };
      });
    } catch (err) {
      setError(readApiMessage(err) || "Failed to generate AI-assisted review.");
    } finally {
      setReviewingId("");
    }
  }

  async function onSaveGrade(attempt) {
    const draft = drafts[attempt.attemptId] || {};

    try {
      setSavingId(attempt.attemptId);
      setError("");
      setSuccess("");
      const updated = await gradeExamAttempt(attempt.attemptId, {
        manualScore: parseNumberOrNull(draft.manualScore),
        finalScore: parseNumberOrNull(draft.finalScore),
        notes: draft.notes || null,
      });

      setAttempts((current) =>
        current.map((item) =>
          item.attemptId === attempt.attemptId
            ? { ...item, ...updated, studentName: item.studentName, studentEmail: item.studentEmail }
            : item,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [attempt.attemptId]: {
          manualScore: String(updated.manualScore ?? 0),
          finalScore: String(updated.finalScore ?? updated.autoScore ?? 0),
          notes: updated.gradingNotes || "",
        },
      }));
      setSuccess("Grade saved. The result remains hidden from students until published.");
    } catch (err) {
      setError(readApiMessage(err) || "Failed to save grade.");
    } finally {
      setSavingId("");
    }
  }

  async function onPublishResults() {
    try {
      setPublishing(true);
      setError("");
      setSuccess("");
      const result = await publishExamResults(examId, { publishAll: true, attemptIds: [] });
      setAttempts((current) =>
        current.map((attempt) => ({ ...attempt, isGraded: true, isPublished: true })),
      );
      setSuccess(result?.message || "Published graded results.");
    } catch (err) {
      setError(readApiMessage(err) || "Failed to publish results.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AppShell
      user={user}
      badge="Gradebook"
      title={exam?.title ? `${exam.title} gradebook` : "Exam gradebook"}
      subtitle="Review submitted attempts, use AI assistance for text answers, and publish results only after human approval."
      actions={<Link className="btn" to={`/exams/${examId}`}>Back to exam</Link>}
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}
        {success ? <div className="successBanner">{success}</div> : null}

        <section className="summaryStrip">
          <article className="summaryCard">
            <span className="summaryLabel">Attempts</span>
            <strong>{attempts.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Graded</span>
            <strong>{gradedCount}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Needs review</span>
            <strong>{pendingCount}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Integrity flags</span>
            <strong>{integrityCount}</strong>
          </article>
        </section>

        <section className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>Human review workflow</h3>
              <span className="sectionMeta">Review submitted attempts, inspect integrity events, and publish only approved grades.</span>
            </div>
            <div className="resourceActionGroup">
              <span className="statusPill statusDraft">{publishedCount} published</span>
              <button className="btn btnPrimary" type="button" onClick={onPublishResults} disabled={publishing || attempts.length === 0 || !canReview}>
                {publishing ? "Publishing..." : "Publish graded results"}
              </button>
            </div>
          </div>
          <div className="sectionBody stackLg">
            <div className="gradebookToolbar">
              {[
                { key: "all", label: "All attempts", count: attempts.length },
                { key: "needsReview", label: "Needs review", count: pendingCount },
                { key: "violations", label: "Violations", count: attempts.filter((attempt) => Number(attempt.integrityViolationCount || 0) > 0).length },
                { key: "ready", label: "Ready to publish", count: attempts.filter((attempt) => attempt.isGraded && !attempt.isPublished).length },
              ].map((item) => (
                <button
                  key={item.key}
                  className={`filterTab${reviewFilter === item.key ? " filterTabActive" : ""}`}
                  type="button"
                  onClick={() => setReviewFilter(item.key)}
                >
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="pageStateCard">Loading submitted attempts...</div>
            ) : attempts.length === 0 ? (
              <div className="emptyState">
                <strong>No attempts submitted</strong>
                <span>AI-assisted review becomes available after students submit text answers.</span>
              </div>
            ) : visibleAttempts.length === 0 ? (
              <div className="emptyState">
                <strong>No attempts in this view</strong>
                <span>Switch filters to see other gradebook queues for this exam.</span>
              </div>
            ) : (
              <>
                <GradebookAttemptTable attempts={visibleAttempts} drafts={drafts} />
                <div className="gradebookReviewList">
                  {visibleAttempts.map((attempt) => (
                    <AttemptReviewCard
                      key={attempt.attemptId}
                      attempt={attempt}
                      draft={drafts[attempt.attemptId] || {}}
                      aiReview={aiReviews[attempt.attemptId]}
                      reviewing={reviewingId === attempt.attemptId}
                      saving={savingId === attempt.attemptId}
                      disabled={!canReview}
                      onDraftChange={(nextDraft) =>
                        setDrafts((current) => ({ ...current, [attempt.attemptId]: nextDraft }))
                      }
                      onAiReview={() => onAiReview(attempt)}
                      onSaveGrade={() => onSaveGrade(attempt)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function GradebookAttemptTable({ attempts, drafts }) {
  return (
    <div className="tableWrap gradebookAttemptTableWrap">
      <table className="dataTable gradebookAttemptTable">
        <thead>
          <tr>
            <th>Student</th>
            <th>Attempt</th>
            <th>Submitted</th>
            <th>Auto score</th>
            <th>Manual score</th>
            <th>Final score</th>
            <th>Publication</th>
            <th>Integrity</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => {
            const draft = drafts[attempt.attemptId] || {};
            const violations = Number(attempt.integrityViolationCount || 0);
            return (
              <tr key={attempt.attemptId}>
                <td>
                  <div className="examDirectoryTitle">
                    <strong>{attempt.studentName || "Student"}</strong>
                    <span>{attempt.studentEmail || "No email recorded"}</span>
                  </div>
                </td>
                <td>
                  <span className={`statusPill ${attempt.isGraded ? "statusReady" : "statusWarn"}`}>
                    {attempt.isGraded ? "Reviewed" : "Needs review"}
                  </span>
                </td>
                <td>{formatDateTime(attempt.submittedAt) || "Pending"}</td>
                <td>{formatScore(attempt.autoScore)}</td>
                <td>{formatScore(draft.manualScore ?? attempt.manualScore)}</td>
                <td>{formatScore(draft.finalScore ?? attempt.finalScore)}</td>
                <td>
                  <ResultBadge attempt={attempt} />
                </td>
                <td>
                  <span className={`statusPill ${violations > 0 ? "statusWarn" : "statusLive"}`}>
                    {violations > 0 ? `${violations} flag${violations === 1 ? "" : "s"}` : "Clear"}
                  </span>
                </td>
                <td>
                  <a className="btn" href={`#attempt-${attempt.attemptId}`}>
                    Review
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AttemptReviewCard({ attempt, draft, aiReview, reviewing, saving, disabled, onDraftChange, onAiReview, onSaveGrade }) {
  const violationCount = Number(attempt.integrityViolationCount || 0);
  const currentFinalScore = Number(draft.finalScore ?? attempt.finalScore ?? 0);
  const scoreDelta = currentFinalScore - Number(attempt.autoScore || 0);
  const currentPercentage = attempt.examMaxPoints ? (currentFinalScore / Number(attempt.examMaxPoints || 0)) * 100 : 0;
  const currentGrade = calculateGrade(currentPercentage);

  return (
    <article className="gradebookReviewCard" id={`attempt-${attempt.attemptId}`}>
      <div className="gradebookReviewHeader">
        <div className="gradebookStudentBlock">
          <span className="summaryLabel">Student attempt</span>
          <h4>{attempt.studentName || "Student"}</h4>
          <p>{attempt.studentEmail || "No email recorded"}</p>
        </div>
        <div className="gradebookBadgeRow">
          <ResultBadge attempt={attempt} />
          <ViolationBadge count={violationCount} policy={attempt.integrityPolicyAction} />
        </div>
      </div>

      <AttemptTimeline attempt={attempt} />

      <div className="gradebookScoreStrip">
        <ScoreTile label="Auto score" value={attempt.autoScore} />
        <ScoreTile label="AI/manual score" value={draft.manualScore ?? attempt.manualScore} />
        <ScoreTile label="Final score" value={currentFinalScore} strong />
        <ScoreTile label="Exam max points" value={attempt.examMaxPoints} />
        <ScoreTile label="Score percentage" value={`${currentPercentage.toFixed(2)}%`} />
        <ScoreTile label="Final grade" value={formatGrade(currentGrade, currentGrade >= 6)} />
        <ScoreTile label="Adjustment" value={scoreDelta} signed />
      </div>

      <AttemptAnswersPanel attempt={attempt} />

      <IntegrityReviewPanel attempt={attempt} />

      <div className="formGrid formGridTwo gradebookScoreGrid">
        <div className="field">
          <label className="label">Manual score</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.25"
            value={draft.manualScore ?? ""}
            onChange={(e) => onDraftChange({ ...draft, manualScore: e.target.value })}
            disabled={disabled || saving}
          />
        </div>
        <div className="field">
          <label className="label">Final score</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.25"
            value={draft.finalScore ?? ""}
            onChange={(e) => onDraftChange({ ...draft, finalScore: e.target.value })}
            disabled={disabled || saving}
          />
        </div>
      </div>

      <div className="field gradebookNotesField">
        <label className="label">Human review notes</label>
        <textarea
          className="input textareaCompact"
          value={draft.notes ?? ""}
          onChange={(e) => onDraftChange({ ...draft, notes: e.target.value })}
          disabled={disabled || saving}
          placeholder="Record why the final score was accepted or adjusted."
        />
      </div>

      {aiReview ? <AiReviewPanel review={aiReview} /> : null}

      <div className="resourceActionGroup gradebookActions">
        <button className="btn" type="button" onClick={onAiReview} disabled={disabled || reviewing}>
          {reviewing ? "Reviewing..." : "Re-run AI review"}
        </button>
        <button className="btn btnPrimary" type="button" onClick={onSaveGrade} disabled={disabled || saving}>
          {saving ? "Saving..." : "Save human grade"}
        </button>
      </div>
    </article>
  );
}

function ResultBadge({ attempt }) {
  if (attempt.isPublished) return <span className="statusPill statusLive">Published</span>;
  if (attempt.isGraded) return <span className="statusPill statusReady">Ready to publish</span>;
  return <span className="statusPill statusWarn">Needs review</span>;
}

function ViolationBadge({ count, policy }) {
  const hasViolations = count > 0;
  const label = hasViolations ? `${count} violation${count === 1 ? "" : "s"}` : "No violations";
  const policyLabel = policy && policy !== "None" ? ` / ${formatIntegrityEvent(policy)}` : "";
  return <span className={`statusPill ${hasViolations ? "statusWarn" : "statusLive"}`}>{label}{policyLabel}</span>;
}

function ScoreTile({ label, value, strong = false, signed = false }) {
  return (
    <div className={`gradebookScoreTile${strong ? " gradebookScoreTileStrong" : ""}`}>
      <span>{label}</span>
      <strong>{signed ? formatSignedScore(value) : formatDisplayValue(value)}</strong>
    </div>
  );
}

function AttemptTimeline({ attempt }) {
  const steps = [
    { label: "Started", value: attempt.startedAt },
    { label: "Submitted", value: attempt.submittedAt },
    { label: "Last violation", value: attempt.integrityLastViolationAt, warn: Number(attempt.integrityViolationCount || 0) > 0 },
    { label: "Graded", value: attempt.gradedAt, done: attempt.isGraded },
  ];

  return (
    <div className="attemptTimeline" aria-label="Attempt timeline">
      {steps.map((step) => (
        <div key={step.label} className={`attemptTimelineStep${step.value || step.done ? " attemptTimelineStepDone" : ""}${step.warn ? " attemptTimelineStepWarn" : ""}`}>
          <span className="attemptTimelineDot" />
          <div>
            <strong>{step.label}</strong>
            <span>{formatDateTime(step.value) || "Pending"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AttemptAnswersPanel({ attempt }) {
  const answers = Array.isArray(attempt.answers) ? attempt.answers : [];

  return (
    <div className="attemptAnswersPanel">
      <div className="sectionHeader">
        <div>
          <h3>Student answers</h3>
          <span className="small">Review each submitted answer exactly as the student sent it.</span>
        </div>
      </div>
      {answers.length === 0 ? (
        <div className="emptyState">No submitted answers were recorded for this attempt.</div>
      ) : (
        <div className="attemptAnswerList">
          {answers.map((answer, index) => (
            <article key={answer.questionId} className="attemptAnswerCard">
              <div className="attemptAnswerHeader">
                <div>
                  <span className="summaryLabel">Question {index + 1} / {answer.questionType}</span>
                  <strong>{answer.questionText}</strong>
                </div>
                <span className={`statusPill ${answer.isCorrect ? "statusLive" : "statusDraft"}`}>
                  {answer.isCorrect ? "Correct" : `${answer.points || 0} pts`}
                </span>
              </div>
              {Array.isArray(answer.options) && answer.options.length > 0 ? (
                <div className="attemptAnswerOptions">
                  {answer.options.map((option) => (
                    <span
                      key={option}
                      className={`${option === answer.response ? "selected" : ""}${option === answer.correctAnswer ? " correct" : ""}`}
                    >
                      {option}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="attemptAnswerResponse">
                <span>Student response</span>
                <p>{answer.response || "(empty answer)"}</p>
              </div>
              {answer.correctAnswer ? (
                <div className="attemptAnswerExpected">
                  <span>Expected answer</span>
                  <p>{answer.correctAnswer}</p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrityReviewPanel({ attempt }) {
  const events = Array.isArray(attempt.integrityEvents) ? attempt.integrityEvents : [];
  const violationCount = Number(attempt.integrityViolationCount || 0);

  return (
    <div className={`integrityReview ${violationCount > 0 ? "integrityReviewWarn" : ""}`}>
      <div>
        <span className="summaryLabel">Integrity review</span>
        <strong>{violationCount > 0 ? `${violationCount} violation${violationCount === 1 ? "" : "s"}` : "No violations"}</strong>
        <div className="integrityStatusGrid">
          <span className={violationCount > 0 ? "statusWarn" : "statusOk"}>
            {attempt.integrityPolicyAction && attempt.integrityPolicyAction !== "None" ? formatIntegrityEvent(attempt.integrityPolicyAction) : "No policy action"}
          </span>
          <span className={attempt.integrityAutoActionTriggeredAt ? "statusWarn" : "statusOk"}>
            {attempt.integrityAutoActionTriggeredAt ? `Auto action ${formatDateTime(attempt.integrityAutoActionTriggeredAt)}` : "No auto action"}
          </span>
        </div>
      </div>
      {events.length > 0 ? (
        <ol>
          {events.slice(0, 4).map((event, index) => (
            <li key={`${event.eventType}-${event.createdAt}-${index}`}>
              <span>{formatIntegrityEvent(event.eventType)}</span>
              <small>{event.message || "Recorded during exam session."}</small>
            </li>
          ))}
        </ol>
      ) : (
        <p>No suspicious activity was recorded for this attempt.</p>
      )}
    </div>
  );
}

function formatIntegrityEvent(value) {
  return String(value || "Integrity event").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function AiReviewPanel({ review }) {
  return (
    <div className="technicalQuestionPreview gradebookAiReview">
      <div>
        <span className="summaryLabel">AI-assisted suggestion</span>
        <pre>{`Suggested manual score: ${formatScore(review.suggestedManualScore)}\n${review.reviewReminder || ""}`}</pre>
      </div>
      {(review.questions || []).map((question) => (
        <div key={question.questionId}>
          <span className="summaryLabel">{question.confidence} confidence</span>
          <pre>{`${question.rationale}\nSuggested: ${formatScore(question.suggestedPoints)} / ${formatScore(question.maxPoints)}\n\nAnswer:\n${question.response || "(empty)"}`}</pre>
        </div>
      ))}
    </div>
  );
}

function buildDrafts(attempts) {
  return attempts.reduce((acc, attempt) => {
    acc[attempt.attemptId] = {
      manualScore: String(attempt.manualScore ?? 0),
      finalScore: String(attempt.finalScore ?? attempt.autoScore ?? 0),
      notes: attempt.gradingNotes || "",
    };
    return acc;
  }, {});
}

function parseNumberOrNull(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatScore(value) {
  const parsed = Number(value || 0);
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2);
}

function formatSignedScore(value) {
  const parsed = Number(value || 0);
  const formatted = formatScore(Math.abs(parsed));
  if (parsed > 0) return `+${formatted}`;
  if (parsed < 0) return `-${formatted}`;
  return formatted;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDisplayValue(value) {
  if (typeof value === "string") return value;
  return formatScore(value);
}

function formatGrade(grade, passed) {
  if (!grade) return "-";
  return `${grade} ${passed ? "(Pass)" : "(Fail)"}`;
}

function calculateGrade(percentage) {
  if (percentage < 51) return 5;
  if (percentage <= 60) return 6;
  if (percentage <= 70) return 7;
  if (percentage <= 80) return 8;
  if (percentage <= 90) return 9;
  return 10;
}

function matchesReviewFilter(attempt, filter) {
  if (filter === "needsReview") return !attempt.isGraded;
  if (filter === "violations") return Number(attempt.integrityViolationCount || 0) > 0;
  if (filter === "ready") return attempt.isGraded && !attempt.isPublished;
  return true;
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
