import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getCurrentExamAttempt, getCurrentExamIntegritySummary, getExam, listQuestions, recordExamIntegrityEvent, saveExamAttemptDraft, submitExamAttempt } from "../../lib/examsApi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function StudentExamSessionPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isLiveSession = location.pathname.endsWith("/session");
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
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [integrityEvents, setIntegrityEvents] = useState([]);
  const [integrityPolicy, setIntegrityPolicy] = useState(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const submittedRef = useRef(false);
  const autoSubmitAttemptedRef = useRef(false);
  const clientSessionIdRef = useRef(createClientSessionId());
  const lastViolationRef = useRef({ key: "", at: 0 });
  const violationCount = integrityEvents.length;
  const serverViolationCount = Number(integrityPolicy?.attemptViolationCount || 0);
  const effectiveViolationCount = Math.max(violationCount, serverViolationCount);
  const finalWarningThreshold = Number(integrityPolicy?.finalWarningThreshold || 2);
  const autoActionThreshold = Number(integrityPolicy?.autoActionThreshold || 3);
  const shouldShowFinalWarning = Boolean(integrityPolicy?.shouldShowFinalWarning) || effectiveViolationCount >= finalWarningThreshold;
  const shouldAutoSubmit = Boolean(integrityPolicy?.shouldAutoSubmit) || effectiveViolationCount >= autoActionThreshold;
  const interactionLocked = Boolean(integrityPolicy?.shouldBlockInteraction) || shouldAutoSubmit;

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
        if (!active) return;

        setExam(examData);

        if (!isLiveSession) {
          const questionData = await listQuestions(examId).catch(() => []);
          if (!active) return;
          setQuestions(Array.isArray(questionData) ? questionData : []);
          setSessionTiming(null);
          setTimeRemaining(0);
          return;
        }

        const restored = readDraft(storageKey);
        const provisionalTiming = buildSessionTiming(examData, null, restored);
        setSessionTiming(provisionalTiming);
        setTimeRemaining(calculateRemainingSeconds(provisionalTiming));

        let attemptData = null;
        try {
          attemptData = await getCurrentExamAttempt(examId);
        } catch (err) {
          setError(getApiMessage(err, "The exam attempt could not be started, but the question list will still be checked."));
        }
        const [questionData, integritySummary] = await Promise.all([
          listQuestions(examId).catch(() => []),
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

        const timing = buildSessionTiming(examData, attemptData, restored);
        setSessionTiming(timing);
        setTimeRemaining(calculateRemainingSeconds(timing));

        const serverAnswers = Array.isArray(attemptData?.answers) ? mapAnswerListToState(attemptData.answers) : {};
        const restoredAnswers = restored?.answers && typeof restored.answers === "object" ? restored.answers : {};
        const nextAnswers = Object.keys(restoredAnswers).length > 0 ? { ...serverAnswers, ...restoredAnswers } : serverAnswers;
        if (Object.keys(nextAnswers).length > 0) {
          setAnswers(nextAnswers);
          setLoadedDraftAt(restored?.savedAt || attemptData?.lastSavedAt || "");
          setSavedAt(restored?.savedAt || attemptData?.lastSavedAt || "");
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
  }, [examId, isLiveSession, storageKey, user]);

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
      saveExamAttemptDraft(examId, {
        answers: Object.entries(answers).map(([questionId, response]) => ({
          questionId,
          response: String(response || "").trim(),
        })),
      })
        .then((draft) => {
          if (draft?.lastSavedAt) {
            setSavedAt(draft.lastSavedAt);
          }
          setSaveState("saved");
        })
        .catch(() => {
          setSaveState("error");
        });
    } catch {
      setSaveState("error");
    }
  }, [answers, examId, flaggedQuestions, result, sessionTiming, storageKey]);

  useEffect(() => {
    if (!isLiveSession || !storageKey || loading || result || !sessionTiming) return;

    setSaveState("saving");
    const timeout = window.setTimeout(() => persistDraft("saved"), 650);
    return () => window.clearTimeout(timeout);
  }, [answers, flaggedQuestions, isLiveSession, loading, persistDraft, result, sessionTiming, storageKey]);

  useEffect(() => {
    if (!isLiveSession || !storageKey || loading || result || !sessionTiming) return;

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
  }, [answers, isLiveSession, loading, persistDraft, result, sessionTiming, storageKey]);

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
    if (!isLiveSession || loading || result) return;

    window.history.pushState({ examLock: true }, "", window.location.href);
    setFullscreenActive(Boolean(document.fullscreenElement));

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        recordViolation("TAB_SWITCH", "Exam tab was hidden or the browser was minimized.");
      }
    }

    function onWindowBlur() {
      recordViolation("WINDOW_BLUR", "Exam window lost focus.");
    }

    function onFullscreenChange() {
      const active = Boolean(document.fullscreenElement);
      setFullscreenActive(active);
      if (!active) {
        recordViolation("EXIT_FULLSCREEN", "Fullscreen mode was exited.");
      }
    }

    function onBlockedInteraction(event) {
      event.preventDefault();
      const eventType = event.type === "contextmenu"
          ? "RIGHT_CLICK_ATTEMPT"
          : event.type === "copy"
            ? "COPY_ATTEMPT"
            : "PASTE_ATTEMPT";
      recordViolation(eventType, "Restricted browser interaction was attempted.");
    }

    function onKeyDown(event) {
      const key = event.key?.toLowerCase();
      const blockedCombo =
        (event.ctrlKey || event.metaKey) && ["c", "v", "x", "p", "s", "u", "a"].includes(key);
      const blockedDevtoolsCombo =
        (event.ctrlKey || event.metaKey) && event.shiftKey && ["i", "j", "c"].includes(key);
      const blockedBackCombo = event.altKey && key === "arrowleft";
      const blockedSystemKey = ["f12", "printscreen"].includes(key);
      if (!blockedCombo && !blockedDevtoolsCombo && !blockedBackCombo && !blockedSystemKey) return;

      event.preventDefault();
      const eventType =
        key === "p" || key === "printscreen"
          ? "PRINT_ATTEMPT"
          : blockedDevtoolsCombo || key === "f12" || key === "u"
            ? "DEVTOOLS_ATTEMPT"
            : blockedBackCombo
              ? "BACK_NAVIGATION"
              : "SHORTCUT_ATTEMPT";
      recordViolation(eventType, "Restricted keyboard shortcut was attempted.", {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      });
    }

    function onBeforePrint(event) {
      event.preventDefault?.();
      recordViolation("PRINT_ATTEMPT", "Print action was attempted during the exam.");
    }

    function onOffline() {
      setNetworkOnline(false);
      recordViolation("NETWORK_OFFLINE", "Network connection was lost during the exam.");
    }

    function onOnline() {
      setNetworkOnline(true);
    }

    function onPopState() {
      window.history.pushState({ examLock: true }, "", window.location.href);
      recordViolation("BACK_NAVIGATION", "Back navigation was attempted during the exam.");
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("popstate", onPopState);
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
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("contextmenu", onBlockedInteraction);
      document.removeEventListener("copy", onBlockedInteraction);
      document.removeEventListener("paste", onBlockedInteraction);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [isLiveSession, loading, recordViolation, result]);

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
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }
      localStorage.removeItem(storageKey);
      setShowSubmitReview(false);
      setResult({ ...submission, reason });
      navigate("/results", { replace: true });
    } catch (err) {
      submittedRef.current = false;
      setError(getApiMessage(err, "Failed to submit the exam."));
    } finally {
      setSubmitting(false);
    }
  }, [answers, examId, navigate, storageKey]);

  useEffect(() => {
    if (!isLiveSession || !shouldShowFinalWarning || result || loading) return;
    setShowFinalWarning(true);
  }, [isLiveSession, loading, result, shouldShowFinalWarning]);

  useEffect(() => {
    if (!isLiveSession || !shouldAutoSubmit || result || submitting || loading || questions.length === 0) {
      if (!shouldAutoSubmit) setAutoActionCountdown(null);
      return;
    }

    setShowSubmitReview(false);
    setShowFinalWarning(false);
    setAutoActionCountdown((current) => current ?? 5);
  }, [isLiveSession, loading, questions.length, result, shouldAutoSubmit, submitting]);

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
    if (isLiveSession && !loading && exam && questions.length > 0 && sessionTiming && timeRemaining === 0 && !result && !submitting) {
      submit("timer");
    }
  }, [exam, isLiveSession, loading, questions.length, result, sessionTiming, submit, submitting, timeRemaining]);

  useEffect(() => {
    if (questions.length === 0) {
      setActiveQuestionIndex(0);
      return;
    }

    setActiveQuestionIndex((current) => Math.min(current, questions.length - 1));
  }, [questions.length]);

  if (userLoading) return <div className="pageState">Loading session...</div>;
  if (!user) return <div className="pageState">{userError || "You must be signed in."}</div>;
  if (user.role !== "Student") return <div className="pageState">Only students can open an exam session.</div>;

  const answeredCount = questions.filter((question) => String(answers[question.id] || "").trim().length > 0).length;
  const flaggedCount = questions.filter((question) => flaggedQuestions[question.id]).length;
  const unansweredCount = questions.length - answeredCount;
  const activeQuestion = questions[activeQuestionIndex] || null;
  const isFirstQuestion = activeQuestionIndex === 0;
  const isLastQuestion = activeQuestionIndex >= questions.length - 1;
  const displayTimeRemaining = sessionTiming
    ? timeRemaining
    : Math.max(1, Number(exam?.durationMinutes || 60)) * 60;
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

  async function startLiveSession() {
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // The live session still opens; the integrity guard will ask again there.
      }
    }
    navigate(`/exams/${examId}/session`);
  }

  if (!isLiveSession) {
    return (
      <AppShell
        user={user}
        badge="Exam briefing"
        title={exam?.title || "Student exam"}
        subtitle={exam?.description || "Review the exam information before starting the secure session."}
        actions={<Link className="btn" to="/exams">Back to exams</Link>}
      >
        <div className="stackXl">
          {error ? <div className="alert">{error}</div> : null}
          {loading ? (
            <div className="pageStateCard">Loading exam information...</div>
          ) : (
            <>
              <section className="examBriefingHero">
                <div>
                  <span className="summaryLabel">Ready check</span>
                  <h2>{exam?.title || "Exam session"}</h2>
                  <p>
                    When you start, the exam opens in a focused fullscreen workspace. Questions are shown one by one,
                    answers are saved on this device, and the timer continues until submission.
                  </p>
                </div>
                <button className="btn btnPrimary examStartButton" type="button" onClick={startLiveSession}>
                  Start exam
                </button>
              </section>

              <section className="summaryStrip">
                <article className="summaryCard">
                  <span className="summaryLabel">Duration</span>
                  <strong>{exam?.durationMinutes || 60} min</strong>
                </article>
                <article className="summaryCard">
                  <span className="summaryLabel">Questions</span>
                  <strong>{questions.length}</strong>
                </article>
                <article className="summaryCard">
                  <span className="summaryLabel">Student</span>
                  <strong>{user.fullName || user.email}</strong>
                </article>
              </section>

              <section className="surfaceCard">
                <div className="sectionHeader">
                  <div>
                    <h3>Exam rules</h3>
                    <span className="small">These rules apply after you press Start exam.</span>
                  </div>
                </div>
                <div className="sectionBody">
                  <div className="examRulesGrid">
                    <article>
                      <strong>Stay on the exam page</strong>
                      <span>Leaving the tab, losing focus, print, copy, paste, and right-click actions are recorded.</span>
                    </article>
                    <article>
                      <strong>Use fullscreen</strong>
                      <span>The system requests fullscreen and warns if fullscreen is exited.</span>
                    </article>
                    <article>
                      <strong>Submit at the end</strong>
                      <span>The final question has a Finish and submit action. The timer also submits automatically.</span>
                    </article>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <div className="secureExamShell">
      <main className="secureExamMain">
        <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}

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
            onDone={async () => {
              if (document.fullscreenElement && document.exitFullscreen) {
                await document.exitFullscreen().catch(() => {});
              }
              navigate("/results");
            }}
          />
        ) : null}

        {showSubmitReview ? (
          <SubmitReviewPanel
            answeredCount={answeredCount}
            flaggedCount={flaggedCount}
            questionsCount={questions.length}
            submitting={submitting}
            timeRemaining={displayTimeRemaining}
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
        ) : !result ? (
          <>
            <section className="secureExamCommandBar">
              <div className="secureExamBrand secureExamBrandLight">
                <div className="secureExamLogo">ITM</div>
                <div>
                  <strong>ITM Exam</strong>
                  <span>{user.fullName || user.email}</span>
                </div>
              </div>
              <div className="secureExamStatus secureExamStatusLight">
                <span className="securePulse" />
                <strong>{shouldAutoSubmit ? "Submitting by policy" : "Exam in progress"}</strong>
              </div>
              <div className="secureTimerTile">
                <span>Time remaining</span>
                <strong className={displayTimeRemaining <= 300 ? "timerDanger" : ""}>{formatDuration(displayTimeRemaining)}</strong>
              </div>
            </section>

            <section className="secureExamWorkspace">
              <ExamRulesPanel />

              <div className="secureQuestionPanel">
                <div className="secureQuestionHeader">
                  <div>
                    <h2>{exam?.title || "Student exam"}</h2>
                    <span>Total Questions: {questions.length} | Total Points: {sumPoints(questions)}</span>
                  </div>
                </div>
                {activeQuestion ? (
                  <>
                    <QuestionAnswerCard
                      key={activeQuestion.id}
                      index={activeQuestionIndex}
                      question={activeQuestion}
                      value={answers[activeQuestion.id] || ""}
                      flagged={Boolean(flaggedQuestions[activeQuestion.id])}
                      disabled={interactionLocked}
                      onChange={(value) => setAnswers((current) => ({ ...current, [activeQuestion.id]: value }))}
                      onToggleFlag={() =>
                        setFlaggedQuestions((current) => ({
                          ...current,
                          [activeQuestion.id]: !current[activeQuestion.id],
                        }))
                      }
                    />
                    <div className="examQuestionStepper">
                      <button className="btn" type="button" onClick={() => setActiveQuestionIndex((current) => Math.max(0, current - 1))} disabled={isFirstQuestion}>
                        Previous
                      </button>
                      <span>
                        Question {activeQuestionIndex + 1} of {questions.length}
                      </span>
                      <button
                        className="btn btnPrimary"
                        type="button"
                        onClick={() => {
                          if (isLastQuestion) {
                            submit("completed");
                          } else {
                            setActiveQuestionIndex((current) => Math.min(questions.length - 1, current + 1));
                          }
                        }}
                        disabled={submitting || interactionLocked}
                      >
                        {isLastQuestion ? (submitting ? "Submitting..." : "Finish and submit") : "Next"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="emptyState">This exam has no questions yet.</div>
                )}
              </div>

              <aside className="secureQuestionNavigator">
                <div className="sectionHeader">
                  <div>
                    <h3>Questions</h3>
                    <span className="small">{answeredCount} answered, {unansweredCount} not answered</span>
                  </div>
                </div>
                <div className="sectionBody">
                  <div className="secureLegend">
                    <span><i className="legendAnswered" />Answered</span>
                    <span><i />Not answered</span>
                    <span><i className="legendFlagged" />Marked for review</span>
                  </div>
                  <div className="examQuestionNav">
                    {questions.map((question, index) => (
                      <button
                        type="button"
                        key={question.id}
                        className={`${getQuestionNavClass(answers[question.id], flaggedQuestions[question.id])}${index === activeQuestionIndex ? " active" : ""}`}
                        onClick={() => setActiveQuestionIndex(index)}
                        title={flaggedQuestions[question.id] ? "Flagged for review" : "Question"}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  <div className="secureSideStatus">
                    <span>Violations <strong>{effectiveViolationCount}</strong></span>
                    <span>Internet <strong>{networkOnline ? "Connected" : "Offline"}</strong></span>
                    <span>Autosave <strong>{formatSavedAt(savedAt || loadedDraftAt)}</strong></span>
                  </div>
                </div>
              </aside>
            </section>

            <SecureExamFooter
              fullscreenActive={fullscreenActive}
              startedAt={sessionTiming?.startedAt}
              saveState={saveState}
              warningText={effectiveViolationCount >= autoActionThreshold
                ? "Violation limit reached. Your exam is being submitted."
                : `${effectiveViolationCount}/${autoActionThreshold} violations recorded`}
              submitting={submitting}
              canSubmit={questions.length > 0 && !interactionLocked}
              onSubmit={() => setShowSubmitReview(true)}
              onExit={() => navigate("/exams")}
            />
          </>
        ) : null}
        </div>
      </main>
    </div>
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

function ExamRulesPanel() {
  const rules = [
    "Do not switch tabs or exit the exam window.",
    "Do not use external materials, books, notes, or other applications.",
    "Do not copy, paste, print, right-click, or use restricted shortcuts.",
    "Do not communicate with other people during the exam.",
    "Any violation may be logged and reviewed by staff.",
    "The exam is automatically submitted when time is up.",
  ];

  return (
    <aside className="secureRulesPanel">
      <h3>Exam Rules</h3>
      <div className="secureRulesList">
        {rules.map((rule, index) => (
          <div key={rule} className="secureRuleItem">
            <span>{index + 1}</span>
            <p>{rule}</p>
          </div>
        ))}
      </div>
      <label className="secureRulesConfirm">
        <input type="checkbox" checked readOnly />
        <span>I have read and understood the rules above.</span>
      </label>
    </aside>
  );
}

function SecureExamFooter({ fullscreenActive, startedAt, saveState, warningText, submitting, canSubmit, onSubmit, onExit }) {
  return (
    <footer className="secureExamFooter">
      <div className="secureFooterItem">
        <span>Protected session</span>
        <strong>Violations are logged and reported.</strong>
      </div>
      <div className="secureFooterItem">
        <span>Fullscreen</span>
        <strong>{fullscreenActive ? "Active" : "Required to continue"}</strong>
      </div>
      <div className="secureFooterItem">
        <span>Started at</span>
        <strong>{formatSavedAt(startedAt)}</strong>
      </div>
      <div className="secureFooterItem">
        <span>Autosave</span>
        <strong>{formatSaveState(saveState)}</strong>
      </div>
      <div className="secureFooterItem">
        <span>Integrity</span>
        <strong>{warningText}</strong>
      </div>
      <div className="secureFooterActions">
        <button className="btn" type="button" onClick={onExit}>
          Exit exam
        </button>
        <button className="btn btnDanger" type="button" onClick={onSubmit} disabled={submitting || !canSubmit}>
          {submitting ? "Submitting..." : "Submit exam"}
        </button>
      </div>
    </footer>
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
        </div>
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

function buildSessionTiming(exam, attempt, restored) {
  const now = Date.now();
  const serverExpiry = Date.parse(attempt?.expiresAt || "");
  if (Number.isFinite(serverExpiry)) {
    return {
      startedAt: attempt?.startedAt || new Date(now).toISOString(),
      expiresAt: new Date(serverExpiry).toISOString(),
    };
  }

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

function mapAnswerListToState(answers) {
  return answers.reduce((state, answer) => {
    if (answer?.questionId) {
      state[answer.questionId] = answer.response || "";
    }
    return state;
  }, {});
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
    TAB_SWITCH: "Exam tab was hidden or the browser was minimized.",
    WindowBlur: "Exam window lost focus.",
    WINDOW_BLUR: "Exam window lost focus.",
    FullscreenExit: "Fullscreen mode was exited.",
    EXIT_FULLSCREEN: "Fullscreen mode was exited.",
    CopyAttempt: "Copy action was attempted.",
    COPY_ATTEMPT: "Copy action was attempted.",
    PasteAttempt: "Paste action was attempted.",
    PASTE_ATTEMPT: "Paste action was attempted.",
    RightClickAttempt: "Right-click was attempted.",
    RIGHT_CLICK_ATTEMPT: "Right-click was attempted.",
    ShortcutAttempt: "Restricted keyboard shortcut was attempted.",
    SHORTCUT_ATTEMPT: "Restricted keyboard shortcut was attempted.",
    DEVTOOLS_ATTEMPT: "Developer tools or source viewing was attempted.",
    PrintAttempt: "Print action was attempted.",
    PRINT_ATTEMPT: "Print action was attempted.",
    FullscreenRequestFailed: "Fullscreen mode could not be entered.",
    FULLSCREEN_REQUEST_FAILED: "Fullscreen mode could not be entered.",
    NetworkOffline: "Network connection was lost during the exam.",
    NETWORK_OFFLINE: "Network connection was lost during the exam.",
    BACK_NAVIGATION: "Back navigation was attempted during the exam.",
  };
  return messages[eventType] || "Integrity warning was recorded.";
}

