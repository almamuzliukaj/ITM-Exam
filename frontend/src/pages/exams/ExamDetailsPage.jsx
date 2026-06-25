import { Link, useParams } from "react-router-dom";
import {
  addSelectedQuestionsFromBank,
  allowExamStudentAccess,
  deleteExamQuestion,
  generateExamAccessCode,
  generateRandomQuestions,
  getExam,
  getExamLiveMonitor,
  listQuestions,
  publishExam,
  replaceExamQuestionWithBankQuestion,
  unpublishExam,
  updateExamQuestion,
} from "../../lib/examsApi";
import { listMyOfferings } from "../../lib/academicApi";
import { listQuestionBankQuestions } from "../../lib/questionBankApi";
import { canManageExams } from "../../lib/permissions";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import AppShell from "../../components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export default function ExamDetailsPage() {
  const { t } = useTranslation();
  const { examId } = useParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [accessCode, setAccessCode] = useState(null);
  const [liveMonitor, setLiveMonitor] = useState(null);
  const [generatingAccessCode, setGeneratingAccessCode] = useState(false);
  const [approvingStudentId, setApprovingStudentId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [replacingId, setReplacingId] = useState("");
  const [savingPointsId, setSavingPointsId] = useState("");
  const [pointDrafts, setPointDrafts] = useState({});
  const [generationFeedback, setGenerationFeedback] = useState(null);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState([]);
  const [addingSelected, setAddingSelected] = useState(false);
  const [bankFilters, setBankFilters] = useState({
    search: "",
    type: "",
    topic: "",
    difficulty: "",
  });
  const [manualSelectorOpen, setManualSelectorOpen] = useState(false);
  const [questionSetupMode, setQuestionSetupMode] = useState("");
  const [reviewQuestionsOpen, setReviewQuestionsOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replacementFilters, setReplacementFilters] = useState({
    search: "",
    type: "",
    topic: "",
    difficulty: "",
  });
  const [selectedReplacementId, setSelectedReplacementId] = useState("");
  const [error, setError] = useState("");
  const [generator, setGenerator] = useState({
    numberOfQuestions: 3,
    type: "",
  });
  const canEdit = canManageExams(user?.role);
  const isStudent = user?.role === "Student";
  const isDraft = canEdit && exam && !exam.isPublished;

  const canGenerate = useMemo(
    () => isPositiveNumber(generator.numberOfQuestions) && Boolean(exam?.courseOfferingId),
    [exam?.courseOfferingId, generator.numberOfQuestions],
  );
  const currentQuestionPoints = useMemo(
    () => questions.reduce((sum, question) => sum + Number(question.points || 0), 0),
    [questions],
  );
  const examMaximumPoints = Number(exam?.maximumPoints || 0);
  const pointsDifference = currentQuestionPoints - examMaximumPoints;
  const availableBankQuestions = useMemo(() => {
    const existingSignatures = new Set(questions.map(buildQuestionSignature));
    return bankQuestions.filter((question) => !existingSignatures.has(buildQuestionSignature(question)));
  }, [bankQuestions, questions]);
  const filteredBankQuestions = useMemo(
    () => filterBankQuestions(availableBankQuestions, bankFilters),
    [availableBankQuestions, bankFilters],
  );
  const replacementOptions = useMemo(() => {
    if (!replaceTarget) return [];

    const otherQuestionSignatures = new Set(
      questions
        .filter((question) => question.id !== replaceTarget.id)
        .map(buildQuestionSignature),
    );

    const candidateQuestions = bankQuestions.filter((question) => {
      const signature = buildQuestionSignature(question);
      return signature !== buildQuestionSignature(replaceTarget) && !otherQuestionSignatures.has(signature);
    });

    return filterBankQuestions(candidateQuestions, replacementFilters);
  }, [bankQuestions, questions, replaceTarget, replacementFilters]);

  useEffect(() => {
    if (!examId) return;

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const [examData, questionData] = await Promise.all([getExam(examId), listQuestions(examId)]);
        if (!active) return;
        setExam(examData);
        setSelectedOfferingId(examData?.courseOfferingId || "");
        const examQuestions = Array.isArray(questionData) ? questionData : [];
        setQuestions(examQuestions);
        setPointDrafts(buildPointDrafts(examQuestions));
      } catch {
        if (active) setError(t("examDetails.error"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [examId, t]);

  useEffect(() => {
    if (!canEdit) return;

    let active = true;

    async function loadOfferings() {
      try {
        const data = await listMyOfferings();
        if (active) setOfferings(Array.isArray(data) ? data : []);
      } catch {
        if (active) setOfferings([]);
      }
    }

    loadOfferings();

    return () => {
      active = false;
    };
  }, [canEdit]);

  useEffect(() => {
    if (!canEdit || !exam?.courseOfferingId || !isDraft) {
      setBankQuestions([]);
      setSelectedBankQuestionIds([]);
      return;
    }

    let active = true;

    async function loadQuestionBank() {
      try {
        setBankLoading(true);
        const data = await listQuestionBankQuestions(exam.courseOfferingId);
        if (active) setBankQuestions(Array.isArray(data) ? data : []);
      } catch {
        if (active) setBankQuestions([]);
      } finally {
        if (active) setBankLoading(false);
      }
    }

    loadQuestionBank();

    return () => {
      active = false;
    };
  }, [canEdit, exam?.courseOfferingId, isDraft]);

  useEffect(() => {
    if (!canEdit || !examId || !exam?.isPublished) {
      setLiveMonitor(null);
      setAccessCode(null);
      return;
    }

    let active = true;

    async function loadLiveMonitor() {
      try {
        const data = await getExamLiveMonitor(examId);
        if (active) setLiveMonitor(data);
      } catch {
        if (active) setLiveMonitor(null);
      }
    }

    loadLiveMonitor();
    const timer = window.setInterval(loadLiveMonitor, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [canEdit, exam?.isPublished, examId]);

  if (userLoading) {
    return <div className="pageState">{t("examDetails.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("examDetails.userError")}</div>;
  }

  const canPublishDraft = isDraft && questions.length > 0 && Boolean(exam?.courseOfferingId || selectedOfferingId);

  async function onPublish() {
    if (!examId || !isDraft) return;

    try {
      setPublishing(true);
      setError("");
      await publishExam(examId, selectedOfferingId ? { courseOfferingId: selectedOfferingId } : {});
      const updated = await getExam(examId);
      setExam(updated);
      setSelectedOfferingId(updated?.courseOfferingId || "");
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to publish exam.");
    } finally {
      setPublishing(false);
      setPublishConfirmOpen(false);
    }
  }

  async function onUnpublish() {
    if (!examId || !canEdit || !exam?.isPublished) return;

    try {
      setUnpublishing(true);
      setError("");
      await unpublishExam(examId);
      const updated = await getExam(examId);
      setExam(updated);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to unpublish assessment.");
    } finally {
      setUnpublishing(false);
    }
  }

  async function onGenerateAccessCode() {
    if (!examId || !canEdit || !exam?.isPublished) return;

    try {
      setGeneratingAccessCode(true);
      setError("");
      const generated = await generateExamAccessCode(examId);
      setAccessCode(generated);
      const monitor = await getExamLiveMonitor(examId).catch(() => null);
      if (monitor) setLiveMonitor(monitor);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to generate exam access code.");
    } finally {
      setGeneratingAccessCode(false);
    }
  }

  async function onAllowStudentAccess(student) {
    if (!examId || !student?.studentId) return;

    const confirmed = window.confirm(`Allow ${student.fullName || student.email} to enter this exam without the active code?`);
    if (!confirmed) return;

    try {
      setApprovingStudentId(student.studentId);
      setError("");
      await allowExamStudentAccess(examId, student.studentId, "Professor approval");
      const monitor = await getExamLiveMonitor(examId);
      setLiveMonitor(monitor);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to approve student access.");
    } finally {
      setApprovingStudentId("");
    }
  }

  async function onGenerateRandomQuestions() {
    if (!examId || !canGenerate) return;

    try {
      setGenerating(true);
      setError("");
      setGenerationFeedback(null);
      const created = await generateRandomQuestions(examId, {
        numberOfQuestions: Number(generator.numberOfQuestions),
        type: generator.type || null,
        replaceExisting: true,
      });
      const newQuestions = Array.isArray(created?.questions) ? created.questions : [];
      setQuestions(newQuestions);
      setPointDrafts(buildPointDrafts(newQuestions));
      setGenerationFeedback(created);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to generate random questions.");
    } finally {
      setGenerating(false);
    }
  }

  async function onAddSelectedQuestions() {
    if (!examId || selectedBankQuestionIds.length === 0) return;

    try {
      setAddingSelected(true);
      setError("");
      const result = await addSelectedQuestionsFromBank(examId, selectedBankQuestionIds);
      const addedQuestions = Array.isArray(result?.questions) ? result.questions : [];
      setQuestions((current) => [...current, ...addedQuestions]);
      setPointDrafts((current) => ({ ...current, ...buildPointDrafts(addedQuestions) }));
      setSelectedBankQuestionIds([]);
      setManualSelectorOpen(false);
      setGenerationFeedback({
        isExactMatch: false,
        message: result?.message || `Added ${addedQuestions.length} selected question(s) to the exam.`,
      });
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to add selected question bank questions.");
    } finally {
      setAddingSelected(false);
    }
  }

  function toggleBankQuestion(questionId) {
    setSelectedBankQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  function openEditQuestion(question) {
    setEditingQuestion(question);
    setEditError("");
    setEditDraft(buildEditDraft(question));
  }

  function updateEditDraft(patch) {
    setEditDraft((current) => ({ ...current, ...patch }));
  }

  async function onSaveQuestionEdit() {
    if (!editingQuestion || !editDraft) return;

    const validationMessage = validateEditDraft(editDraft);
    if (validationMessage) {
      setEditError(validationMessage);
      return;
    }

    try {
      setSavingEdit(true);
      setEditError("");
      setError("");
      const payload = buildQuestionPayload(editDraft, editingQuestion);
      await updateExamQuestion(editingQuestion.id, payload);
      const updatedQuestion = {
        ...editingQuestion,
        ...payload,
        correctAnswer: payload.correctAnswer,
        options: payload.options,
      };
      setQuestions((current) =>
        current.map((question) => (question.id === editingQuestion.id ? updatedQuestion : question)),
      );
      setPointDrafts((current) => ({ ...current, [editingQuestion.id]: String(payload.points) }));
      setEditingQuestion(null);
      setEditDraft(null);
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setEditError(apiMessage || "Failed to save question changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function onRemoveQuestion(question) {
    const confirmed = window.confirm("Remove this question from the exam? The question bank entry will not be deleted.");
    if (!confirmed) return;

    try {
      setRemovingId(question.id);
      setError("");
      await deleteExamQuestion(question.id);
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      setPointDrafts((current) => {
        const next = { ...current };
        delete next[question.id];
        return next;
      });
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to remove question from exam.");
    } finally {
      setRemovingId("");
    }
  }

  function openReplaceQuestion(question) {
    setReplaceTarget(question);
    setReplacementFilters({
      search: "",
      type: "",
      topic: "",
      difficulty: "",
    });
    setSelectedReplacementId("");
  }

  async function onConfirmReplacement() {
    if (!examId || !replaceTarget || !selectedReplacementId) return;

    try {
      setReplacingId(replaceTarget.id);
      setError("");
      const replacement = await replaceExamQuestionWithBankQuestion(examId, replaceTarget.id, selectedReplacementId);
      setQuestions((current) =>
        current.map((question) => (question.id === replaceTarget.id ? replacement : question)),
      );
      setPointDrafts((current) => ({
        ...current,
        [replaceTarget.id]: String(replacement.points ?? 0),
      }));
      setReplaceTarget(null);
      setSelectedReplacementId("");
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to replace question.");
    } finally {
      setReplacingId("");
    }
  }

  async function onSaveQuestionPoints(question) {
    const draftValue = pointDrafts[question.id];
    const nextPoints = Number(draftValue);

    if (!Number.isFinite(nextPoints) || nextPoints <= 0) {
      setError("Question points must be greater than 0.");
      return;
    }

    try {
      setSavingPointsId(question.id);
      setError("");
      await updateExamQuestion(question.id, {
        text: question.text,
        type: question.type,
        courseId: question.courseId || null,
        options: Array.isArray(question.options) ? question.options : [],
        correctAnswer: question.correctAnswer ?? null,
        topic: question.topic || null,
        difficulty: question.difficulty || null,
        points: nextPoints,
      });

      setQuestions((current) =>
        current.map((item) =>
          item.id === question.id
            ? {
                ...item,
                points: nextPoints,
                text: question.text,
              }
            : item,
        ),
      );
    } catch (err) {
      const apiMessage =
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;
      setError(apiMessage || "Failed to update question points.");
    } finally {
      setSavingPointsId("");
    }
  }

  function onStartAttempt() {
    if (!examId) return;
    window.location.href = `/exams/${examId}/attempt`;
  }

  return (
    <AppShell
      user={user}
      badge={t("examDetails.badge")}
      title={exam?.title || t("examDetails.titleFallback")}
      subtitle={exam?.description || t("examDetails.subtitleFallback")}
      actions={
        <>
          <Link className="btn" to="/exams">{t("examDetails.backToExams")}</Link>
          {canEdit && examId ? <Link className="btn" to={`/exams/${examId}/monitor`}>Live monitor</Link> : null}
          {canEdit && examId ? <Link className="btn" to={`/exams/${examId}/gradebook`}>Gradebook</Link> : null}
          {canEdit && examId ? <Link className="btn" to={`/exams/${examId}/edit`}>Edit exam</Link> : null}
          {isDraft ? (
            <button className="btn btnPrimary" type="button" onClick={() => setPublishConfirmOpen(true)} disabled={publishing || !canPublishDraft}>
              {publishing ? "Publishing..." : "Publish exam"}
            </button>
          ) : null}
          {canEdit && exam?.isPublished ? (
            <button className="btn" type="button" onClick={onUnpublish} disabled={unpublishing}>
              {unpublishing ? "Unpublishing..." : "Unpublish"}
            </button>
          ) : null}
          {isStudent && examId ? (
            <button className="btn btnPrimary" type="button" onClick={onStartAttempt}>
              Start attempt
            </button>
          ) : null}
          {canEdit && examId ? <Link className="btn btnPrimary" to={`/exams/${examId}/questions/new`}>{t("examDetails.addQuestion")}</Link> : null}
        </>
      }
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}
        {publishConfirmOpen ? (
          <PublishAssessmentModal
            exam={exam}
            questions={questions}
            selectedOffering={offerings.find((offering) => offering.id === (selectedOfferingId || exam?.courseOfferingId))}
            totalPoints={currentQuestionPoints}
            publishing={publishing}
            onCancel={() => setPublishConfirmOpen(false)}
            onConfirm={onPublish}
          />
        ) : null}

        {loading ? (
          <div className="pageStateCard">{t("examDetails.loadingStructure")}</div>
        ) : (
          <>
            <section className="summaryStrip">
              <article className="summaryCard">
                <span className="summaryLabel">{t("examDetails.status")}</span>
                <strong>{exam?.isPublished ? t("examsList.published") : t("examsList.draft")}</strong>
              </article>
              <article className="summaryCard">
                <span className="summaryLabel">{t("examDetails.duration")}</span>
                <strong>{exam?.durationMinutes || 60} min</strong>
              </article>
              <article className="summaryCard">
                <span className="summaryLabel">{t("examDetails.questions")}</span>
                <strong>{questions.length}</strong>
              </article>
              <article className="summaryCard">
                <span className="summaryLabel">Maximum points</span>
                <strong>{examMaximumPoints || "-"}</strong>
              </article>
              <article className="summaryCard">
                <span className="summaryLabel">Lockdown</span>
                <strong>{exam?.requiresLockdown ? "Required" : "Optional"}</strong>
              </article>
            </section>

            {canEdit && exam?.isPublished ? (
              <ExamAccessPanel
                accessCode={accessCode}
                liveMonitor={liveMonitor}
                generating={generatingAccessCode}
                approvingStudentId={approvingStudentId}
                onGenerate={onGenerateAccessCode}
                onAllowStudent={onAllowStudentAccess}
              />
            ) : null}

            <section className="surfaceCard">
              <div className="sectionHeader">
                <div>
                  <h3>Point balance</h3>
                  <span className="small">Keep the exam aligned with the professor-defined maximum score.</span>
                </div>
                <span className={`statusPill ${pointsDifference === 0 ? "statusPublished" : "statusDraft"}`}>
                  {pointsDifference === 0 ? "Balanced" : pointsDifference > 0 ? `+${pointsDifference} over` : `${Math.abs(pointsDifference)} under`}
                </span>
              </div>
              <div className="sectionBody">
                <div className="lockdownReadinessGrid">
                  <article>
                    <span className="summaryLabel">Exam maximum</span>
                    <strong>{examMaximumPoints}</strong>
                  </article>
                  <article>
                    <span className="summaryLabel">Current question total</span>
                    <strong>{currentQuestionPoints}</strong>
                  </article>
                  <article>
                    <span className="summaryLabel">Difference</span>
                    <strong>{pointsDifference === 0 ? "0" : pointsDifference > 0 ? `+${pointsDifference}` : String(pointsDifference)}</strong>
                  </article>
                </div>
              </div>
            </section>

            <section className="surfaceCard">
              <div className="sectionHeader">
                <h3>Exam integrity readiness</h3>
                <span className="small">{exam?.requiresLockdown ? "Lockdown policy is configured for this exam." : "Standard browser guard is active for student sessions."}</span>
              </div>
              <div className="sectionBody">
                <div className="lockdownReadinessGrid">
                  <article>
                    <span className="summaryLabel">Allowed client</span>
                    <strong>{formatLockdownClient(exam?.allowedClient)}</strong>
                  </article>
                  <article>
                    <span className="summaryLabel">Policy</span>
                    <strong>{exam?.lockdownMode || "Advisory"}</strong>
                  </article>
                  <article>
                    <span className="summaryLabel">Review path</span>
                    <strong>Gradebook timeline</strong>
                  </article>
                </div>
              </div>
            </section>

            {isDraft && !exam?.courseOfferingId ? (
              <section className="surfaceCard">
                <div className="sectionHeader">
                  <h3>Publish setup</h3>
                  <span className="small">Link this draft to a course offering before publishing.</span>
                </div>
                <div className="sectionBody">
                  <div className="field">
                    <label className="label">Course offering</label>
                    <select
                      className="input"
                      value={selectedOfferingId}
                      onChange={(e) => setSelectedOfferingId(e.target.value)}
                      disabled={publishing}
                    >
                      <option value="">Select course offering</option>
                      {offerings.map((offering) => (
                        <option key={offering.id} value={offering.id}>
                          {formatOfferingLabel(offering)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            ) : null}

            {isDraft && exam?.courseOfferingId ? (
              <section className="surfaceCard questionSetupPanel">
                <div className="sectionHeader">
                  <div>
                    <h3>Question setup</h3>
                    <span className="small">Choose how questions should be added to this draft.</span>
                  </div>
                  <span className="statusPill statusDraft">{questions.length} in exam</span>
                </div>
                <div className="sectionBody stackLg">
                  <div className="questionSetupChoices" role="tablist" aria-label="Question setup mode">
                    <button
                      className={questionSetupMode === "generate" ? "active" : ""}
                      type="button"
                      onClick={() => setQuestionSetupMode("generate")}
                    >
                      <strong>Generate from question bank</strong>
                      <span>Suggest questions by type and count.</span>
                    </button>
                    <button
                      className={questionSetupMode === "manual" ? "active" : ""}
                      type="button"
                      onClick={() => setQuestionSetupMode("manual")}
                    >
                      <strong>Select questions manually</strong>
                      <span>Choose exact bank questions.</span>
                    </button>
                  </div>

                  {!questionSetupMode ? (
                    <div className="compactHelpPanel">
                      Select one option above to open the related setup form. Automatic generation uses the course question bank; manual selection lets you choose exact questions.
                    </div>
                  ) : null}

                  {questionSetupMode === "generate" ? (
                    <div className="questionSetupBody">
                      <div className="questionBankFormGrid">
                        <div className="field">
                          <label className="label">Maximum generated questions</label>
                          <input
                            className="input"
                            type="number"
                            min="1"
                            value={generator.numberOfQuestions}
                            onChange={(e) => setGenerator((current) => ({ ...current, numberOfQuestions: Number(e.target.value) }))}
                            disabled={generating}
                          />
                          <span className="fieldHint">The generator targets the remaining exam points and avoids questions already in this exam.</span>
                        </div>
                        <div className="field">
                          <label className="label">{t("questionBank.type")}</label>
                          <select
                            className="input"
                            value={generator.type}
                            onChange={(e) => setGenerator((current) => ({ ...current, type: e.target.value }))}
                            disabled={generating}
                          >
                            <option value="">{t("questionBank.allTypes")}</option>
                            <option value="MCQ">MCQ</option>
                            <option value="Text">{t("common.text")}</option>
                            <option value="CSharp">C#</option>
                            <option value="SQL">SQL</option>
                          </select>
                        </div>
                      </div>

                      <div className="row examFormActions" style={{ justifyContent: "flex-end" }}>
                        <button
                          className="btn btnPrimary"
                          type="button"
                          onClick={onGenerateRandomQuestions}
                          disabled={!canGenerate || generating}
                        >
                          {generating ? t("examDetails.generator.generating") : t("examDetails.generator.generate")}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {questionSetupMode === "manual" ? (
                    <div className="questionSetupBody">
                      <div className="compactHelpPanel questionSelectorSummary">
                        <strong>{bankLoading ? "Loading question bank..." : `${availableBankQuestions.length} available questions`}</strong>
                        <span>Open the selector to search, filter by type/topic/difficulty, and choose exact questions.</span>
                      </div>

                      <div className="row examFormActions" style={{ justifyContent: "flex-end" }}>
                        <button
                          className="btn"
                          type="button"
                          onClick={() => setManualSelectorOpen(true)}
                          disabled={bankLoading}
                        >
                          Open question selector
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {generationFeedback ? (
                    <div className={`publishNotice${generationFeedback.isExactMatch ? "" : " publishNoticeWarning"}`}>
                      <strong>{generationFeedback.isExactMatch ? "Exact point match generated" : "Question setup feedback"}</strong>
                      <span>{generationFeedback.message}</span>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {isDraft && questions.length === 0 ? (
              <div className="publishNotice">
                <strong>Question required before publishing</strong>
                <span>Add at least one question to complete the manual exam builder workflow.</span>
              </div>
            ) : null}

            <section className="surfaceCard examQuestionReview">
              <div className="sectionHeader">
                <div>
                  <h3>Exam questions</h3>
                  <span className="small">
                    {questions.length} questions / {currentQuestionPoints} points / {pointsDifference === 0 ? "balanced" : pointsDifference > 0 ? `+${pointsDifference} over` : `${Math.abs(pointsDifference)} under`}
                  </span>
                </div>
                <button className="btn" type="button" onClick={() => setReviewQuestionsOpen((current) => !current)}>
                  {reviewQuestionsOpen ? "Hide questions" : "Review questions"}
                </button>
              </div>
              {reviewQuestionsOpen ? (
              <div className="sectionBody">
                {questions.length === 0 ? (
                  <div className="emptyState">
                    <p>{t("examDetails.noQuestionsTitle")}</p>
                    <p>{t("examDetails.noQuestionsText")}</p>
                  </div>
                ) : (
                  <div className="compactTableWrap">
                    <table className="compactTable examQuestionTable">
                      <thead>
                        <tr>
                          <th>No.</th>
                          <th>Question</th>
                          <th>Type</th>
                          <th>Topic</th>
                          <th>Points</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map((question, index) => (
                          <QuestionRow
                            key={question.id}
                            question={question}
                            index={index}
                            isDraft={isDraft}
                            replacing={replacingId === question.id}
                            removing={removingId === question.id}
                            savingPoints={savingPointsId === question.id}
                            pointValue={pointDrafts[question.id] ?? String(question.points ?? 0)}
                            onPointChange={(value) =>
                              setPointDrafts((current) => ({ ...current, [question.id]: value }))
                            }
                            onSavePoints={onSaveQuestionPoints}
                            onEdit={openEditQuestion}
                            onReplace={openReplaceQuestion}
                            onRemove={onRemoveQuestion}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              ) : null}
            </section>

            {editingQuestion && editDraft ? (
              <EditQuestionModal
                draft={editDraft}
                error={editError}
                saving={savingEdit}
                onChange={updateEditDraft}
                onClose={() => {
                  setEditingQuestion(null);
                  setEditDraft(null);
                  setEditError("");
                }}
                onSave={onSaveQuestionEdit}
              />
            ) : null}

            {manualSelectorOpen ? (
              <QuestionBankSelectorModal
                loading={bankLoading}
                questions={filteredBankQuestions}
                filters={bankFilters}
                selectedIds={selectedBankQuestionIds}
                adding={addingSelected}
                availableCount={availableBankQuestions.length}
                onFiltersChange={(patch) => {
                  setBankFilters((current) => ({ ...current, ...patch }));
                  setSelectedBankQuestionIds([]);
                }}
                onToggle={toggleBankQuestion}
                onClose={() => setManualSelectorOpen(false)}
                onAdd={onAddSelectedQuestions}
              />
            ) : null}

            {replaceTarget ? (
              <ReplaceQuestionModal
                target={replaceTarget}
                options={replacementOptions}
                filters={replacementFilters}
                selectedId={selectedReplacementId}
                replacing={replacingId === replaceTarget.id}
                availableCount={bankQuestions.length}
                onFiltersChange={(patch) => {
                  setReplacementFilters((current) => ({ ...current, ...patch }));
                  setSelectedReplacementId("");
                }}
                onSelect={setSelectedReplacementId}
                onClose={() => {
                  setReplaceTarget(null);
                  setSelectedReplacementId("");
                }}
                onConfirm={onConfirmReplacement}
              />
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

function QuestionRow({
  question,
  index,
  isDraft,
  replacing,
  removing,
  savingPoints,
  pointValue,
  onPointChange,
  onSavePoints,
  onEdit,
  onReplace,
  onRemove,
}) {
  const parsed = parseTechnicalQuestion(question);

  return (
    <tr>
      <td>{String(index + 1).padStart(2, "0")}</td>
      <td>
        <strong>{truncateText(parsed.prompt || question.text, 140)}</strong>
        {parsed.isTechnical && parsed.expected ? (
          <span className="questionRowMeta">Expected answer available</span>
        ) : null}
      </td>
      <td>{formatQuestionType(question.type)}</td>
      <td>{question.topic || question.difficulty || "-"}</td>
      <td>
        {isDraft ? (
          <div className="pointsInlineEditor">
            <input
              className="input"
              type="number"
              min="1"
              value={pointValue}
              onChange={(e) => onPointChange(e.target.value)}
              disabled={savingPoints}
            />
            <button className="btn btnTiny" type="button" onClick={() => onSavePoints(question)} disabled={savingPoints}>
              {savingPoints ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          question.points
        )}
      </td>
      <td>
        {isDraft ? (
          <div className="tableActionGroup">
            <button className="btn btnTiny" type="button" onClick={() => onEdit(question)}>Edit</button>
            <button className="btn btnTiny" type="button" onClick={() => onReplace(question)} disabled={replacing}>
              {replacing ? "Replacing..." : "Replace"}
            </button>
            <button className="btn btnTiny btnDangerSoft" type="button" onClick={() => onRemove(question)} disabled={removing}>
              {removing ? "Removing..." : "Remove"}
            </button>
          </div>
        ) : (
          "-"
        )}
      </td>
    </tr>
  );
}

function QuestionBankSelectorModal({
  loading,
  questions,
  filters,
  selectedIds,
  adding,
  availableCount,
  onFiltersChange,
  onToggle,
  onClose,
  onAdd,
}) {
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalCard questionSelectorModal">
        <div className="sectionHeader">
          <div>
            <h3>Select questions manually</h3>
            <span className="small">
              {availableCount} available / {questions.length} matching / {selectedIds.length} selected
            </span>
          </div>
          <button className="btn btnTiny" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="filtersRow questionBankFilters questionSelectorFilters">
          <div className="field">
            <label className="label">Search</label>
            <input
              className="input"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Search question, answer, or topic"
            />
          </div>
          <div className="field">
            <label className="label">Type</label>
            <select className="input" value={filters.type} onChange={(e) => onFiltersChange({ type: e.target.value })}>
              <option value="">All types</option>
              <option value="MCQ">MCQ</option>
              <option value="Text">Text</option>
              <option value="CSharp">C#</option>
              <option value="SQL">SQL</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Topic</label>
            <input
              className="input"
              value={filters.topic}
              onChange={(e) => onFiltersChange({ topic: e.target.value })}
              placeholder="Module, chapter, topic"
            />
          </div>
          <div className="field">
            <label className="label">Difficulty</label>
            <select className="input" value={filters.difficulty} onChange={(e) => onFiltersChange({ difficulty: e.target.value })}>
              <option value="">All</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="pageStateCard">Loading question bank...</div>
        ) : questions.length === 0 ? (
          <div className="emptyState">
            <strong>No matching questions</strong>
            <span>Adjust the filters or add more questions to this course question bank.</span>
          </div>
        ) : (
          <div className="compactTableWrap questionSelectorTable">
            <table className="compactTable">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Topic</th>
                  <th>Difficulty</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(question.id)}
                        onChange={() => onToggle(question.id)}
                      />
                    </td>
                    <td>{truncateText(question.text, 150)}</td>
                    <td>{formatQuestionType(question.type)}</td>
                    <td>{question.topic || "-"}</td>
                    <td>{question.difficulty || "-"}</td>
                    <td>{question.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="formActionsBar">
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btnPrimary" type="button" onClick={onAdd} disabled={adding || selectedIds.length === 0}>
            {adding ? "Adding..." : `Add selected (${selectedIds.length})`}
          </button>
        </div>
      </section>
    </div>
  );
}

function PublishAssessmentModal({ exam, questions, selectedOffering, totalPoints, publishing, onCancel, onConfirm }) {
  const questionCount = questions.length;
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalCard publishAssessmentModal">
        <div className="sectionHeader">
          <div>
            <span className="summaryLabel">Publish confirmation</span>
            <h3>Publish this assessment?</h3>
            <span className="sectionMeta">Students will see this assessment according to the scheduled time and eligibility rules.</span>
          </div>
          <span className="statusPill statusWarn">Review required</span>
        </div>

        <div className="publishAssessmentSummary">
          <article>
            <span>Assessment</span>
            <strong>{exam?.title || "-"}</strong>
          </article>
          <article>
            <span>Course offering</span>
            <strong>{selectedOffering ? formatOfferingLabel(selectedOffering) : "Assigned offering"}</strong>
          </article>
          <article>
            <span>Assessment category / official period</span>
            <strong>{formatAssessmentType(exam?.assessmentType)} / {formatExamPeriod(exam?.examPeriod)}</strong>
          </article>
          <article>
            <span>Schedule</span>
            <strong>{formatDateTime(exam?.startsAt)} - {formatDateTime(exam?.endsAt)}</strong>
          </article>
          <article>
            <span>Questions / points</span>
            <strong>{questionCount} questions / {totalPoints} pts</strong>
          </article>
          <article>
            <span>Security</span>
            <strong>{exam?.requiresLockdown ? formatLockdownClient(exam.allowedClient) : "Standard browser"}</strong>
          </article>
        </div>

        <div className="publishAssessmentWarning">
          Publishing should happen only after questions, timing, and security settings are ready.
        </div>

        <div className="formActionsBar">
          <button className="btn" type="button" onClick={onCancel} disabled={publishing}>Cancel</button>
          <button className="btn btnPrimary" type="button" onClick={onConfirm} disabled={publishing}>
            {publishing ? "Publishing..." : "Publish assessment"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ExamAccessPanel({ accessCode, liveMonitor, generating, approvingStudentId, onGenerate, onAllowStudent }) {
  const summary = liveMonitor?.summary || {};
  const students = Array.isArray(liveMonitor?.students) ? liveMonitor.students : [];
  const activeExpiresAt = accessCode?.expiresAt || liveMonitor?.activeCodeExpiresAt;

  return (
    <section className="surfaceCard examAccessPanel">
      <div className="sectionHeader">
        <div>
          <h3>Exam access and live monitoring</h3>
          <span className="small">Control classroom entry with a short code and monitor student activity during the exam.</span>
        </div>
        <button className="btn btnPrimary" type="button" onClick={onGenerate} disabled={generating}>
          {generating ? "Generating..." : accessCode ? "Regenerate entry code" : "Generate entry code"}
        </button>
      </div>

      <div className="sectionBody">
        <div className="examAccessGrid">
          <article className="examAccessCodeBox">
            <span className="summaryLabel">Active code</span>
            <strong>{accessCode?.code || (activeExpiresAt ? "Generated" : "No active code")}</strong>
            <small>{activeExpiresAt ? `Expires ${formatDateTime(activeExpiresAt)}` : "Generate a 3-minute code when students are ready to enter."}</small>
          </article>
          <article><span className="summaryLabel">Verified</span><strong>{summary.verified ?? 0}</strong></article>
          <article><span className="summaryLabel">Active</span><strong>{summary.active ?? 0}</strong></article>
          <article><span className="summaryLabel">Submitted</span><strong>{summary.submitted ?? 0}</strong></article>
          <article><span className="summaryLabel">Not joined</span><strong>{summary.notJoined ?? 0}</strong></article>
          <article><span className="summaryLabel">With violations</span><strong>{summary.withViolations ?? 0}</strong></article>
        </div>

        <div className="compactTableWrap liveMonitorTableWrap">
          <table className="compactTable">
            <thead>
              <tr>
                <th>Student</th>
                <th>Access</th>
                <th>Attempt</th>
                <th>Last activity</th>
                <th>Violations</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6}>No eligible students found for this course offering.</td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.studentId}>
                    <td>
                      <strong>{student.fullName || student.email}</strong>
                      <span className="questionRowMeta">{student.email}</span>
                    </td>
                    <td><span className="statusPill statusDraft">{student.accessStatus}</span></td>
                    <td>{student.attemptStatus}</td>
                    <td>{formatDateTime(student.lastActivityAt)}</td>
                    <td>
                      <span className={student.violationCount > 0 ? "statusPill statusWarn" : "statusPill statusPublished"}>
                        {student.violationCount || 0} {student.integritySeverity || "None"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btnTiny"
                        type="button"
                        onClick={() => onAllowStudent(student)}
                        disabled={approvingStudentId === student.studentId || student.attemptStatus === "Submitted"}
                      >
                        {approvingStudentId === student.studentId ? "Approving..." : "Allow access"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function EditQuestionModal({ draft, error, saving, onChange, onClose, onSave }) {
  const isMcq = draft.type === "MCQ";

  function updateOption(index, value) {
    const oldOption = draft.options[index];
    const nextOptions = draft.options.map((option, optionIndex) => (optionIndex === index ? value : option));
    const nextCorrectAnswers = draft.correctAnswers
      .map((answer) => (answer === oldOption ? value : answer))
      .filter((answer) => answer.trim() && nextOptions.includes(answer));
    onChange({ options: nextOptions, correctAnswers: nextCorrectAnswers });
  }

  function addOption() {
    onChange({ options: [...draft.options, ""] });
  }

  function removeOption(index) {
    const removedOption = draft.options[index];
    onChange({
      options: draft.options.filter((_, optionIndex) => optionIndex !== index),
      correctAnswers: draft.correctAnswers.filter((answer) => answer !== removedOption),
    });
  }

  function toggleCorrectAnswer(option) {
    const exists = draft.correctAnswers.includes(option);
    onChange({
      correctAnswers: exists
        ? draft.correctAnswers.filter((answer) => answer !== option)
        : [...draft.correctAnswers, option],
    });
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalCard questionEditModal">
        <div className="sectionHeader">
          <div>
            <h3>Edit exam question</h3>
            <span className="small">Changes apply only to this exam question.</span>
          </div>
          <button className="btn btnTiny" type="button" onClick={onClose}>Close</button>
        </div>

        {error ? <div className="alert">{error}</div> : null}

        <div className="formGrid formGridTwo">
          <div className="field">
            <label className="label">Type</label>
            <select className="input" value={draft.type} onChange={(e) => onChange({ type: e.target.value })}>
              <option value="MCQ">MCQ</option>
              <option value="Text">Text</option>
              <option value="CSharp">C#</option>
              <option value="SQL">SQL</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Points</label>
            <input
              className="input"
              type="number"
              min="1"
              value={draft.points}
              onChange={(e) => onChange({ points: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Topic</label>
            <input className="input" value={draft.topic} onChange={(e) => onChange({ topic: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Difficulty</label>
            <select className="input" value={draft.difficulty} onChange={(e) => onChange({ difficulty: e.target.value })}>
              <option value="">Not set</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div className="field fieldSpanFull">
            <label className="label">Question text</label>
            <textarea
              className="input textarea"
              value={draft.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={5}
            />
          </div>

          {isMcq ? (
            <div className="field fieldSpanFull">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <label className="label">MCQ options</label>
                <button className="btn btnTiny" type="button" onClick={addOption}>Add option</button>
              </div>
              <div className="mcqOptionEditor">
                {draft.options.map((option, index) => (
                  <div className="questionOptionInput" key={`option-${index}`}>
                    <label className="toggleRow">
                      <input
                        type="checkbox"
                        checked={Boolean(option) && draft.correctAnswers.includes(option)}
                        onChange={() => toggleCorrectAnswer(option)}
                        disabled={!option.trim()}
                      />
                      Correct
                    </label>
                    <input
                      className="input"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    <button className="btn btnTiny" type="button" onClick={() => removeOption(index)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="field fieldSpanFull">
              <label className="label">Correct / model answer</label>
              <textarea
                className="input textarea"
                value={draft.correctAnswer}
                onChange={(e) => onChange({ correctAnswer: e.target.value })}
                rows={4}
              />
            </div>
          )}
        </div>

        <div className="formActionsBar">
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btnPrimary" type="button" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save question"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ReplaceQuestionModal({
  target,
  options,
  filters,
  selectedId,
  replacing,
  availableCount,
  onFiltersChange,
  onSelect,
  onClose,
  onConfirm,
}) {
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <section className="modalCard questionReplaceModal">
        <div className="sectionHeader">
          <div>
            <h3>Replace question</h3>
            <span className="small">Choose a replacement from the same course question bank.</span>
          </div>
          <button className="btn btnTiny" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="compactHelpPanel">
          Current: {truncateText(target.text, 120)}
        </div>

        <div className="filtersRow questionBankFilters questionSelectorFilters">
          <div className="field">
            <label className="label">Search</label>
            <input
              className="input"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Search replacement question"
            />
          </div>
          <div className="field">
            <label className="label">Type</label>
            <select className="input" value={filters.type} onChange={(e) => onFiltersChange({ type: e.target.value })}>
              <option value="">All types</option>
              <option value="MCQ">MCQ</option>
              <option value="Text">Text</option>
              <option value="CSharp">C#</option>
              <option value="SQL">SQL</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Topic</label>
            <input
              className="input"
              value={filters.topic}
              onChange={(e) => onFiltersChange({ topic: e.target.value })}
              placeholder="Module, chapter, topic"
            />
          </div>
          <div className="field">
            <label className="label">Difficulty</label>
            <select className="input" value={filters.difficulty} onChange={(e) => onFiltersChange({ difficulty: e.target.value })}>
              <option value="">All</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {options.length === 0 ? (
          <div className="emptyState">
            <strong>No replacements available</strong>
            <span>
              {availableCount === 0
                ? "This course question bank has no questions loaded yet."
                : "Adjust the filters, or add more unused questions to the course question bank."}
            </span>
          </div>
        ) : (
          <div className="compactTableWrap replacementList">
            <table className="compactTable">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Topic</th>
                  <th>Difficulty</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {options.slice(0, 10).map((question) => (
                  <tr key={question.id}>
                    <td>
                      <input
                        type="radio"
                        name="replacementQuestion"
                        checked={selectedId === question.id}
                        onChange={() => onSelect(question.id)}
                      />
                    </td>
                    <td>{truncateText(question.text, 120)}</td>
                    <td>{formatQuestionType(question.type)}</td>
                    <td>{question.topic || "-"}</td>
                    <td>{question.difficulty || "-"}</td>
                    <td>{question.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="formActionsBar">
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btnPrimary" type="button" onClick={onConfirm} disabled={replacing || !selectedId}>
            {replacing ? "Replacing..." : "Confirm replacement"}
          </button>
        </div>
      </section>
    </div>
  );
}

function formatQuestionType(type) {
  if (type === "CSharp") return "C#";
  return type;
}

function formatLockdownClient(value) {
  if (value === "SafeExamBrowser") return "Safe Exam Browser";
  if (value === "KioskClient") return "Kiosk client";
  if (value === "InstitutionalKiosk") return "Institutional kiosk";
  if (value === "StandardBrowser") return "Standard browser";
  return "Standard browser";
}

function parseTechnicalQuestion(question) {
  const isTechnical = question.type === "CSharp" || question.type === "SQL";
  if (!isTechnical) {
    return {
      isTechnical: false,
      prompt: question.text || "",
      schema: "",
      code: "",
      expected: "",
    };
  }

  const sections = String(question.text || "")
    .split(/\n---\n/g)
    .map((section) => section.trim())
    .filter(Boolean);

  const result = {
    isTechnical: true,
    prompt: "",
    schema: "",
    code: "",
    expected: "",
  };

  for (const section of sections) {
    if (section.startsWith("Prompt:\n")) {
      result.prompt = section.replace("Prompt:\n", "").trim();
    } else if (section.startsWith("Schema:\n")) {
      result.schema = section.replace("Schema:\n", "").trim();
    } else if (section.startsWith("Starter SQL:\n")) {
      result.code = section.replace("Starter SQL:\n", "").trim();
    } else if (section.startsWith("Starter C# code:\n")) {
      result.code = section.replace("Starter C# code:\n", "").trim();
    } else if (section.startsWith("Expected answer / grading note:\n")) {
      result.expected = section.replace("Expected answer / grading note:\n", "").trim();
    }
  }

  return result;
}

function formatOfferingLabel(offering) {
  const code = offering.course?.code || "Course";
  const name = offering.course?.name || "";
  const term = offering.term?.name || "Term";
  const year = offering.yearOfStudy ? `Year ${offering.yearOfStudy}` : "Year -";
  const semester = offering.semesterNo ? `Semester ${offering.semesterNo}` : "Semester -";
  const section = offering.sectionCode ? `Section ${offering.sectionCode}` : "Section -";

  return `${code}${name ? ` - ${name}` : ""} / ${term} / ${year}, ${semester}, ${section}`;
}

function formatAssessmentType(value) {
  const labels = {
    FinalExam: "Exam",
    Provim: "Exam",
    Exam: "Exam",
    Colloquium1: "Colloquium 1",
    "Colloquium 1": "Colloquium 1",
    Kollokfium1: "Colloquium 1",
    Colloquium2: "Colloquium 2",
    "Colloquium 2": "Colloquium 2",
    Kollokfium2: "Colloquium 2",
    RetakeExam: "Exam",
    PracticeExam: "Practice Assessment",
    Practice: "Practice Assessment",
    "Practice Assessment": "Practice Assessment",
  };
  return labels[value] || "Exam";
}

function formatExamPeriod(value) {
  const labels = {
    January: "January Exam Period",
    "January Exam Period": "January Exam Period",
    AfatiJanarit: "January Exam Period",
    AfatiPrillit: "April Exam Period",
    "April Exam Period": "April Exam Period",
    June: "June Exam Period",
    "June Exam Period": "June Exam Period",
    AfatiQershorit: "June Exam Period",
    September: "September Exam Period",
    "September Exam Period": "September Exam Period",
    AfatiShtatorit: "September Exam Period",
    AfatiTetorit: "October Exam Period",
    "October Exam Period": "October Exam Period",
    DuringSemester: "During semester",
    GjateSemestrit: "During semester",
    "During Semester": "During semester",
    Custom: "Custom",
  };
  return labels[value] || "January Exam Period";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isPositiveNumber(value) {
  return Number(value) > 0;
}

function buildPointDrafts(questionList) {
  return Object.fromEntries(
    (Array.isArray(questionList) ? questionList : []).map((question) => [question.id, String(question.points ?? 0)]),
  );
}

function buildEditDraft(question) {
  return {
    text: question.text || "",
    type: question.type || "MCQ",
    options: Array.isArray(question.options) && question.options.length > 0 ? question.options : ["", ""],
    correctAnswer: parseCorrectAnswerText(question.correctAnswer),
    correctAnswers: parseCorrectAnswers(question.correctAnswer),
    topic: question.topic || "",
    difficulty: question.difficulty || "",
    points: String(question.points ?? 1),
  };
}

function validateEditDraft(draft) {
  if (!draft.text.trim()) return "Question text is required.";
  if (!Number.isFinite(Number(draft.points)) || Number(draft.points) <= 0) return "Points must be greater than 0.";

  if (draft.type === "MCQ") {
    const options = normalizeOptions(draft.options);
    if (options.length < 2) return "MCQ questions need at least two options.";
    if (draft.correctAnswers.length === 0) return "Select at least one correct MCQ answer.";
    if (draft.correctAnswers.some((answer) => !options.includes(answer))) {
      return "Every correct answer must match one of the MCQ options.";
    }
  }

  return "";
}

function buildQuestionPayload(draft, originalQuestion) {
  const options = draft.type === "MCQ" ? normalizeOptions(draft.options) : [];

  return {
    text: draft.text.trim(),
    type: draft.type,
    courseId: originalQuestion.courseId || null,
    options,
    correctAnswer: draft.type === "MCQ" ? JSON.stringify(draft.correctAnswers) : draft.correctAnswer.trim(),
    topic: draft.topic.trim() || null,
    difficulty: draft.difficulty || null,
    points: Number(draft.points),
  };
}

function normalizeOptions(options) {
  return (Array.isArray(options) ? options : [])
    .map((option) => option.trim())
    .filter(Boolean);
}

function filterBankQuestions(questions, filters) {
  const search = filters.search.trim().toLowerCase();
  const topic = filters.topic.trim().toLowerCase();
  const type = filters.type;
  const difficulty = filters.difficulty;

  return questions.filter((question) => {
    if (type && question.type !== type) return false;
    if (difficulty && question.difficulty !== difficulty) return false;
    if (topic && !String(question.topic || "").toLowerCase().includes(topic)) return false;

    if (!search) return true;

    return [
      question.text,
      question.correctAnswer,
      question.topic,
      question.difficulty,
      question.type,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });
}

function parseCorrectAnswers(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((answer) => String(answer).trim()).filter(Boolean);
    }
  } catch {
    // Existing single-answer MCQ values are stored as plain text.
  }

  return [String(value).trim()].filter(Boolean);
}

function parseCorrectAnswerText(value) {
  const answers = parseCorrectAnswers(value);
  return answers.length > 1 ? answers.join(", ") : answers[0] || "";
}

function buildQuestionSignature(question) {
  return [
    question?.type || "",
    String(question?.text || "").trim().toLowerCase(),
    String(question?.correctAnswer || "").trim().toLowerCase(),
  ].join("::");
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text || "-";
  return `${text.slice(0, maxLength - 1).trim()}...`;
}
