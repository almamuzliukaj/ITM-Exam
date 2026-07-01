import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useFaceProctoring } from "../../hooks/useFaceProctoring";
import { getCurrentExamAttempt, getCurrentExamIntegritySummary, getExam, getExamAccessStatus, listQuestions, recordExamIntegrityEvent, requestExamApproval, requestExamDeviceChange, runTechnicalExamAnswer, sendExamHeartbeat, submitExamAttempt, verifyExamEntryCode } from "../../lib/examsApi";
import { loadProtectedPhotoUrl } from "../../lib/studentIdentityApi";
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
  const [saveState, setSaveState] = useState("idle");
  const [sessionTiming, setSessionTiming] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitReview, setShowSubmitReview] = useState(false);
  const [showFinalWarning, setShowFinalWarning] = useState(false);
  const [autoActionCountdown, setAutoActionCountdown] = useState(null);
  const [autoSubmitNotice, setAutoSubmitNotice] = useState(null);
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false);
  const [attemptId, setAttemptId] = useState("");
  const [technicalRunResults, setTechnicalRunResults] = useState({});
  const [runningQuestionId, setRunningQuestionId] = useState("");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [accessStatus, setAccessStatus] = useState(null);
  const [entryCode, setEntryCode] = useState("");
  const [entryPromptStarted, setEntryPromptStarted] = useState(false);
  const [verifyingEntryCode, setVerifyingEntryCode] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [integrityEvents, setIntegrityEvents] = useState([]);
  const [integrityPolicy, setIntegrityPolicy] = useState(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [sessionControlState, setSessionControlState] = useState(null);
  const submittedRef = useRef(false);
  const autoSubmitAttemptedRef = useRef(false);
  const autoSubmitSummaryRef = useRef(null);
  const clientSessionIdRef = useRef(createClientSessionId());
  const lastViolationRef = useRef({ key: "", at: 0 });
  const shortcutSuppressionUntilRef = useRef(0);
  const violationCount = integrityEvents.length;
  const serverViolationCount = Number(integrityPolicy?.attemptViolationCount || 0);
  const effectiveViolationCount = Math.max(violationCount, serverViolationCount);
  const finalWarningThreshold = Number(integrityPolicy?.finalWarningThreshold || 2);
  const autoActionThreshold = Number(integrityPolicy?.autoActionThreshold || 3);
  const shouldShowFinalWarning = Boolean(integrityPolicy?.shouldShowFinalWarning) || effectiveViolationCount >= finalWarningThreshold;
  const shouldAutoSubmit = Boolean(integrityPolicy?.shouldAutoSubmit) || effectiveViolationCount >= autoActionThreshold;
  const interactionLocked = Boolean(integrityPolicy?.shouldBlockInteraction) || shouldAutoSubmit;
  const waitingForApproval = ["ApprovalRequested", "WaitingForPhysicalVerification", "DeviceChangeRequested"].includes(accessStatus?.accessStatus);
  const approvalRejected = accessStatus?.accessStatus === "Rejected";
  const sessionRemoved = sessionControlState?.accessStatus === "Removed";
  const sessionRejected = sessionControlState?.accessStatus === "Rejected";

  const storageKey = useMemo(() => {
    const userKey = user?.id || user?.email || "student";
    return examId ? `online-exam-session:${userKey}:${examId}` : "";
  }, [examId, user?.email, user?.id]);

  const clientSessionStorageKey = useMemo(() => (storageKey ? `${storageKey}:client-session` : ""), [storageKey]);

  useEffect(() => {
    if (!clientSessionStorageKey) return;

    const existing = localStorage.getItem(clientSessionStorageKey);
    if (existing) {
      clientSessionIdRef.current = existing;
      return;
    }

    localStorage.setItem(clientSessionStorageKey, clientSessionIdRef.current);
  }, [clientSessionStorageKey]);

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
        const accessData = await getExamAccessStatus(examId).catch((err) => {
          throw err;
        });
        if (!active) return;
        setAccessStatus(accessData);
        if (accessData?.accessStatus === "Submitted") {
          submittedRef.current = true;
          setQuestions([]);
          setSessionTiming(null);
          setTimeRemaining(0);
          setResult({ reason: "submitted-lock", examAttemptId: "" });
          setLoading(false);
          return;
        }

        if (!isLiveSession) {
          setQuestions([]);
          setSessionTiming(null);
          setTimeRemaining(0);
          return;
        }

        const restored = readDraft(storageKey);
        const provisionalTiming = buildSessionTiming(examData, restored);
        setSessionTiming(provisionalTiming);
        setTimeRemaining(calculateRemainingSeconds(provisionalTiming));

        const clientSessionId = clientSessionIdRef.current;
        const attemptData = await getCurrentExamAttempt(examId, clientSessionId);
        const [questionData, integritySummary] = await Promise.all([
          listQuestions(examId, clientSessionId),
          getCurrentExamIntegritySummary(examId, clientSessionId).catch(() => null),
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

        const timing = buildSessionTiming(examData, restored, attemptData);
        setSessionTiming(timing);
        setTimeRemaining(calculateRemainingSeconds(timing));

        if (restored?.answers && typeof restored.answers === "object") {
          setAnswers(restored.answers);
        }
        if (restored?.flaggedQuestions && typeof restored.flaggedQuestions === "object") {
          setFlaggedQuestions(restored.flaggedQuestions);
        }

        if (restored?.technicalRunResults && typeof restored.technicalRunResults === "object") {
          setTechnicalRunResults(restored.technicalRunResults);
        }
        if (restored?.savedAt) {
          setSavedAt(restored.savedAt);
        }
      } catch (err) {
        const code = err?.response?.data?.code;
        const message = getApiMessage(err, "Failed to load the exam session.");
        if (active && (code === "EXAM_ATTEMPT_ALREADY_SUBMITTED" || code === "EXAM_TIME_EXPIRED" || message.toLowerCase().includes("already submitted"))) {
          submittedRef.current = true;
          setQuestions([]);
          setResult({ reason: "submitted-lock", examAttemptId: "" });
          setError("");
        } else if (active) {
          setError(message);
        }
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
    if (isLiveSession) return;
    setQuestions([]);
    setAnswers({});
    setFlaggedQuestions({});
    setActiveQuestionIndex(0);
    setAttemptId("");
    setIntegrityEvents([]);
    setIntegrityPolicy(null);
    setResult(null);
    setShowSubmitReview(false);
    setShowFinalWarning(false);
    setAutoActionCountdown(null);
    setAutoSubmitNotice(null);
    setAutoSubmitFailed(false);
    autoSubmitSummaryRef.current = null;
    submittedRef.current = false;
    autoSubmitAttemptedRef.current = false;
  }, [isLiveSession]);

  useEffect(() => {
    if (!isLiveSession || questions.length === 0) return;

    setAnswers((current) => {
      let changed = false;
      const next = { ...current };

      questions.forEach((question) => {
        if (question.type !== "SQL" && question.type !== "CSharp") return;
        if (isAnswerFilled(next[question.id])) return;

        const starterCode = parseTechnicalQuestion(question).code;
        if (!starterCode) return;

        next[question.id] = starterCode;
        changed = true;
      });

      return changed ? next : current;
    });
  }, [isLiveSession, questions]);

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
    const normalizedType = normalizeIntegrityEventType(eventType);
    const key = normalizedType;
    if (lastViolationRef.current.key === key && nowMs - lastViolationRef.current.at < 2500) {
      return;
    }
    lastViolationRef.current = { key, at: nowMs };

    setIntegrityEvents((current) => {
      const nextCount = current.length + 1;
      const occurredAt = new Date().toISOString();
      const nextEvent = {
        eventType: normalizedType,
        message,
        createdAt: occurredAt,
        violationCount: nextCount,
      };

      setShowFinalWarning(true);

      recordExamIntegrityEvent(examId, {
        examAttemptId: attemptId || null,
        eventType: normalizedType,
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
  }, [attemptId, examId, result]);

  const faceProctoring = useFaceProctoring({
    enabled: isLiveSession && !loading && !result,
    onViolation: recordViolation,
  });

  useEffect(() => {
    if (!isLiveSession || loading || result) return;

    window.history.pushState({ examLock: true }, "", window.location.href);
    setFullscreenActive(Boolean(document.fullscreenElement));

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        recordViolation("TAB_SWITCH", "Exam tab was hidden during the session.");
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
      const nowMs = Date.now();
      if (["copy", "cut", "paste"].includes(event.type) && nowMs < shortcutSuppressionUntilRef.current) {
        return;
      }

      const eventType = event.type === "contextmenu"
          ? "RIGHT_CLICK_ATTEMPT"
          : event.type === "copy"
            ? "COPY_ATTEMPT"
            : event.type === "cut"
              ? "CUT_ATTEMPT"
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
      shortcutSuppressionUntilRef.current = Date.now() + 900;
      const eventType =
        key === "p" || key === "printscreen"
          ? "PRINT_ATTEMPT"
          : key === "c" && (event.ctrlKey || event.metaKey) && !event.shiftKey
            ? "COPY_ATTEMPT"
            : key === "v" && (event.ctrlKey || event.metaKey) && !event.shiftKey
              ? "PASTE_ATTEMPT"
              : key === "x" && (event.ctrlKey || event.metaKey) && !event.shiftKey
                ? "CUT_ATTEMPT"
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
    document.addEventListener("cut", onBlockedInteraction);
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
      document.removeEventListener("cut", onBlockedInteraction);
      document.removeEventListener("paste", onBlockedInteraction);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [isLiveSession, loading, recordViolation, result]);

  const submit = useCallback(async (reason = "manual", options = {}) => {
    if (!examId || submittedRef.current) return false;

    try {
      submittedRef.current = true;
      setSubmitting(true);
      setError("");
      const payload = {
        answers: Object.entries(answers).map(([questionId, response]) => ({
          questionId,
          response: String(response || "").trim(),
        })),
        clientSessionId: clientSessionIdRef.current,
      };
      const submission = await submitExamAttempt(examId, payload);
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }
      localStorage.removeItem(storageKey);
      if (clientSessionStorageKey) {
        localStorage.removeItem(clientSessionStorageKey);
      }
      setQuestions([]);
      setAnswers({});
      setFlaggedQuestions({});
      setActiveQuestionIndex(0);
      setAttemptId("");
      setIntegrityEvents([]);
      setIntegrityPolicy(null);
      setShowSubmitReview(false);
      setShowFinalWarning(false);
      setAutoActionCountdown(null);
      setAutoSubmitNotice(null);
      setAutoSubmitFailed(false);
      const nextResult = { ...submission, reason, integritySummary: reason === "integrity-policy" ? autoSubmitSummaryRef.current : null };
      setResult(nextResult);

      if (options.redirectToExams) {
        window.setTimeout(() => navigate("/exams", { state: { submitted: true, reason } }), 1200);
      }


      return true;
    } catch (err) {
      submittedRef.current = false;
      setAutoActionCountdown(null);
      setAutoSubmitNotice(null);
      setShowFinalWarning(false);
      if (reason === "integrity-policy") {
        setAutoSubmitFailed(true);
      }
      setError(getApiMessage(err, "Failed to submit the exam."));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [answers, clientSessionStorageKey, examId, navigate, storageKey]);

  const runIntegrityAutoSubmit = useCallback(async () => {
    if (autoSubmitAttemptedRef.current || submittedRef.current) return;
    autoSubmitAttemptedRef.current = true;
    persistDraft("saved");
    const submitted = await submit("integrity-policy", { redirectToExams: true });
    if (!submitted) {
      autoSubmitAttemptedRef.current = false;
    }
  }, [persistDraft, submit]);

  useEffect(() => {
    if (!shouldShowFinalWarning || result || loading) return;
    setShowFinalWarning(true);
  }, [loading, result, shouldShowFinalWarning]);

  useEffect(() => {
    if (!shouldAutoSubmit || result || submitting || loading || autoSubmitFailed) {
      if (!shouldAutoSubmit) {
        setAutoActionCountdown(null);
        setAutoSubmitNotice(null);
        autoSubmitSummaryRef.current = null;
      }
      return;
    }

    setShowSubmitReview(false);
    setShowFinalWarning(false);
    const latestEvent = integrityEvents[0];
    const notice = {
      violationCount: effectiveViolationCount,
      threshold: autoActionThreshold,
      latestType: latestEvent?.type || latestEvent?.eventType || "INTEGRITY_POLICY",
      latestMessage: latestEvent?.message || "The exam integrity policy threshold was reached.",
      timestamp: latestEvent?.timestamp || new Date().toISOString(),
    };
    autoSubmitSummaryRef.current = notice;
    setAutoSubmitNotice(notice);
    setAutoActionCountdown(0);
    runIntegrityAutoSubmit();
  }, [autoActionThreshold, autoSubmitFailed, effectiveViolationCount, integrityEvents, loading, result, runIntegrityAutoSubmit, shouldAutoSubmit, submitting]);

  useEffect(() => {
    if (autoActionCountdown == null || result || submitting) return;

    if (autoActionCountdown <= 0) {
      runIntegrityAutoSubmit();
      return;
    }

    const timer = window.setTimeout(() => {
      setAutoActionCountdown((current) => (current == null ? current : current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [autoActionCountdown, result, runIntegrityAutoSubmit, submitting]);

  useEffect(() => {
    if (!loading && exam && questions.length > 0 && sessionTiming && timeRemaining === 0 && !result && !submitting) {
      submit("timer");
    }
  }, [exam, loading, questions.length, result, sessionTiming, submit, submitting, timeRemaining]);

  useEffect(() => {
    if (questions.length === 0) {
      setActiveQuestionIndex(0);
      return;
    }

    setActiveQuestionIndex((current) => Math.min(current, questions.length - 1));
  }, [questions.length]);

  useEffect(() => {
    if (!examId || !isLiveSession || result || submitting || sessionControlState) return;

    let active = true;
    const syncSession = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setNetworkOnline(false);
        return;
      }

      try {
        const updated = await sendExamHeartbeat(examId, clientSessionIdRef.current);
        if (!active) return;
        setAccessStatus(updated);
        setNetworkOnline(true);

        if (updated?.requiresCode && !updated?.hasAccess) {
          setSessionControlState(updated);
          setShowSubmitReview(false);
          setShowFinalWarning(false);
          if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen().catch(() => {});
          }
          if (updated.accessStatus === "Removed" || updated.accessStatus === "Rejected") {
            persistDraft("saved");
            await submit("access-revoked", { redirectToExams: true });
          }
        }
      } catch (err) {
        if (!active) return;
        if (!err?.response) {
          setNetworkOnline(false);
        } else {
          setError(getApiMessage(err, "Live session synchronization failed."));
        }
      }
    };

    syncSession();
    const timer = window.setInterval(syncSession, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [examId, isLiveSession, persistDraft, result, sessionControlState, submit, submitting]);

  useEffect(() => {
    if (!examId || isLiveSession || !accessStatus?.requiresCode || accessStatus?.hasAccess) return;
    if (!["ApprovalRequested", "WaitingForPhysicalVerification", "DeviceChangeRequested", "Rejected"].includes(accessStatus?.accessStatus)) return;

    let active = true;
    const refreshAccessStatus = async () => {
      try {
        const updated = await getExamAccessStatus(examId);
        if (active) setAccessStatus(updated);
      } catch {
        // Keep the waiting screen stable; the next poll will retry.
      }
    };

    const timer = window.setInterval(refreshAccessStatus, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [accessStatus?.accessStatus, accessStatus?.hasAccess, accessStatus?.requiresCode, examId, isLiveSession]);

  if (userLoading) return <div className="pageState">Loading session...</div>;
  if (!user) return <div className="pageState">{userError || "You must be signed in."}</div>;
  if (user.role !== "Student") return <div className="pageState">Only students can open an exam session.</div>;

  const answeredCount = questions.filter((question) => isAnswerFilled(answers[question.id])).length;
  const flaggedCount = questions.filter((question) => flaggedQuestions[question.id]).length;
  const unansweredCount = questions.length - answeredCount;
  const progressPercent = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const activeQuestion = questions[activeQuestionIndex] || null;
  const isFirstQuestion = activeQuestionIndex === 0;
  const isLastQuestion = activeQuestionIndex >= questions.length - 1;

  async function startLiveSession() {
    setError("");
    if (accessStatus?.requiresCode && !accessStatus?.hasAccess) {
      setEntryPromptStarted(true);
      if (waitingForApproval) {
        setError("Wait for professor approval before starting this exam. The timer has not started.");
      }
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      setError("Camera permission was not granted. The exam can start, but this will be recorded as an integrity warning.");
    }

    await enterFullscreen();

    navigate(`/exams/${examId}/session`);
  }

  async function enterFullscreen() {
    if (!document.fullscreenEnabled || document.fullscreenElement) return;

    try {
      await document.documentElement.requestFullscreen();
    } catch {
      if (isLiveSession) {
        await recordViolation("FullscreenRequestFailed", "Fullscreen mode could not be entered.");
      }
    }
  }

  async function verifyEntryCode() {
    if (!examId || verifyingEntryCode) return;

    try {
      setVerifyingEntryCode(true);
      setError("");
      const updatedAccess = await verifyExamEntryCode(examId, entryCode);
      setAccessStatus(updatedAccess);
      setEntryPromptStarted(true);
      setEntryCode("");
    } catch (err) {
      setError(getApiMessage(err, "The entry code could not be verified."));
    } finally {
      setVerifyingEntryCode(false);
    }
  }

  async function requestProfessorApproval() {
    if (!examId || requestingApproval) return;

    try {
      setRequestingApproval(true);
      setError("");
      const updatedAccess = await requestExamApproval(examId, "Student requested manual admission from the exam briefing page.");
      setAccessStatus(updatedAccess);
    } catch (err) {
      setError(getApiMessage(err, "Approval request could not be sent."));
    } finally {
      setRequestingApproval(false);
    }
  }

  async function requestDeviceChangeApproval() {
    if (!examId || requestingApproval) return;

    try {
      setRequestingApproval(true);
      setError("");
      const updatedAccess = await requestExamDeviceChange(examId, "Student requested device change approval from the exam session.");
      setAccessStatus(updatedAccess);
      setSessionControlState(updatedAccess);
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch (err) {
      setError(getApiMessage(err, "Device change request could not be sent."));
    } finally {
      setRequestingApproval(false);
    }
  }

  async function runTechnicalAnswer(question) {
    if (!examId || !question?.id || interactionLocked) return;

    try {
      setRunningQuestionId(question.id);
      setError("");
      const response = String(answers[question.id] || "");
      const runResult = await runTechnicalExamAnswer(examId, question.id, {
        attemptId: attemptId || null,
        questionId: question.id,
        response,
        clientSessionId: clientSessionIdRef.current,
      });

      setTechnicalRunResults((current) => ({
        ...current,
        [question.id]: runResult,
      }));
      setSavedAt(runResult?.executedAt || new Date().toISOString());
      setSaveState("saved");
    } catch (err) {
      const message = getApiMessage(err, "Technical answer could not be run.");
      setTechnicalRunResults((current) => ({
        ...current,
        [question.id]: {
          status: "Error",
          errors: message,
          output: "",
          notes: "Run failed before the answer could be evaluated.",
          executedAt: new Date().toISOString(),
          testResults: [],
        },
      }));
    } finally {
      setRunningQuestionId("");
    }
  }

  if (!isLiveSession) {
    return (
      <AppShell
        user={user}
        badge="Exam briefing"
        title={exam?.title || "Student exam"}
        subtitle={exam?.description || "Review the rules and start only when you are ready for the monitored session."}
        actions={<Link className="btn" to="/exams">Back to exams</Link>}
      >
        <div className="stackXl">
          {error ? <div className="alert">{error}</div> : null}
          {location.state?.submitted ? (
            <div className="successBanner">
              Exam submitted successfully. You are back in the normal application view.
            </div>
          ) : null}
          {result?.reason === "submitted-lock" ? (
            <SubmissionResult
              result={result}
              answeredCount={0}
              questionsCount={0}
              onDone={() => navigate("/exams")}
            />
          ) : loading ? (
            <div className="pageStateCard">Loading exam information...</div>
          ) : (
            <>
              {accessStatus?.requiresCode ? (
                entryPromptStarted || waitingForApproval || approvalRejected || accessStatus?.hasAccess ? (
                  <ExamEntryCodePanel
                    accessStatus={accessStatus}
                    entryCode={entryCode}
                    verifying={verifyingEntryCode}
                    requestingApproval={requestingApproval}
                    onEntryCodeChange={setEntryCode}
                    onVerify={verifyEntryCode}
                    onRequestApproval={requestProfessorApproval}
                  />
                ) : null
              ) : null}
              {waitingForApproval ? (
                <ApprovalWaitingPanel accessStatus={accessStatus} />
              ) : null}
              {approvalRejected ? (
                <ApprovalRejectedPanel accessStatus={accessStatus} onRequestAgain={requestProfessorApproval} requesting={requestingApproval} />
              ) : null}
              <section className="examBriefingHero">
                <div>
                  <span className="summaryLabel">Secure exam entry</span>
                  <h2>{exam?.title || "Exam session"}</h2>
                  <p>
                    This exam opens in fullscreen, shows one question at a time, blocks restricted browser actions,
                    monitors integrity events, and automatically submits if the violation limit is reached.
                  </p>
                </div>
                <button className="btn btnPrimary examStartButton" type="button" onClick={startLiveSession} disabled={waitingForApproval}>
                  {accessStatus?.requiresCode && !accessStatus?.hasAccess
                    ? "Start"
                    : accessStatus?.hasAccess
                      ? "Start exam"
                      : "Start exam"}
                </button>
              </section>

              <section className="summaryStrip">
                <article className="summaryCard">
                  <span className="summaryLabel">Duration</span>
                  <strong>{exam?.durationMinutes || 60} min</strong>
                </article>
                <article className="summaryCard">
                  <span className="summaryLabel">Questions</span>
                  <strong>Hidden until start</strong>
                </article>
                <article className="summaryCard">
                  <span className="summaryLabel">Monitoring</span>
                  <strong>Fullscreen + camera</strong>
                </article>
                <article className="summaryCard">
                  <span className="summaryLabel">Violation policy</span>
                  <strong>3 warnings submit</strong>
                </article>
              </section>

              <section className="surfaceCard">
                <div className="sectionHeader">
                  <div>
                    <h3>Exam rules</h3>
                    <span className="small">Read these before entering the monitored workspace.</span>
                  </div>
                </div>
                <div className="sectionBody">
                  <div className="examRulesGrid">
                    <article>
                      <strong>Stay in the exam</strong>
                      <span>Do not switch tabs, minimize the browser, go back, or open another application.</span>
                    </article>
                    <article>
                      <strong>Keep camera visibility</strong>
                      <span>Your face should remain visible. Missing or multiple faces are recorded as violations.</span>
                    </article>
                    <article>
                      <strong>No restricted actions</strong>
                      <span>Copy, paste, right-click, print, devtools, and source-view shortcuts are blocked.</span>
                    </article>
                    <article>
                      <strong>Automatic submission</strong>
                      <span>The exam submits when time expires or when the integrity policy threshold is reached.</span>
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
      <header className="secureExamHeader">
        <div className="secureExamBrand">
          <div className="secureExamLogo">ITM</div>
          <div>
            <strong>ITM Exam</strong>
            <span>{exam?.title || "Student exam"}</span>
          </div>
        </div>
        <div className="secureExamStatus">
          <span className="securePulse" />
          <strong>{shouldAutoSubmit ? `Auto-submit ${autoActionCountdown ?? ""}` : "Exam in progress"}</strong>
        </div>
        <div className="secureTimerTile">
          <span>Time remaining</span>
          <strong className={timeRemaining <= 300 ? "timerDanger" : ""}>{formatDuration(timeRemaining)}</strong>
        </div>
        <div className="secureTimerTile">
          <span>Violations</span>
          <strong>{effectiveViolationCount}/{autoActionThreshold}</strong>
        </div>
        <SecureExamIdentityBanner
          identity={accessStatus?.studentIdentity}
          fallbackUser={user}
          cameraStatus={faceProctoring.status}
        />
      </header>

      <main className="secureExamMain">
        {error ? <div className="alert">{error}</div> : null}

        {!networkOnline && !result ? (
          <LiveSessionStatePanel
            tone="warning"
            title="Temporarily offline"
            message="Your connection is offline. Stay on this screen; saved answers remain on this device and synchronization will retry automatically."
            detail="Do not close the exam window."
          />
        ) : null}

        {sessionControlState ? (
          <LiveSessionStatePanel
            tone={sessionRemoved || sessionRejected ? "danger" : "warning"}
            title={sessionRemoved ? "Removed by professor" : sessionRejected ? "Admission rejected" : sessionControlState.accessStatus === "DeviceChangeRequested" ? "Device change pending" : "Session paused"}
            message={sessionControlState.message || "Your live exam access changed. The exam workspace has been closed for review."}
            detail={sessionControlState.approvalReason || "Contact your professor before trying to re-enter."}
            actionLabel={sessionRemoved || sessionRejected ? "Return to exams" : "Request device change"}
            onAction={sessionRemoved || sessionRejected ? () => navigate("/exams") : requestDeviceChangeApproval}
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

        {autoSubmitNotice && autoActionCountdown != null && !result && submitting ? (
          <AutoSubmitNoticeModal
            notice={autoSubmitNotice}
            countdown={autoActionCountdown}
            submitting={submitting}
          />
        ) : null}

        {sessionControlState ? null : loading ? (
          <div className="pageStateCard">Loading questions...</div>
        ) : result ? (
          <SubmissionResult
            result={result}
            answeredCount={answeredCount}
            questionsCount={questions.length}
            onDone={() => navigate("/exams")}
          />
        ) : (
          <>
            <section className="secureExamNotice">
              <span className="secureNoticeItem">{fullscreenActive ? "Fullscreen active" : "Fullscreen exited"}</span>
              <span className="secureNoticeItem">{networkOnline ? "Online" : "Connection lost"}</span>
              <span className="secureNoticeItem">{savedAt ? `${formatSaveState(saveState)} ${formatSavedAt(savedAt)}` : formatSaveState(saveState)}</span>
              {!fullscreenActive ? (
                <button className="btn btnCompact" type="button" onClick={enterFullscreen} disabled={submitting || Boolean(result)}>
                  Return to fullscreen
                </button>
              ) : null}
              <strong>{answeredCount}/{questions.length} answered</strong>
            </section>

            <section className="secureExamWorkspace secureExamWorkspaceFocused">
              <div className="secureQuestionPanel">
                {activeQuestion ? (
                  <>
                    <div className="secureQuestionHeader">
                      <div>
                        <span className="summaryLabel">Question {activeQuestionIndex + 1} of {questions.length}</span>
                        <h2>Answer question {activeQuestionIndex + 1}</h2>
                      </div>
                      <span className="statusPill statusDraft">{activeQuestion.points ?? 0} pts</span>
                    </div>
                    <QuestionAnswerCard
                      key={activeQuestion.id}
                      index={activeQuestionIndex}
                      question={activeQuestion}
                      value={answers[activeQuestion.id] || ""}
                      running={runningQuestionId === activeQuestion.id}
                      flagged={Boolean(flaggedQuestions[activeQuestion.id])}
                      runResult={technicalRunResults[activeQuestion.id] || null}
                      disabled={submitting || interactionLocked}
                      onChange={(value) => setAnswers((current) => ({ ...current, [activeQuestion.id]: value }))}
                      onRun={() => runTechnicalAnswer(activeQuestion)}
                      onToggleFlag={() =>
                        setFlaggedQuestions((current) => ({
                          ...current,
                          [activeQuestion.id]: !current[activeQuestion.id],
                        }))
                      }
                    />
                    <div className="examQuestionStepper">
                      <button className="btn" type="button" onClick={() => setActiveQuestionIndex((current) => Math.max(0, current - 1))} disabled={isFirstQuestion || submitting}>
                        Previous
                      </button>
                      <span>{unansweredCount} unanswered / {flaggedCount} flagged</span>
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
                  <div className="emptyState">
                    <strong>No questions are attached.</strong>
                    <span>This exam cannot be completed until staff attach at least one question.</span>
                  </div>
                )}
              </div>

              <aside className="secureQuestionNavigator">
                <FaceProctoringPanel proctoring={faceProctoring} />
                <div className="sectionBody">
                  <div className="examNavigatorProgress" aria-label={`Exam progress ${progressPercent}%`}>
                    <span style={{ width: `${progressPercent}%` }} />
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
                  <button
                    className="btn btnDanger btnBlock examNavigatorSubmit"
                    type="button"
                    onClick={() => setShowSubmitReview(true)}
                    disabled={submitting || questions.length === 0 || interactionLocked}
                  >
                    Submit exam
                  </button>
                </div>
              </aside>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StudentExamFocusPanel({
  exam,
  user,
  attemptId,
  progressPercent,
  answeredCount,
  questionsCount,
  unansweredCount,
  flaggedCount,
  saveState,
  savedAt,
  networkOnline,
  fullscreenActive,
  interactionLocked,
}) {
  const studentName = user?.fullName || user?.name || user?.email || "Student";
  const attemptLabel = attemptId ? String(attemptId).slice(0, 8) : "Pending";
  const saveLabel = savedAt ? formatSavedAt(savedAt) : "Waiting for first save";

  return (
    <section className="studentExamFocusPanel" aria-label="Exam focus summary">
      <div className="studentExamFocusHeader">
        <div>
          <span className="summaryLabel">Focused exam workspace</span>
          <h3>{exam?.title || "Student exam"}</h3>
          <p>{studentName} · Attempt {attemptLabel}</p>
        </div>
        <div className="studentExamFocusScore">
          <strong>{progressPercent}%</strong>
          <span>{answeredCount}/{questionsCount} answered</span>
        </div>
      </div>

      <div className="studentExamProgressTrack" aria-hidden="true">
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="studentExamFocusGrid">
        <article>
          <span className="summaryLabel">Remaining work</span>
          <strong>{unansweredCount} unanswered</strong>
          <small>{flaggedCount} question(s) flagged for review</small>
        </article>
        <article>
          <span className="summaryLabel">Autosave</span>
          <strong>{formatSaveState(saveState)}</strong>
          <small>{saveLabel}</small>
        </article>
        <article>
          <span className="summaryLabel">Exam safety</span>
          <strong>{networkOnline ? "Online" : "Connection lost"}</strong>
          <small>{fullscreenActive ? "Fullscreen is active" : "Fullscreen is not active"}</small>
        </article>
        <article>
          <span className="summaryLabel">Policy state</span>
          <strong>{interactionLocked ? "Locked" : "Active"}</strong>
          <small>{interactionLocked ? "Submit review is controlled by policy" : "You can continue answering"}</small>
        </article>
      </div>
    </section>
  );
}

function FaceProctoringPanel({ proctoring }) {
  const { videoRef, status, faceCount, error } = proctoring;
  const statusLabel = {
    idle: "Camera waiting",
    requesting: "Requesting camera",
    loading: "Loading detector",
    active: "Camera active",
    blocked: "Camera blocked",
    error: "Camera check error",
  }[status] || "Camera waiting";

  return (
    <section className={`faceProctoringPanel ${status === "active" ? "faceProctoringActive" : "faceProctoringWarn"}`}>
      <div>
        <span className="summaryLabel">Camera integrity</span>
        <strong>{statusLabel}</strong>
        <p>{error || "Keep your face visible."}</p>
      </div>
      <div className="faceProctoringPreview">
        <video ref={videoRef} muted playsInline aria-label="Exam camera preview" />
        <span>{faceCount === 1 ? "1 face visible" : `${faceCount} faces visible`}</span>
      </div>
    </section>
  );
}

function QuestionAnswerCard({ index, question, value, flagged, runResult, running, disabled, onChange, onRun, onToggleFlag }) {
  const parsed = parseTechnicalQuestion(question);
  const isTechnical = question.type === "SQL" || question.type === "CSharp";
  const isMcq = question.type === "MCQ";
  const isMultiAnswerMcq = isMcq && Number(question.correctAnswerCount || 1) > 1;
  const options = Array.isArray(question.options) ? question.options : [];
  const selectedOptions = parseSelectedOptions(value);
  const answered = isAnswerFilled(value);

  return (
    <article id={`question-${question.id}`} className="surfaceCard examQuestionCard">
      <div className="sectionHeader">
        <div>
          <span className="summaryLabel">Question {index + 1}</span>
          <h3>{formatQuestionType(question.type)} question</h3>
        </div>
        <div className="questionHeaderActions">
          <span className={`statusPill ${answered ? "statusLive" : "statusDraft"}`}>{answered ? "Answered" : "Open"}</span>
          <button className={`btn btnCompact ${flagged ? "btnWarn" : ""}`} type="button" onClick={onToggleFlag} disabled={disabled}>
            {flagged ? "Flagged" : "Flag"}
          </button>
          <span className="statusPill statusDraft">{question.points ?? 0} pts</span>
        </div>
      </div>
      <div className="sectionBody examQuestionBody">
        <section className="examPrompt" aria-labelledby={`question-prompt-${question.id}`}>
          <span id={`question-prompt-${question.id}`} className="examSectionLabel">Question</span>
          <p>{parsed.prompt || question.text || "(no question text)"}</p>
          {parsed.schema ? (
            <>
              <span className="summaryLabel">Schema / context</span>
              <pre>{parsed.schema}</pre>
            </>
          ) : null}
          {parsed.code && !isTechnical ? (
            <>
              <span className="summaryLabel">Starter code</span>
              <pre>{parsed.code}</pre>
            </>
          ) : null}
        </section>
        <section className="examAnswerSection" aria-labelledby={`answer-section-${question.id}`}>
          <div className="examAnswerHeader">
            <span id={`answer-section-${question.id}`} className="examSectionLabel">Your Answer</span>
            <small>{isMcq && options.length > 0 ? "Select the best option." : "Write a clear response."}</small>
          </div>
          {isMcq && options.length > 0 ? (
            <div className="examMcqOptions">
              {options.map((option) => (
                <label key={option} className={`examMcqOption${(isMultiAnswerMcq ? selectedOptions.includes(option) : value === option) ? " selected" : ""}`}>
                  <input
                    type={isMultiAnswerMcq ? "checkbox" : "radio"}
                    name={`question-${question.id}`}
                    value={option}
                    checked={isMultiAnswerMcq ? selectedOptions.includes(option) : value === option}
                    onChange={(event) => {
                      if (!isMultiAnswerMcq) {
                        onChange(event.target.value);
                        return;
                      }

                      const nextSelected = event.target.checked
                        ? [...selectedOptions, option]
                        : selectedOptions.filter((item) => item !== option);
                      onChange(serializeSelectedOptions(nextSelected));
                    }}
                    disabled={disabled}
                  />
                  <span>{option}</span>
                </label>
              ))}
              {isMultiAnswerMcq ? <span className="small">Select all correct answers.</span> : null}
            </div>
          ) : isTechnical ? (
            <TechnicalAnswerWorkspace
              question={question}
              value={value}
              starterCode={parsed.code}
              runResult={runResult}
              running={running}
              disabled={disabled}
              onChange={onChange}
              onRun={onRun}
            />
          ) : (
            <textarea
              className="input textarea"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Type your answer here..."
              disabled={disabled}
            />
          )}
        </section>
      </div>
    </article>
  );
}

function TechnicalAnswerWorkspace({ question, value, starterCode, runResult, running, disabled, onChange, onRun }) {
  const language = question.type === "SQL" ? "sql" : "csharp";
  const editorValue = value || starterCode || "";
  const runDisabled = disabled || running || String(editorValue || "").trim().length === 0;
  const status = String(runResult?.status || "").toLowerCase();
  const isSql = question.type === "SQL";

  return (
    <div className="technicalAnswerWorkspace">
      <div className="technicalEditorShell">
        <div className="technicalEditorToolbar">
          <div>
            <span className="summaryLabel">{isSql ? "SQL editor" : "C# editor"}</span>
            <strong>{isSql ? "Write and test a safe query" : "Write and test focused C# code"}</strong>
            <small>Run saves this answer draft, but it does not submit the exam.</small>
          </div>
          <button className="btn btnPrimary btnCompact" type="button" onClick={onRun} disabled={runDisabled}>
            {running ? "Running..." : isSql ? "Run Query" : "Run Code"}
          </button>
        </div>
        <Editor
          height="260px"
          defaultLanguage={language}
          language={language}
          value={editorValue}
          onChange={(nextValue) => onChange(nextValue || "")}
          theme="vs"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 21,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            readOnly: disabled,
            renderLineHighlight: "line",
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      <div className={`technicalRunPanel ${status === "error" || status === "failed" ? "technicalRunPanelError" : status === "passed" || status === "success" ? "technicalRunPanelSuccess" : ""}`}>
        <div className="technicalRunHeader">
          <span className="summaryLabel">Run output</span>
          <strong>{runResult ? formatRunStatus(runResult.status) : "Not run yet"}</strong>
          {runResult ? (
            <small>
              Run #{runResult.runNumber || 1}
              {runResult.executionTimeMs ? ` · ${runResult.executionTimeMs} ms` : ""}
              {runResult.executedAt ? ` · ${formatTimeOnly(runResult.executedAt)}` : ""}
            </small>
          ) : null}
        </div>
        {runResult?.output ? (
          <div className="technicalRunBlock">
            <span>Output</span>
            <pre>{runResult.output}</pre>
          </div>
        ) : null}
        {runResult?.errors ? (
          <div className="technicalRunBlock technicalRunErrorBlock">
            <span>{isSql ? "Query error" : "Compilation/runtime error"}</span>
            <pre>{runResult.errors}</pre>
          </div>
        ) : null}
        {runResult?.notes ? (
          <div className="technicalRunBlock">
            <span>Execution note</span>
            <pre>{runResult.notes}</pre>
          </div>
        ) : null}
        {!runResult ? (
          <pre>{isSql ? "Use Run Query to validate the draft. This does not submit your exam." : "Use Run Code to validate the draft. This does not submit your exam."}</pre>
        ) : null}
        {Array.isArray(runResult?.testResults) && runResult.testResults.length > 0 ? (
          <div className="technicalTestList">
            {runResult.testResults.map((test, index) => (
              <span key={`${test.name || "test"}-${index}`} className={test.passed ? "statusOk" : "statusWarn"}>
                {test.name || `Test ${index + 1}`}: {test.passed ? "Passed" : "Needs review"}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
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
  const isFinalWarning = violationCount >= finalWarningThreshold;
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalCard integrityModal">
        <span className="summaryLabel">{isFinalWarning ? "Final warning" : "Integrity warning"}</span>
        <h3>{locked ? "Exam interaction is locked" : "Suspicious activity detected"}</h3>
        <p>
          {locked
            ? "The session reached the integrity policy action threshold. Your answers remain saved and the system may submit the attempt automatically for review."
            : `You have ${violationCount} integrity warning${violationCount === 1 ? "" : "s"}. The final warning threshold is ${finalWarningThreshold}; at ${autoActionThreshold} warnings the exam is submitted automatically.`}
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

function AutoSubmitNoticeModal({ notice, countdown, submitting }) {
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-labelledby="auto-submit-title">
      <section className="modalCard integrityModal autoSubmitModal">
        <span className="summaryLabel">Integrity policy action</span>
        <h3 id="auto-submit-title">Exam will be submitted automatically</h3>
        <p>
          The session reached {notice.violationCount}/{notice.threshold} integrity warnings. Your current answers are saved and the attempt will be submitted for staff review.
        </p>
        <div className="autoSubmitCountdown" aria-live="assertive">
          <span>Auto-submit</span>
          <strong>{submitting ? "Submitting..." : `${Math.max(0, countdown)}s`}</strong>
        </div>
        <div className="autoSubmitDetails">
          <span>Latest event</span>
          <strong>{formatIntegrityType(notice.latestType)}</strong>
          <small>{notice.latestMessage}</small>
        </div>
      </section>
    </div>
  );
}

function ExamEntryCodePanel({ accessStatus, entryCode, verifying, requestingApproval, onEntryCodeChange, onVerify, onRequestApproval }) {
  const verified = Boolean(accessStatus?.hasAccess);
  const waiting = ["ApprovalRequested", "WaitingForPhysicalVerification", "DeviceChangeRequested"].includes(accessStatus?.accessStatus);
  const rejected = accessStatus?.accessStatus === "Rejected";

  return (
    <section className={`surfaceCard examEntryCodePanel ${verified ? "examEntryCodePanelReady" : ""}`}>
      <div className="sectionHeader">
        <div>
          <h3>{verified ? "Physical admission approved" : waiting ? "Waiting for physical verification" : "Enter exam access code"}</h3>
          <span className="small">
            {verified
              ? "You can now continue to the rules screen and start the monitored exam session."
              : waiting
                ? "Your identity must be approved by the professor or assistant before the exam can start."
              : "Use the short code from the professor, or request manual admission if you cannot use the active code."}
          </span>
        </div>
        <span className={`statusPill ${verified ? "statusPublished" : rejected ? "statusWarn" : waiting ? "statusDraft" : "statusDraft"}`}>
          {verified ? "Approved" : waiting ? "Physical check" : rejected ? "Rejected" : "Code required"}
        </span>
      </div>
      {!verified ? (
        <div className="sectionBody stackLg">
          {!waiting ? (
            <div className="examEntryCodeForm">
              <label className="field">
                <span>Access code</span>
                <input
                  className="input"
                  value={entryCode}
                  onChange={(event) => onEntryCodeChange(event.target.value)}
                  placeholder="Enter code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
              <button className="btn btnPrimary" type="button" onClick={onVerify} disabled={verifying || !entryCode.trim()}>
                {verifying ? "Verifying..." : "Verify code"}
              </button>
            </div>
          ) : null}
          <div className="manualAdmissionActions">
            <div>
              <strong>Need manual admission?</strong>
              <span>{waiting ? "Your admission is visible to the professor. This page refreshes the status automatically." : "Ask the professor to approve your entry from the live monitor."}</span>
            </div>
            <button className="btn" type="button" onClick={onRequestApproval} disabled={requestingApproval || waiting}>
              {requestingApproval ? "Sending..." : waiting ? "Request sent" : rejected ? "Request again" : "Request approval"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ApprovalWaitingPanel({ accessStatus }) {
  return (
    <section className="surfaceCard manualAdmissionPanel manualAdmissionWaiting">
      <div className="sectionHeader">
        <div>
          <h3>Waiting for physical identity approval</h3>
          <span className="small">Do not refresh or start the exam yet. The timer has not started.</span>
        </div>
        <span className="statusPill statusDraft">Physical check</span>
      </div>
      <div className="sectionBody">
        <StudentIdentityCard identity={accessStatus?.studentIdentity} />
        <p>{accessStatus?.message || "Your manual admission request has been sent to the professor."}</p>
        <div className="manualAdmissionTimeline">
          <span>Request sent</span>
          <strong>{formatSavedAt(accessStatus?.requestedAt)}</strong>
        </div>
      </div>
    </section>
  );
}

function StudentIdentityCard({ identity }) {
  const [photoObjectUrl, setPhotoObjectUrl] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    (async () => {
      try {
        if (!identity?.photoUrl) {
          setPhotoObjectUrl("");
          return;
        }

        objectUrl = await loadProtectedPhotoUrl(identity.photoUrl);
        if (active) setPhotoObjectUrl(objectUrl);
      } catch {
        if (active) setPhotoObjectUrl("");
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [identity?.photoUrl]);

  if (!identity) return null;

  return (
    <div className="studentAdmissionIdentity">
      <div className="studentAdmissionPhoto" aria-hidden="true">
        {photoObjectUrl ? <img src={photoObjectUrl} alt="" /> : <span>{identity.initials || "ST"}</span>}
      </div>
      <div>
        <span className="summaryLabel">Student identity</span>
        <strong>{identity.fullName || "Student"}</strong>
        <small>{identity.email}</small>
        <small>ID: {identity.studentNumber || identity.studentId}</small>
      </div>
    </div>
  );
}

function SecureExamIdentityBanner({ identity, fallbackUser, cameraStatus }) {
  const [photoObjectUrl, setPhotoObjectUrl] = useState("");
  const fullName = identity?.fullName || fallbackUser?.fullName || "Student";
  const email = identity?.email || fallbackUser?.email || "";
  const studentNumber = identity?.studentNumber || identity?.studentId || "Pending ID";
  const initials = identity?.initials || buildInitials(fullName, email);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    (async () => {
      try {
        if (!identity?.photoUrl) {
          setPhotoObjectUrl("");
          return;
        }

        objectUrl = await loadProtectedPhotoUrl(identity.photoUrl);
        if (active) setPhotoObjectUrl(objectUrl);
      } catch {
        if (active) setPhotoObjectUrl("");
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [identity?.photoUrl]);

  return (
    <div className="secureExamIdentityBanner" aria-label="Verified student identity">
      <div className="secureExamIdentityPhoto" aria-hidden="true">
        {photoObjectUrl ? <img src={photoObjectUrl} alt="" /> : <span>{initials}</span>}
      </div>
      <div className="secureExamIdentityText">
        <span>Verified student</span>
        <strong>{fullName}</strong>
        <small>{email}</small>
        <small>ID: {studentNumber}</small>
      </div>
      <em>{cameraStatus === "active" ? "Camera active" : "Camera check"}</em>
    </div>
  );
}

function ApprovalRejectedPanel({ accessStatus, requesting, onRequestAgain }) {
  return (
    <section className="surfaceCard manualAdmissionPanel manualAdmissionRejected">
      <div className="sectionHeader">
        <div>
          <h3>Manual admission rejected</h3>
          <span className="small">You can still enter a valid code or send another request after speaking with staff.</span>
        </div>
        <span className="statusPill statusWarn">Rejected</span>
      </div>
      <div className="sectionBody manualAdmissionRejectedBody">
        <p>{accessStatus?.approvalReason || accessStatus?.message || "Your professor rejected this manual admission request."}</p>
        <button className="btn" type="button" onClick={onRequestAgain} disabled={requesting}>
          {requesting ? "Sending..." : "Request approval again"}
        </button>
      </div>
    </section>
  );
}

function LiveSessionStatePanel({ tone = "warning", title, message, detail, actionLabel, onAction }) {
  return (
    <section className={`liveSessionStatePanel liveSessionStatePanel-${tone}`} role="status" aria-live="assertive">
      <div>
        <span className="summaryLabel">Live session state</span>
        <h3>{title}</h3>
        <p>{message}</p>
        {detail ? <small>{detail}</small> : null}
      </div>
      {onAction ? (
        <button className="btn btnPrimary" type="button" onClick={onAction}>
          {actionLabel || "Continue"}
        </button>
      ) : null}
    </section>
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
      : result.reason === "submitted-lock"
        ? "This attempt was already submitted. Re-entry requires explicit staff authorization."
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
          {result.reason === "integrity-policy" && result.integritySummary ? (
            <div className="submissionIntegrityNotice">
              <strong>Auto-submitted by integrity policy</strong>
              <span>
                {result.integritySummary.violationCount}/{result.integritySummary.threshold} warnings reached. Latest event: {formatIntegrityType(result.integritySummary.latestType)}.
              </span>
            </div>
          ) : null}
          Your submission is saved. Scores and feedback become visible only after staff review and result publication.
          {result.reason === "submitted-lock" ? " The editable exam workspace is locked for this student account." : ""}
        </div>
        <div className="heroActions examDoneActions">
          <button className="btn btnPrimary" type="button" onClick={onDone}>Return to exams</button>
          <Link className="btn" to="/results">View results queue</Link>
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

function buildSessionTiming(exam, restored, attempt) {
  const now = Date.now();
  const attemptExpiry = Date.parse(attempt?.expiresAt || "");
  if (Number.isFinite(attemptExpiry) && attemptExpiry > now) {
    return {
      startedAt: attempt?.startedAt || new Date(now).toISOString(),
      expiresAt: attempt.expiresAt,
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

function buildInitials(fullName, email) {
  const parts = String(fullName || "")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length > 0) {
    return parts.map((part) => part[0]?.toUpperCase()).join("");
  }

  return String(email || "ST").slice(0, 2).toUpperCase();
}

function formatSaveState(saveState) {
  if (saveState === "saving") return "Saving draft...";
  if (saveState === "error") return "Draft could not be saved on this device";
  if (saveState === "idle") return "Draft starts after your first change";
  return "Draft saved on this device";
}

function getQuestionNavClass(answer, flagged) {
  const classes = [];
  if (isAnswerFilled(answer)) classes.push("answered");
  if (flagged) classes.push("flagged");
  return classes.join(" ");
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

function isAnswerFilled(answer) {
  const selected = parseSelectedOptions(answer);
  if (selected.length > 0) return true;
  return String(answer || "").trim().length > 0;
}

function parseSelectedOptions(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    }
  } catch {
    // Single-answer MCQ responses are plain text.
  }

  return [];
}

function serializeSelectedOptions(options) {
  const normalized = Array.from(new Set((options || []).map((option) => String(option || "").trim()).filter(Boolean)));
  return normalized.length === 0 ? "" : JSON.stringify(normalized);
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

function formatRunStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "passed" || normalized === "success") return "Check passed";
  if (normalized === "warning" || normalized === "needsreview") return "Needs review";
  if (normalized === "failed" || normalized === "error") return "Check failed";
  if (normalized === "timeout") return "Timed out";
  if (normalized === "running") return "Running";
  return "Not run yet";
}

function formatTimeOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
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

function formatIntegrityType(eventType) {
  const labels = {
    TabHidden: "Tab switch",
    TAB_SWITCH: "Tab switch",
    WindowBlur: "Window focus lost",
    WINDOW_BLUR: "Window focus lost",
    FullscreenExit: "Fullscreen exited",
    EXIT_FULLSCREEN: "Fullscreen exited",
    CopyAttempt: "Copy attempt",
    COPY_ATTEMPT: "Copy attempt",
    PasteAttempt: "Paste attempt",
    PASTE_ATTEMPT: "Paste attempt",
    RightClickAttempt: "Right click",
    RIGHT_CLICK_ATTEMPT: "Right click",
    ShortcutAttempt: "Restricted shortcut",
    DEVTOOLS_ATTEMPT: "Restricted shortcut",
    PrintAttempt: "Print attempt",
    PRINT_ATTEMPT: "Print attempt",
    FullscreenRequestFailed: "Fullscreen failed",
    NetworkOffline: "Network offline",
    INTEGRITY_POLICY: "Integrity policy",
  };
  return labels[eventType] || String(eventType || "Integrity event").replace(/[_-]+/g, " ");
}

function normalizeIntegrityEventType(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "COPYATTEMPT") return "COPY_ATTEMPT";
  if (normalized === "PASTEATTEMPT") return "PASTE_ATTEMPT";
  if (normalized === "CUTATTEMPT") return "CUT_ATTEMPT";
  if (normalized === "FULLSCREENEXIT") return "EXIT_FULLSCREEN";
  if (normalized === "TABHIDDEN") return "TAB_SWITCH";
  if (normalized === "WINDOWBLUR") return "WINDOW_BLUR";
  return normalized;
}

function formatPolicyAction(action) {
  if (!action || action === "None") return "Policy clear";
  if (action === "Warning") return "Policy warning";
  if (action === "FinalWarning") return "Final warning";
  if (action === "AutoSubmit") return "Auto action";
  return action;
}

