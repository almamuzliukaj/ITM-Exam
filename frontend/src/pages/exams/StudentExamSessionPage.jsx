import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getCurrentExamAttempt, getCurrentExamIntegritySummary, getExam, getExamLockdownReadiness, listQuestions, recordExamIntegrityEvent, submitExamAttempt } from "../../lib/examsApi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function StudentExamSessionPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [loadedDraftAt, setLoadedDraftAt] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [draftRestored, setDraftRestored] = useState(false);
  const [sessionTiming, setSessionTiming] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitReview, setShowSubmitReview] = useState(false);
  const [showFinalWarning, setShowFinalWarning] = useState(false);
  const [autoActionCountdown, setAutoActionCountdown] = useState(null);
  const [attemptId, setAttemptId] = useState("");
  const [integrityEvents, setIntegrityEvents] = useState([]);
  const [integrityPolicy, setIntegrityPolicy] = useState(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [lockdownReadiness, setLockdownReadiness] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const submittedRef = useRef(false);
  const autoSubmitAttemptedRef = useRef(false);
  const clientSessionIdRef = useRef(createClientSessionId());
  const lastViolationRef = useRef({ key: "", at: 0 });
  const violationCount = integrityEvents.length;
  const serverViolationCount = Number(integrityPolicy?.attemptViolationCount || 0);
  const effectiveViolationCount = Math.max(violationCount, serverViolationCount);
  const finalWarningThreshold = Number(integrityPolicy?.finalWarningThreshold || 3);
  const autoActionThreshold = Number(integrityPolicy?.autoActionThreshold || 5);
  const shouldShowFinalWarning = Boolean(integrityPolicy?.shouldShowFinalWarning) || effectiveViolationCount >= finalWarningThreshold;
  const shouldAutoSubmit = Boolean(integrityPolicy?.shouldAutoSubmit) || effectiveViolationCount >= autoActionThreshold;
  const interactionLocked = Boolean(integrityPolicy?.shouldBlockInteraction) || shouldAutoSubmit;
  const lockdownBlocked = Boolean(lockdownReadiness?.requiresLockdown && !lockdownReadiness?.canStartAttempt);

  const storageKey = useMemo(() => {
    const userKey = user?.id || user?.email || "student";
    return examId ? `online-exam-session:${userKey}:${examId}` : "";
  }, [examId, user?.email, user?.id]);

  useEffect(() => {
    if (!examId || !user || user.role !== "Student") return;

    let active = true;

    async function loadSession() {
      try {
        setLoading(true);
        setError("");
        const examData = await getExam(examId);
        const readiness = await getExamLockdownReadiness(examId).catch(() => null);
        if (!active) return;

        setExam(examData);
        setLockdownReadiness(readiness);

        if (readiness?.requiresLockdown && !readiness.canStartAttempt) {
          setQuestions([]);
          setAttemptId("");
          setSessionTiming(null);
          setTimeRemaining(0);
          return;
        }

        const [questionData, attemptData, integritySummary] = await Promise.all([
          listQuestions(examId),
          getCurrentExamAttempt(examId),
          getCurrentExamIntegritySummary(examId).catch(() => null),
        ]);
        if (!active) return;

        setQuestions(Array.isArray(questionData) ? questionData : []);
        setAttemptId(attemptData?.examAttemptId || "");
        if (integritySummary?.policy) {
          setIntegrityPolicy(integritySummary.policy);
        }
        if (Array.isArray(integritySummary?.events)) {
          setIntegrityEvents(integritySummary.events
            .slice()
            .reverse()
            .map((event, index) => ({
              eventType: event.eventType,
              message: getIntegrityEventMessage(event.eventType),
              createdAt: event.occurredAt || event.recordedAt || new Date().toISOString(),
              violationCount: event.attemptViolationCount || index + 1,
              policyAction: event.policyAction,
            }))
            .slice(0, 12));
        }

        const restored = readDraft(storageKey);
        const timing = buildSessionTiming(examData, restored);
        setSessionTiming(timing);
        setTimeRemaining(calculateRemainingSeconds(timing));

        if (restored?.answers && typeof restored.answers === "object") {
          setAnswers(restored.answers);
          setLoadedDraftAt(restored.savedAt || "");
          setSavedAt(restored.savedAt || "");
          setDraftRestored(true);
        }
        if (restored?.flaggedQuestions && typeof restored.flaggedQuestions === "object") {
          setFlaggedQuestions(restored.flaggedQuestions);
          setDraftRestored(true);
        }
      } catch (err) {
        if (active) setError(getApiMessage(err, "Failed to load the exam session."));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, [examId, storageKey, user]);

  useEffect(() => {
    if (!sessionTiming) return;

    function tick() {
      setTimeRemaining(calculateRemainingSeconds(sessionTiming));
    }

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [sessionTiming]);

  const persistDraft = useCallback((state = "saved") => {
    if (!storageKey || !sessionTiming || result) return;

    try {
      const nextSavedAt = new Date().toISOString();
      localStorage.setItem(storageKey, JSON.stringify({
        answers,
        flaggedQuestions,
        savedAt: nextSavedAt,
        ...sessionTiming,
      }));
      setSavedAt(nextSavedAt);
      setSaveState(state);
    } catch {
      setSaveState("error");
    }
  }, [answers, flaggedQuestions, result, sessionTiming, storageKey]);

  useEffect(() => {
    if (!storageKey || loading || result || !sessionTiming) return;

    setSaveState("saving");
    const timeout = window.setTimeout(() => persistDraft("saved"), 650);
    return () => window.clearTimeout(timeout);
  }, [answers, flaggedQuestions, loading, persistDraft, result, sessionTiming, storageKey]);

  useEffect(() => {
    if (!storageKey || loading || result || !sessionTiming) return;

    function saveOnExit() {
      persistDraft("saved");
    }

    function warnBeforeUnload(event) {
      if (Object.values(answers).some((answer) => String(answer || "").trim().length > 0)) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    function saveWhenHidden() {
      if (document.visibilityState === "hidden") {
        persistDraft("saved");
      }
    }

    window.addEventListener("pagehide", saveOnExit);
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("visibilitychange", saveWhenHidden);

    return () => {
      window.removeEventListener("pagehide", saveOnExit);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("visibilitychange", saveWhenHidden);
    };
  }, [answers, loading, persistDraft, result, sessionTiming, storageKey]);

  const recordViolation = useCallback((eventType, message, metadata = {}) => {
    if (!examId || result || submittedRef.current) return;

    const nowMs = Date.now();
    const key = `${eventType}:${message}`;
    if (lastViolationRef.current.key === key && nowMs - lastViolationRef.current.at < 1500) {
      return;
    }
    lastViolationRef.current = { key, at: nowMs };

    setIntegrityEvents((current) => {
      const nextCount = current.length + 1;
      const occurredAt = new Date().toISOString();
      const nextEvent = {
        eventType,
        message,
        createdAt: occurredAt,
        violationCount: nextCount,
      };

      if (nextCount >= finalWarningThreshold) {
        setShowFinalWarning(true);
      }

      recordExamIntegrityEvent(examId, {
        examAttemptId: attemptId || null,
        eventType,
        occurredAt,
        clientSessionId: clientSessionIdRef.current,
        metadata: {
          message,
          localViolationCount: nextCount,
          fullscreenActive: Boolean(document.fullscreenElement),
          visibilityState: document.visibilityState,
          online: typeof navigator === "undefined" ? true : navigator.onLine,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          ...metadata,
        },
      })
        .then((response) => {
          if (response?.policy) {
            setIntegrityPolicy(response.policy);
            if (response.policy.shouldShowFinalWarning) {
              setShowFinalWarning(true);
            }
          }
          if (response?.examAttemptId) {
            setAttemptId(response.examAttemptId);
          }
        })
        .catch(() => {});

      return [nextEvent, ...current].slice(0, 12);
    });
  }, [attemptId, examId, finalWarningThreshold, result]);

  useEffect(() => {
    if (loading || result) return;

    setFullscreenActive(Boolean(document.fullscreenElement));

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        recordViolation("TabHidden", "Exam tab was hidden during the session.");
      }
    }

    function onWindowBlur() {
      recordViolation("WindowBlur", "Exam window lost focus.");
    }

    function onFullscreenChange() {
      const active = Boolean(document.fullscreenElement);
      setFullscreenActive(active);
      if (!active) {
        recordViolation("FullscreenExit", "Fullscreen mode was exited.");
      }
    }

    function onBlockedInteraction(event) {
      event.preventDefault();
      const eventType = event.type === "contextmenu"
          ? "RightClickAttempt"
          : event.type === "copy"
            ? "CopyAttempt"
            : "PasteAttempt";
      recordViolation(eventType, "Restricted browser interaction was attempted.");
    }

    function onKeyDown(event) {
      const key = event.key?.toLowerCase();
      const blockedCombo =
        (event.ctrlKey || event.metaKey) && ["c", "v", "x", "p", "s", "u", "a"].includes(key);
      const blockedSystemKey = ["f12", "printscreen"].includes(key);
      if (!blockedCombo && !blockedSystemKey) return;

      event.preventDefault();
      recordViolation(
        key === "p" || key === "printscreen" ? "PrintAttempt" : "ShortcutAttempt",
        "Restricted keyboard shortcut was attempted.",
        { key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, shiftKey: event.shiftKey },
      );
    }

    function onBeforePrint(event) {
      event.preventDefault?.();
      recordViolation("PrintAttempt", "Print action was attempted during the exam.");
    }

    function onOffline() {
      setNetworkOnline(false);
      recordViolation("NetworkOffline", "Network connection was lost during the exam.");
    }

    function onOnline() {
      setNetworkOnline(true);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("contextmenu", onBlockedInteraction);
    document.addEventListener("copy", onBlockedInteraction);
    document.addEventListener("paste", onBlockedInteraction);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("contextmenu", onBlockedInteraction);
      document.removeEventListener("copy", onBlockedInteraction);
      document.removeEventListener("paste", onBlockedInteraction);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [loading, recordViolation, result]);

  const submit = useCallback(async (reason = "manual") => {
    if (!examId || submittedRef.current) return;

    try {
      submittedRef.current = true;
      setSubmitting(true);
      setError("");
      const payload = {
        answers: Object.entries(answers).map(([questionId, response]) => ({
          questionId,
          response: String(response || "").trim(),
        })),
      };
      const submission = await submitExamAttempt(examId, payload);
      localStorage.removeItem(storageKey);
      setShowSubmitReview(false);
      setResult({ ...submission, reason });
    } catch (err) {
      submittedRef.current = false;
      setError(getApiMessage(err, "Failed to submit the exam."));
    } finally {
      setSubmitting(false);
    }
  }, [answers, examId, storageKey]);

  useEffect(() => {
    if (!shouldShowFinalWarning || result || loading) return;
    setShowFinalWarning(true);
  }, [loading, result, shouldShowFinalWarning]);

  useEffect(() => {
    if (!shouldAutoSubmit || result || submitting || loading || questions.length === 0) {
      if (!shouldAutoSubmit) setAutoActionCountdown(null);
      return;
    }

    setShowSubmitReview(false);
    setShowFinalWarning(false);
    setAutoActionCountdown((current) => current ?? 5);
  }, [loading, questions.length, result, shouldAutoSubmit, submitting]);

  useEffect(() => {
    if (autoActionCountdown == null || result || submitting) return;

    if (autoActionCountdown <= 0 && !autoSubmitAttemptedRef.current) {
      autoSubmitAttemptedRef.current = true;
      persistDraft("saved");
      submit("integrity-policy");
      return;
    }

    const timer = window.setTimeout(() => {
      setAutoActionCountdown((current) => (current == null ? current : current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [autoActionCountdown, persistDraft, result, submit, submitting]);

  useEffect(() => {
    if (!loading && exam && questions.length > 0 && sessionTiming && timeRemaining === 0 && !result && !submitting) {
      submit("timer");
    }
  }, [exam, loading, questions.length, result, sessionTiming, submit, submitting, timeRemaining]);

  if (userLoading) return <div className="pageState">Loading session...</div>;
  if (!user) return <div className="pageState">{userError || "You must be signed in."}</div>;
  if (user.role !== "Student") return <div className="pageState">Only students can open an exam session.</div>;

  const answeredCount = questions.filter((question) => String(answers[question.id] || "").trim().length > 0).length;
  const flaggedCount = questions.filter((question) => flaggedQuestions[question.id]).length;
  const unansweredCount = questions.length - answeredCount;
  async function enterFullscreen() {
    if (!document.fullscreenEnabled) {
      recordViolation("FullscreenRequestFailed", "This browser does not allow fullscreen mode.");
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
      setFullscreenActive(true);
    } catch {
      recordViolation("FullscreenRequestFailed", "Fullscreen mode could not be entered.");
    }
  }

  function discardRestoredDraft() {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
    setAnswers({});
    setFlaggedQuestions({});
    setLoadedDraftAt("");
    setSavedAt("");
    setDraftRestored(false);
    setSaveState("idle");
  }

  return (
    <AppShell
      user={user}
      badge="Exam session"
      title={exam?.title || "Student exam"}
      subtitle={exam?.description || "Answer each question, keep an eye on the timer, and submit when ready."}
      actions={
        <>
          <Link className="btn" to="/exams">Back to exams</Link>
          {!result && !lockdownBlocked ? (
            <button className="btn" type="button" onClick={enterFullscreen}>
              {fullscreenActive ? "Fullscreen active" : "Enter fullscreen"}
            </button>
          ) : null}
          {!result && !lockdownBlocked ? (
            <button className="btn btnPrimary examSubmitBtn" type="button" onClick={() => setShowSubmitReview(true)} disabled={submitting || loading || questions.length === 0 || interactionLocked}>
              {submitting ? "Submitting..." : "Submit exam"}
            </button>
          ) : null}
        </>
      }
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}
        {!result && lockdownReadiness ? (
          <LockdownReadinessPanel readiness={lockdownReadiness} />
        ) : null}

        {!result && !lockdownBlocked ? (
          <IntegrityWarningBanner
            violationCount={violationCount}
            effectiveViolationCount={effectiveViolationCount}
            locked={interactionLocked}
            autoSubmitActive={shouldAutoSubmit}
            autoActionCountdown={autoActionCountdown}
            events={integrityEvents}
            policy={integrityPolicy}
            fullscreenActive={fullscreenActive}
            networkOnline={networkOnline}
            onFullscreen={enterFullscreen}
          />
        ) : null}

        {draftRestored && !result ? (
          <section className="draftRestoreBanner">
            <div>
              <strong>Draft restored</strong>
              <span>Your previous answers were restored from this device. Last saved {formatSavedAt(loadedDraftAt || savedAt)}.</span>
            </div>
            <button className="btn" type="button" onClick={discardRestoredDraft} disabled={submitting || interactionLocked}>
              Clear restored draft
            </button>
          </section>
        ) : null}

        {result ? (
          <SubmissionResult
            result={result}
            answeredCount={answeredCount}
            questionsCount={questions.length}
            onDone={() => navigate("/exams")}
          />
        ) : null}

        {showSubmitReview ? (
          <SubmitReviewPanel
            answeredCount={answeredCount}
            flaggedCount={flaggedCount}
            questionsCount={questions.length}
            submitting={submitting}
            timeRemaining={timeRemaining}
            onCancel={() => setShowSubmitReview(false)}
            onConfirm={() => submit("manual")}
          />
        ) : null}

        {showFinalWarning ? (
          <FinalWarningModal
            violationCount={effectiveViolationCount}
            locked={interactionLocked}
            finalWarningThreshold={finalWarningThreshold}
            autoActionThreshold={autoActionThreshold}
            onClose={() => setShowFinalWarning(false)}
          />
        ) : null}

        {loading ? (
          <div className="pageStateCard">Loading questions...</div>
        ) : !result && lockdownBlocked ? (
          <div className="pageStateCard">
            Open this exam in the required lockdown client, then reload the page to start the attempt.
          </div>
        ) : !result ? (
          <>
            <section className="examSessionBar">
              <div>
                <span className="summaryLabel">Time remaining</span>
                <strong className={timeRemaining <= 300 ? "timerDanger" : ""}>{formatDuration(timeRemaining)}</strong>
                <small>Started {formatSavedAt(sessionTiming?.startedAt)}</small>
              </div>
              <div>
                <span className="summaryLabel">Progress</span>
                <strong>{answeredCount}/{questions.length}</strong>
                <small>{unansweredCount} unanswered, {flaggedCount} flagged</small>
              </div>
              <div>
                <span className="summaryLabel">Autosave</span>
                <strong>{formatSavedAt(savedAt || loadedDraftAt)}</strong>
                <small>{formatSaveState(saveState)}</small>
              </div>
            </section>

            <section className="examIntegrityStrip">
              <div>
                <strong>Guided session</strong>
                <span>{interactionLocked ? "Manual editing is locked by the exam integrity policy." : "Timer, autosave, review flags, and final submission are active."}</span>
              </div>
              <div>
                <strong>{sumPoints(questions)} pts</strong>
                <span>Total available points</span>
              </div>
            </section>

            <StudentJourneyValidationPanel
              questionsCount={questions.length}
              answeredCount={answeredCount}
              sessionTiming={sessionTiming}
              savedAt={savedAt || loadedDraftAt}
              saveState={saveState}
              lockdownBlocked={lockdownBlocked}
              integrityPolicy={integrityPolicy}
              fullscreenActive={fullscreenActive}
              networkOnline={networkOnline}
            />

            <section className="examSessionLayout">
              <div className="examQuestionStack">
                {questions.length ? (
                  questions.map((question, index) => (
                    <QuestionAnswerCard
                      key={question.id}
                      index={index}
                      question={question}
                      value={answers[question.id] || ""}
                      flagged={Boolean(flaggedQuestions[question.id])}
                      disabled={interactionLocked}
                      onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
                      onToggleFlag={() =>
                        setFlaggedQuestions((current) => ({
                          ...current,
                          [question.id]: !current[question.id],
                        }))
                      }
                    />
                  ))
                ) : (
                  <div className="emptyState">This exam has no questions yet.</div>
                )}
              </div>

              <aside className="examNavigator surfaceCard">
                <div className="sectionHeader">
                  <div>
                    <h3>Questions</h3>
                    <span className="small">{answeredCount} answered</span>
                  </div>
                </div>
                <div className="sectionBody">
                  <div className="examQuestionNav">
                    {questions.map((question, index) => (
                      <a
                        key={question.id}
                        className={getQuestionNavClass(answers[question.id], flaggedQuestions[question.id])}
                        href={`#question-${question.id}`}
                        title={flaggedQuestions[question.id] ? "Flagged for review" : "Question"}
                      >
                        {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function LockdownReadinessPanel({ readiness }) {
  const requiredClient = formatLockdownClient(readiness.allowedClient);
  const currentClient = formatLockdownClient(readiness.currentClient);

  return (
    <section className={`lockdownStudentPanel ${readiness.canStartAttempt ? "lockdownReady" : "lockdownBlocked"}`}>
      <div>
        <span className="summaryLabel">Lockdown readiness</span>
        <strong>{readiness.canStartAttempt ? "Ready to start" : "Protected client required"}</strong>
        <p>{readiness.message || "Exam client readiness was checked before starting this attempt."}</p>
      </div>
      <div className="lockdownReadinessGrid">
        <article>
          <span className="summaryLabel">Required client</span>
          <strong>{requiredClient}</strong>
        </article>
        <article>
          <span className="summaryLabel">Detected client</span>
          <strong>{currentClient}</strong>
        </article>
        <article>
          <span className="summaryLabel">Mode</span>
          <strong>{readiness.lockdownMode || "Advisory"}</strong>
        </article>
      </div>
    </section>
  );
}

function QuestionAnswerCard({ index, question, value, flagged, disabled, onChange, onToggleFlag }) {
  const parsed = parseTechnicalQuestion(question);
  const isTechnical = question.type === "SQL" || question.type === "CSharp";
  const isMcq = question.type === "MCQ";
  const options = Array.isArray(question.options) ? question.options : [];
  const answered = String(value || "").trim().length > 0;

  return (
    <article id={`question-${question.id}`} className="surfaceCard examQuestionCard">
      <div className="sectionHeader">
        <div>
          <span className="summaryLabel">Question {index + 1}</span>
          <h3>{formatQuestionType(question.type)}</h3>
        </div>
        <div className="questionHeaderActions">
          <span className={`statusPill ${answered ? "statusLive" : "statusDraft"}`}>{answered ? "Answered" : "Open"}</span>
          <button className={`btn btnCompact ${flagged ? "btnWarn" : ""}`} type="button" onClick={onToggleFlag} disabled={disabled}>
            {flagged ? "Flagged" : "Flag"}
          </button>
          <span className="statusPill statusDraft">{question.points ?? 0} pts</span>
        </div>
      </div>
      <div className="sectionBody">
        <div className="examPrompt">
          <p>{parsed.prompt || question.text || "(no question text)"}</p>
          {parsed.schema ? (
            <>
              <span className="summaryLabel">Schema / context</span>
              <pre>{parsed.schema}</pre>
            </>
          ) : null}
          {parsed.code ? (
            <>
              <span className="summaryLabel">Starter code</span>
              <pre>{parsed.code}</pre>
            </>
          ) : null}
        </div>
        {isMcq && options.length > 0 ? (
          <div className="examMcqOptions">
            {options.map((option) => (
              <label key={option} className={`examMcqOption${value === option ? " selected" : ""}`}>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={value === option}
                  onChange={(event) => onChange(event.target.value)}
                  disabled={disabled}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            className={`input textarea ${isTechnical ? "examCodeAnswer" : ""}`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={isTechnical ? "Write your solution here..." : "Type your answer here..."}
            disabled={disabled}
          />
        )}
      </div>
    </article>
  );
}

function IntegrityWarningBanner({ violationCount, effectiveViolationCount, locked, autoSubmitActive, autoActionCountdown, events, policy, fullscreenActive, networkOnline, onFullscreen }) {
  const latest = events[0];
  const policyAction = policy?.recommendedAction || policy?.RecommendedAction || "None";
  return (
    <section className={`integrityBanner ${locked ? "integrityBannerLocked" : violationCount >= 3 ? "integrityBannerWarn" : ""}`}>
      <div>
        <span className="summaryLabel">Exam integrity guard</span>
        <strong>
          {autoSubmitActive
            ? `Auto-submit ${autoActionCountdown == null ? "pending" : `in ${autoActionCountdown}s`}`
            : locked
              ? "Interaction locked"
              : `${effectiveViolationCount} warning${effectiveViolationCount === 1 ? "" : "s"}`}
        </strong>
        <p>
          {autoSubmitActive
            ? "The integrity policy threshold was reached. Your current answers will be submitted automatically for staff review."
            : locked
            ? "Too many integrity warnings were recorded. Contact staff before continuing."
            : latest?.message || "Stay in fullscreen, keep this tab active, and avoid copy/paste or right-click actions."}
        </p>
        <div className="integrityStatusGrid" aria-label="Exam integrity status">
          <span className={fullscreenActive ? "statusOk" : "statusWarn"}>{fullscreenActive ? "Fullscreen active" : "Fullscreen required"}</span>
          <span className={networkOnline ? "statusOk" : "statusWarn"}>{networkOnline ? "Online" : "Offline"}</span>
          <span className={policyAction === "None" ? "statusOk" : "statusWarn"}>{formatPolicyAction(policyAction)}</span>
        </div>
      </div>
      <button className="btn" type="button" onClick={onFullscreen} disabled={autoSubmitActive}>Fullscreen</button>
    </section>
  );
}

function FinalWarningModal({ violationCount, locked, finalWarningThreshold, autoActionThreshold, onClose }) {
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalCard integrityModal">
        <span className="summaryLabel">Final warning</span>
        <h3>{locked ? "Exam interaction is locked" : "Suspicious activity detected"}</h3>
        <p>
          {locked
            ? "The session reached the integrity policy action threshold. Your answers remain saved and the system may submit the attempt automatically for review."
            : `You have ${violationCount} integrity warnings. The final warning threshold is ${finalWarningThreshold}; at ${autoActionThreshold} warnings the exam is locked and submitted automatically.`}
        </p>
        <div className="heroActions">
          <button className="btn btnPrimary" type="button" onClick={onClose}>
            I understand
          </button>
        </div>
      </section>
    </div>
  );
}

function SubmitReviewPanel({ answeredCount, flaggedCount, questionsCount, submitting, timeRemaining, onCancel, onConfirm }) {
  const unanswered = questionsCount - answeredCount;

  return (
    <section className="submitReviewPanel">
      <div>
        <span className="summaryLabel">Final review</span>
        <h3>Ready to submit?</h3>
        <p>
          You answered {answeredCount} of {questionsCount} questions. {unanswered} unanswered and {flaggedCount} flagged for review.
        </p>
      </div>
      <div className="submitReviewMeta">
        <span>{formatDuration(timeRemaining)} remaining</span>
        <button className="btn" type="button" onClick={onCancel} disabled={submitting}>Keep working</button>
        <button className="btn btnPrimary examSubmitBtn" type="button" onClick={onConfirm} disabled={submitting}>
          {submitting ? "Submitting..." : "Confirm submit"}
        </button>
      </div>
    </section>
  );
}

function SubmissionResult({ result, answeredCount, questionsCount, onDone }) {
  const resultMessage = result.reason === "timer"
    ? "Submitted automatically when the timer ended."
    : result.reason === "integrity-policy"
      ? "Submitted automatically after the integrity policy threshold was reached."
      : "Your answers were submitted successfully.";

  return (
    <section className="surfaceCard">
      <div className="sectionHeader">
        <div>
          <h3>Exam submitted</h3>
          <span className="small">{resultMessage}</span>
        </div>
        <span className="statusPill statusLive">Done</span>
      </div>
      <div className="sectionBody">
        <div className="summaryStrip">
          <article className="summaryCard">
            <span className="summaryLabel">Status</span>
            <strong>Submitted</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Answered</span>
            <strong>{answeredCount}/{questionsCount}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Attempt</span>
            <strong>{String(result.examAttemptId || "").slice(0, 8) || "-"}</strong>
          </article>
        </div>
        <div className="pageStateCard examResultNotice">
          Your submission is saved. Scores and feedback become visible only after staff review and result publication.
        </div>
        <div className="heroActions examDoneActions">
          <button className="btn btnPrimary" type="button" onClick={onDone}>Return to exams</button>
          <Link className="btn" to="/results">View results queue</Link>
        </div>
      </div>
    </section>
  );
}

function StudentJourneyValidationPanel({
  questionsCount,
  answeredCount,
  sessionTiming,
  savedAt,
  saveState,
  lockdownBlocked,
  integrityPolicy,
  fullscreenActive,
  networkOnline,
}) {
  const items = [
    {
      label: "Attempt access",
      detail: lockdownBlocked ? "Blocked by lockdown readiness" : "Student can access this attempt",
      passed: !lockdownBlocked,
    },
    {
      label: "Questions",
      detail: questionsCount > 0 ? `${questionsCount} loaded` : "No questions loaded",
      passed: questionsCount > 0,
    },
    {
      label: "Timer",
      detail: sessionTiming?.expiresAt ? `Ends ${formatSavedAt(sessionTiming.expiresAt)}` : "No session timer",
      passed: Boolean(sessionTiming?.expiresAt),
    },
    {
      label: "Draft safety",
      detail: savedAt ? `${formatSaveState(saveState)} at ${formatSavedAt(savedAt)}` : "Waiting for first answer",
      passed: Boolean(savedAt) || answeredCount === 0,
    },
    {
      label: "Integrity",
      detail: `${fullscreenActive ? "Fullscreen active" : "Fullscreen available"}; ${networkOnline ? "online" : "offline"}`,
      passed: Boolean(integrityPolicy) || fullscreenActive || networkOnline,
    },
  ];

  return (
    <section className="studentJourneyPanel">
      <div className="sectionHeader">
        <div>
          <h3>Student journey validation</h3>
          <span className="sectionMeta">Use this panel during final testing to confirm the exam session is ready end to end.</span>
        </div>
        <span className="statusPill statusLive">{items.filter((item) => item.passed).length}/{items.length}</span>
      </div>
      <div className="studentJourneyGrid">
        {items.map((item) => (
          <article key={item.label} className={item.passed ? "journeyCheckPassed" : "journeyCheckWarn"}>
            <span>{item.passed ? "Ready" : "Check"}</span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function readDraft(storageKey) {
  if (!storageKey) return null;
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch {
    return null;
  }
}

function buildSessionTiming(exam, restored) {
  const now = Date.now();
  const restoredExpiry = Date.parse(restored?.expiresAt || "");
  if (Number.isFinite(restoredExpiry) && restoredExpiry > now) {
    return {
      startedAt: restored.startedAt || new Date(now).toISOString(),
      expiresAt: restored.expiresAt,
    };
  }

  const durationMinutes = Math.max(1, Number(exam?.durationMinutes || 60));
  return {
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + durationMinutes * 60 * 1000).toISOString(),
  };
}

function calculateRemainingSeconds(sessionTiming) {
  const end = Date.parse(sessionTiming?.expiresAt || "");
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - Date.now()) / 1000));
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatSavedAt(value) {
  if (!value) return "Waiting";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatSaveState(saveState) {
  if (saveState === "saving") return "Saving draft...";
  if (saveState === "error") return "Draft could not be saved on this device";
  if (saveState === "idle") return "Draft starts after your first change";
  return "Draft saved on this device";
}

function getQuestionNavClass(answer, flagged) {
  const classes = [];
  if (String(answer || "").trim()) classes.push("answered");
  if (flagged) classes.push("flagged");
  return classes.join(" ");
}

function sumPoints(questions) {
  return questions.reduce((total, question) => total + Number(question.points || 0), 0);
}

function getApiMessage(err, fallback) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message ||
    fallback;
}

function formatQuestionType(type) {
  if (type === "CSharp") return "C#";
  return type || "Answer";
}

function parseTechnicalQuestion(question) {
  const isTechnical = question.type === "CSharp" || question.type === "SQL";
  if (!isTechnical) {
    return { prompt: question.text || "", schema: "", code: "" };
  }

  const sections = String(question.text || "")
    .split(/\n---\n/g)
    .map((section) => section.trim())
    .filter(Boolean);

  const result = { prompt: "", schema: "", code: "" };
  for (const section of sections) {
    if (section.startsWith("Prompt:\n")) result.prompt = section.replace("Prompt:\n", "").trim();
    if (section.startsWith("Schema:\n")) result.schema = section.replace("Schema:\n", "").trim();
    if (section.startsWith("Starter SQL:\n")) result.code = section.replace("Starter SQL:\n", "").trim();
    if (section.startsWith("Starter C# code:\n")) result.code = section.replace("Starter C# code:\n", "").trim();
  }

  return result;
}

function createClientSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getIntegrityEventMessage(eventType) {
  const messages = {
    TabHidden: "Exam tab was hidden during the session.",
    WindowBlur: "Exam window lost focus.",
    FullscreenExit: "Fullscreen mode was exited.",
    CopyAttempt: "Copy action was attempted.",
    PasteAttempt: "Paste action was attempted.",
    RightClickAttempt: "Right-click was attempted.",
    ShortcutAttempt: "Restricted keyboard shortcut was attempted.",
    PrintAttempt: "Print action was attempted.",
    FullscreenRequestFailed: "Fullscreen mode could not be entered.",
    NetworkOffline: "Network connection was lost during the exam.",
  };
  return messages[eventType] || "Integrity warning was recorded.";
}

function formatPolicyAction(action) {
  if (!action || action === "None") return "Policy clear";
  if (action === "Warning") return "Policy warning";
  if (action === "FinalWarning") return "Final warning";
  if (action === "AutoSubmit") return "Auto action";
  return action;
}

function formatLockdownClient(value) {
  if (value === "SafeExamBrowser") return "Safe Exam Browser";
  if (value === "KioskClient") return "Kiosk client";
  return "Standard browser";
}
