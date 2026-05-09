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

  const gradedCount = useMemo(() => attempts.filter((attempt) => attempt.isGraded).length, [attempts]);
  const pendingCount = useMemo(() => attempts.filter((attempt) => !attempt.isGraded).length, [attempts]);

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
        current.map((attempt) =>
          attempt.isGraded ? { ...attempt, isPublished: true } : attempt,
        ),
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
        </section>

        <section className="surfaceCard">
          <div className="sectionHeader">
            <h3>Human review workflow</h3>
            <button className="btn btnPrimary" type="button" onClick={onPublishResults} disabled={publishing || gradedCount === 0 || !canReview}>
              {publishing ? "Publishing..." : "Publish graded results"}
            </button>
          </div>
          <div className="sectionBody">
            {loading ? (
              <div className="pageStateCard">Loading submitted attempts...</div>
            ) : attempts.length === 0 ? (
              <div className="emptyState">
                <p>No attempts have been submitted yet.</p>
                <p>AI-assisted review becomes available after students submit text answers.</p>
              </div>
            ) : (
              <div className="questionList">
                {attempts.map((attempt) => (
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
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function AttemptReviewCard({ attempt, draft, aiReview, reviewing, saving, disabled, onDraftChange, onAiReview, onSaveGrade }) {
  return (
    <article className="questionCard">
      <div className="questionIndex">{attempt.isGraded ? "OK" : "AI"}</div>
      <div className="questionBody">
        <div className="resourceMetaRow">
          <strong>{attempt.studentName || attempt.studentEmail || "Student"}</strong>
          <span className={`statusPill ${attempt.isPublished ? "statusLive" : attempt.isGraded ? "statusDraft" : ""}`}>
            {attempt.isPublished ? "Published" : attempt.isGraded ? "Graded" : "Needs review"}
          </span>
        </div>
        <div className="questionMeta">
          <span>Auto: {formatScore(attempt.autoScore)}</span>
          <span>Manual: {formatScore(attempt.manualScore)}</span>
          <span>Final: {formatScore(attempt.finalScore)}</span>
        </div>

        <div className="questionBankFormGrid gradebookScoreGrid">
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
            {reviewing ? "Reviewing..." : "AI text review"}
          </button>
          <button className="btn btnPrimary" type="button" onClick={onSaveGrade} disabled={disabled || saving}>
            {saving ? "Saving..." : "Save human grade"}
          </button>
        </div>
      </div>
    </article>
  );
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

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
