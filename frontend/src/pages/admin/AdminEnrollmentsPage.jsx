import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppShell from "../../components/AppShell";
import SmuSourceBanner from "../../components/SmuSourceBanner";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useSmuIntegrationStatus } from "../../hooks/useSmuIntegrationStatus";
import { listUsers } from "../../lib/usersApi";
import {
  activateSemesterEnrollment,
  assignCarryOverOffering,
  cancelCarryOver,
  closeCarryOver,
  createStudentCarryOver,
  createSemesterEnrollment,
  listCourses,
  listOfferings,
  listSemesterEnrollments,
  listStudentCarryOvers,
  listStudentCourseEnrollments,
  listStudentSemesterEnrollments,
  listTerms,
  regularizeStudentCourseEnrollments,
} from "../../lib/academicApi";

const initialFilters = {
  search: "",
  termId: "",
  yearOfStudy: 1,
  semesterNo: 1,
  createStatus: "Pending",
  notes: "",
};

const STATUS_TONE = {
  Active: "statusLive",
  Eligible: "statusLive",
  AssignedToTerm: "statusLive",
  Pending: "statusDraft",
  Frozen: "statusDraft",
  Locked: "statusDraft",
  Completed: "statusLive",
  Withdrawn: "statusDraft",
  Closed: "statusDraft",
  Cancelled: "statusDraft",
  Open: "statusLive",
};

export default function AdminEnrollmentsPage() {
  const { t } = useTranslation();
  const tx = useCallback((key, options) => t(`adminEnrollments.${key}`, options), [t]);
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const smuStatus = useSmuIntegrationStatus();
  const [students, setStudents] = useState([]);
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [semesterEnrollments, setSemesterEnrollments] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [carryOverForm, setCarryOverForm] = useState({
    courseId: "",
    originTermId: "",
    originSemesterNo: 1,
    reason: "Failed",
  });
  const [unlockOfferingId, setUnlockOfferingId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [focusedStudentId, setFocusedStudentId] = useState("");
  const [focusedDetails, setFocusedDetails] = useState({
    semesterEnrollments: [],
    courseEnrollments: [],
    carryOvers: [],
  });
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [loadingFocusedDetails, setLoadingFocusedDetails] = useState(false);
  const [processingKey, setProcessingKey] = useState("");
  const [operationResults, setOperationResults] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);

  const visibleTerms = useMemo(
    () => terms.filter((term) => term.status !== "Closed" && term.status !== "Archived"),
    [terms],
  );
  const smuManaged = smuStatus.isConfigured;

  const validSemesterOptions = useMemo(
    () => getSemesterOptions(filters.yearOfStudy),
    [filters.yearOfStudy],
  );

  const filteredStudents = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    if (!query) return students;

    return students.filter((student) =>
      `${student.fullName} ${student.email}`.toLowerCase().includes(query)
    );
  }, [students, filters.search]);
  const studentPageCount = Math.max(1, Math.ceil(filteredStudents.length / studentPageSize));
  const visibleStudents = useMemo(() => {
    const startIndex = (studentPage - 1) * studentPageSize;
    return filteredStudents.slice(startIndex, startIndex + studentPageSize);
  }, [filteredStudents, studentPage, studentPageSize]);
  const studentStart = filteredStudents.length === 0 ? 0 : (studentPage - 1) * studentPageSize + 1;
  const studentEnd = Math.min(filteredStudents.length, studentPage * studentPageSize);

  const currentTerm = useMemo(
    () => terms.find((term) => term.id === filters.termId) || null,
    [terms, filters.termId],
  );

  const matchingSemesterEnrollments = useMemo(
    () =>
      semesterEnrollments.filter(
        (enrollment) =>
          enrollment.termId === filters.termId &&
          enrollment.yearOfStudy === Number(filters.yearOfStudy) &&
          enrollment.semesterNo === Number(filters.semesterNo),
      ),
    [semesterEnrollments, filters.termId, filters.yearOfStudy, filters.semesterNo],
  );

  const enrollmentLookup = useMemo(() => {
    const lookup = new Map();
    matchingSemesterEnrollments.forEach((enrollment) => {
      lookup.set(enrollment.studentId, enrollment);
    });
    return lookup;
  }, [matchingSemesterEnrollments]);

  const activeEnrollmentsCount = useMemo(
    () => matchingSemesterEnrollments.filter((enrollment) => enrollment.status === "Active").length,
    [matchingSemesterEnrollments],
  );

  const pendingEnrollmentsCount = useMemo(
    () => matchingSemesterEnrollments.filter((enrollment) => enrollment.status === "Pending").length,
    [matchingSemesterEnrollments],
  );

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      setPageError("");

      const [termData, studentData, enrollmentData, courseData, offeringData] = await Promise.all([
        listTerms(),
        listUsers({ role: "Student", isActive: true }),
        listSemesterEnrollments(),
        listCourses(),
        listOfferings(),
      ]);

      setTerms(Array.isArray(termData) ? termData : []);
      setStudents(Array.isArray(studentData) ? studentData : []);
      setSemesterEnrollments(Array.isArray(enrollmentData) ? enrollmentData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
      setOfferings(Array.isArray(offeringData) ? offeringData : []);
    } catch (error) {
      setPageError(readError(error, tx("errors.loadData")));
    } finally {
      setLoadingData(false);
    }
  }, [tx]);

  const loadFocusedStudentDetails = useCallback(
    async (studentId, termId) => {
      if (!studentId) {
        setFocusedDetails({
          semesterEnrollments: [],
          courseEnrollments: [],
          carryOvers: [],
        });
        return;
      }

      try {
        setLoadingFocusedDetails(true);
        const [studentSemesterData, courseEnrollmentData, carryOverData] = await Promise.all([
          listStudentSemesterEnrollments(studentId),
          listStudentCourseEnrollments(studentId, termId || undefined),
          listStudentCarryOvers(studentId),
        ]);

        setFocusedDetails({
          semesterEnrollments: Array.isArray(studentSemesterData) ? studentSemesterData : [],
          courseEnrollments: Array.isArray(courseEnrollmentData) ? courseEnrollmentData : [],
          carryOvers: Array.isArray(carryOverData) ? carryOverData : [],
        });
      } catch (error) {
        setPageError(readError(error, tx("errors.focusedDetails")));
      } finally {
        setLoadingFocusedDetails(false);
      }
    },
    [tx],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!filters.termId && visibleTerms.length > 0) {
      const preferredTerm = visibleTerms.find((term) => term.isCurrent) || visibleTerms[0];
      setFilters((current) => ({ ...current, termId: preferredTerm.id }));
    }
  }, [visibleTerms, filters.termId]);

  useEffect(() => {
    if (!carryOverForm.originTermId && terms.length > 0) {
      const previousTerm = [...terms]
        .filter((term) => term.id !== filters.termId)
        .sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0))[0];
      const fallbackTerm = previousTerm || terms[0];
      setCarryOverForm((current) => ({ ...current, originTermId: fallbackTerm.id }));
    }
  }, [terms, filters.termId, carryOverForm.originTermId]);

  useEffect(() => {
    if (!validSemesterOptions.includes(Number(filters.semesterNo))) {
      setFilters((current) => ({ ...current, semesterNo: validSemesterOptions[0] || 1 }));
    }
  }, [filters.semesterNo, validSemesterOptions]);

  useEffect(() => {
    setStudentPage(1);
  }, [filters.search, studentPageSize]);

  useEffect(() => {
    setStudentPage((current) => Math.min(current, studentPageCount));
  }, [studentPageCount]);

  useEffect(() => {
    if (!focusedStudentId && students.length > 0) {
      setFocusedStudentId(students[0].id);
    }
  }, [students, focusedStudentId]);

  useEffect(() => {
    if (!focusedStudentId) return;
    loadFocusedStudentDetails(focusedStudentId, filters.termId);
  }, [focusedStudentId, filters.termId, loadFocusedStudentDetails]);

  async function handleCreateEnrollments() {
    if (smuManaged) {
      setPageError(tx("errors.smuSemesterManaged"));
      return;
    }
    if (!filters.termId) {
      setPageError(tx("errors.selectTermCreate"));
      return;
    }

    if (selectedStudentIds.length === 0) {
      setPageError(tx("errors.selectStudentCreate"));
      return;
    }

    setProcessingKey("create");
    setPageError("");
    setPageSuccess("");

    const selectedStudentsMap = new Map(students.map((student) => [student.id, student]));
    const results = [];

    for (const studentId of selectedStudentIds) {
      const existingEnrollment = enrollmentLookup.get(studentId);

      if (existingEnrollment && existingEnrollment.status !== "Withdrawn") {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || tx("student"),
          action: tx("actionCreateEnrollment"),
          outcome: tx("outcomeSkipped"),
          message: tx("messages.existingEnrollment", { status: tx(`status.${existingEnrollment.status}`, { defaultValue: existingEnrollment.status }).toLowerCase() }),
        });
        continue;
      }

      try {
        await createSemesterEnrollment(studentId, {
          termId: filters.termId,
          yearOfStudy: Number(filters.yearOfStudy),
          semesterNo: Number(filters.semesterNo),
          status: filters.createStatus,
          notes: filters.notes.trim(),
        });

        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || tx("student"),
          action: tx("actionCreateEnrollment"),
          outcome: tx("outcomeCreated"),
          message: tx("messages.enrollmentCreated", { status: tx(`status.${filters.createStatus}`, { defaultValue: filters.createStatus }) }),
        });
      } catch (error) {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || tx("student"),
          action: tx("actionCreateEnrollment"),
          outcome: tx("outcomeFailed"),
          message: readError(error, tx("errors.createEnrollment")),
        });
      }
    }

    setOperationResults(results);
    setPageSuccess(buildBatchMessage(results, tx("batchLabels.semesterEnrollments"), tx));
    setProcessingKey("");
    await loadData();
    if (focusedStudentId) {
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    }
  }

  async function handleActivateEnrollments() {
    if (smuManaged) {
      setPageError(tx("errors.smuActivationManaged"));
      return;
    }
    if (selectedStudentIds.length === 0) {
      setPageError(tx("errors.selectStudentActivation"));
      return;
    }

    setProcessingKey("activate");
    setPageError("");
    setPageSuccess("");

    const selectedStudentsMap = new Map(students.map((student) => [student.id, student]));
    const results = [];

    for (const studentId of selectedStudentIds) {
      const currentEnrollment = enrollmentLookup.get(studentId);

      if (!currentEnrollment) {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || tx("student"),
          action: tx("actionActivateEnrollment"),
          outcome: tx("outcomeSkipped"),
          message: tx("messages.noEnrollment"),
        });
        continue;
      }

      if (currentEnrollment.status === "Active") {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || tx("student"),
          action: tx("actionActivateEnrollment"),
          outcome: tx("outcomeSkipped"),
          message: tx("messages.alreadyActive"),
        });
        continue;
      }

      try {
        await activateSemesterEnrollment(currentEnrollment.id);
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || tx("student"),
          action: tx("actionActivateEnrollment"),
          outcome: tx("outcomeActivated"),
          message: tx("messages.movedActive"),
        });
      } catch (error) {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || tx("student"),
          action: tx("actionActivateEnrollment"),
          outcome: tx("outcomeFailed"),
          message: readError(error, tx("errors.activation")),
        });
      }
    }

    setOperationResults(results);
    setPageSuccess(buildBatchMessage(results, tx("batchLabels.activationRequests"), tx));
    setProcessingKey("");
    await loadData();
    if (focusedStudentId) {
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    }
  }

  async function handleRegularizeEnrollments() {
    if (smuManaged) {
      setPageError(tx("errors.smuCourseManaged"));
      return;
    }
    if (!filters.termId) {
      setPageError(tx("errors.selectTermGenerate"));
      return;
    }

    if (selectedStudentIds.length === 0) {
      setPageError(tx("errors.selectStudentGenerate"));
      return;
    }

    setProcessingKey("regularize");
    setPageError("");
    setPageSuccess("");

    const selectedStudentsMap = new Map(students.map((student) => [student.id, student]));
    const results = [];

    for (const studentId of selectedStudentIds) {
      try {
        const result = await regularizeStudentCourseEnrollments(studentId, filters.termId);
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || tx("student"),
          action: tx("actionGenerateCourses"),
          outcome: tx("outcomeCompleted"),
          message: tx("messages.courseEnrollmentsCreated", { count: result?.created ?? 0 }),
        });
      } catch (error) {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || tx("student"),
          action: tx("actionGenerateCourses"),
          outcome: tx("outcomeFailed"),
          message: readError(error, tx("errors.courseGeneration")),
        });
      }
    }

    setOperationResults(results);
    setPageSuccess(buildBatchMessage(results, tx("batchLabels.courseRegularization"), tx));
    setProcessingKey("");
    if (focusedStudentId) {
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    }
  }

  async function handleCreateCarryOver() {
    if (!focusedStudentId) {
      setPageError(tx("errors.selectStudentCarryCreate"));
      return;
    }

    if (!carryOverForm.courseId || !carryOverForm.originTermId) {
      setPageError(tx("errors.selectCarryCourseTerm"));
      return;
    }

    try {
      setProcessingKey("create-carry-over");
      setPageError("");
      setPageSuccess("");
      await createStudentCarryOver(focusedStudentId, {
        courseId: carryOverForm.courseId,
        originTermId: carryOverForm.originTermId,
        originSemesterNo: Number(carryOverForm.originSemesterNo),
        reason: carryOverForm.reason,
      });
      setPageSuccess(tx("messages.carryOverCreated"));
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    } catch (error) {
      setPageError(readError(error, tx("errors.carryCreate")));
    } finally {
      setProcessingKey("");
    }
  }

  async function handleAssignCarryOver(carryOverId) {
    if (!unlockOfferingId) {
      setPageError(tx("errors.selectTargetOffering"));
      return;
    }

    try {
      setProcessingKey(`assign-${carryOverId}`);
      setPageError("");
      setPageSuccess("");
      await assignCarryOverOffering(carryOverId, { courseOfferingId: unlockOfferingId });
      setPageSuccess(tx("messages.carryOverUnlocked"));
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    } catch (error) {
      setPageError(readError(error, tx("errors.carryUnlock")));
    } finally {
      setProcessingKey("");
    }
  }

  async function handleCloseCarryOver(carryOverId) {
    try {
      setProcessingKey(`close-${carryOverId}`);
      setPageError("");
      setPageSuccess("");
      await closeCarryOver(carryOverId, unlockOfferingId ? { courseOfferingId: unlockOfferingId } : {});
      setPageSuccess(tx("messages.carryOverClosed"));
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    } catch (error) {
      setPageError(readError(error, tx("errors.carryClose")));
    } finally {
      setProcessingKey("");
    }
  }

  async function handleCancelCarryOver(carryOverId) {
    try {
      setProcessingKey(`cancel-${carryOverId}`);
      setPageError("");
      setPageSuccess("");
      await cancelCarryOver(carryOverId);
      setPageSuccess(tx("messages.carryOverCancelled"));
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    } catch (error) {
      setPageError(readError(error, tx("errors.carryCancel")));
    } finally {
      setProcessingKey("");
    }
  }

  function toggleStudentSelection(studentId) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  }

  function toggleSelectAllVisible() {
    const visibleIds = visibleStudents.map((student) => student.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.includes(id));

    setSelectedStudentIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function runConfirmedAction() {
    if (!confirmAction?.onConfirm) return;
    const nextAction = confirmAction;
    setConfirmAction(null);
    await nextAction.onConfirm();
  }

  if (userLoading) return <div className="pageState">{tx("loading")}</div>;
  if (!user) return <div className="pageState">{userError || tx("userError")}</div>;

  const focusedStudent = students.find((student) => student.id === focusedStudentId) || null;
  const allVisibleSelected =
    visibleStudents.length > 0 && visibleStudents.every((student) => selectedStudentIds.includes(student.id));

  return (
    <AppShell
      user={user}
      badge={tx("badge")}
      title={tx("title")}
      subtitle={tx("subtitle")}
      actions={
        <>
          <Link className="btn" to="/admin/academic">{tx("academicSetup")}</Link>
          <Link className="btn" to="/admin/users">{tx("userManagement")}</Link>
          <Link className="btn" to="/dashboard">{tx("backToOverview")}</Link>
        </>
      }
    >
      <div className="stackXl">
        {pageError ? <div className="alert">{pageError}</div> : null}
        {pageSuccess ? <div className="successBanner">{pageSuccess}</div> : null}
        <SmuSourceBanner
          title={tx("smuTitle")}
          description={tx("smuDescription")}
          isConfigured={smuStatus.isConfigured}
          loading={smuStatus.loading}
          error={smuStatus.error}
        />

        <section className="summaryStrip">
          <article className="summaryCard">
            <span className="summaryLabel">{tx("selectedStudents")}</span>
            <strong>{selectedStudentIds.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{tx("currentCohortEnrollments")}</span>
            <strong>{matchingSemesterEnrollments.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{tx("activeInCohort")}</span>
            <strong>{activeEnrollmentsCount}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">{tx("pendingInCohort")}</span>
            <strong>{pendingEnrollmentsCount}</strong>
          </article>
        </section>

        <section className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>{tx("cohortSetup")}</h3>
              <span className="sectionMeta">{smuManaged ? tx("cohortSetupSynced") : tx("cohortSetupManual")}</span>
            </div>
            <span className={`statusPill ${smuManaged ? "statusLive" : "statusDraft"}`}>{smuManaged ? tx("smuReview") : tx("step1")}</span>
          </div>
          <div className="sectionBody stackLg">
            <div className="formGrid formGridThree">
              <div className="field">
                <label className="label">{tx("term")}</label>
                <select
                  className="input"
                  value={filters.termId}
                  onChange={(e) => setFilters((current) => ({ ...current, termId: e.target.value }))}
                >
                  <option value="">{tx("selectTerm")}</option>
                  {visibleTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.code} - {term.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">{tx("yearOfStudy")}</label>
                <select
                  className="input"
                  value={filters.yearOfStudy}
                  onChange={(e) =>
                    setFilters((current) => ({ ...current, yearOfStudy: Number(e.target.value) }))
                  }
                >
                  <option value={1}>{tx("year", { count: 1 })}</option>
                  <option value={2}>{tx("year", { count: 2 })}</option>
                  <option value={3}>{tx("year", { count: 3 })}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{tx("semesterNumber")}</label>
                <select
                  className="input"
                  value={filters.semesterNo}
                  onChange={(e) =>
                    setFilters((current) => ({ ...current, semesterNo: Number(e.target.value) }))
                  }
                >
                  {validSemesterOptions.map((semester) => (
                    <option key={semester} value={semester}>
                      {tx("semester", { count: semester })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="threeColGrid">
              <div className="field">
                <label className="label">{tx("createStatus")}</label>
                <select
                  className="input"
                  value={filters.createStatus}
                  onChange={(e) => setFilters((current) => ({ ...current, createStatus: e.target.value }))}
                  disabled={smuManaged}
                >
                  <option value="Pending">{tx("status.Pending")}</option>
                  <option value="Active">{tx("status.Active")}</option>
                </select>
              </div>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <label className="label">{tx("adminNotes")}</label>
                <input
                  className="input"
                  value={filters.notes}
                  onChange={(e) => setFilters((current) => ({ ...current, notes: e.target.value }))}
                  placeholder={tx("notesPlaceholder")}
                  disabled={smuManaged}
                />
              </div>
            </div>

            <div className="pageStateCard">
              <strong>{tx("currentCohortTarget")}</strong>{" "}
              {currentTerm
                ? `${currentTerm.name} | ${tx("year", { count: filters.yearOfStudy })} | ${tx("semester", { count: filters.semesterNo })}`
                : tx("selectTermToStart")}
              {smuManaged ? <span className="blockHint">{tx("smuLocksInputs")}</span> : null}
            </div>
          </div>
        </section>

        <section className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>{tx("studentCohortSelection")}</h3>
              <span className="sectionMeta">{tx("showingStudents", { start: studentStart, end: studentEnd, count: filteredStudents.length })}</span>
            </div>
            <span className="statusPill statusLive">{tx("selectedCount", { count: selectedStudentIds.length })}</span>
          </div>
          <div className="sectionBody stackLg">
            <div className="filtersRow">
              <input
                className="input"
                placeholder={tx("searchStudents")}
                value={filters.search}
                onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
              />
              <button className="btn" type="button" onClick={toggleSelectAllVisible}>
                {allVisibleSelected ? tx("clearPageSelection") : tx("selectCurrentPage")}
              </button>
              <select className="input inputCompact" value={studentPageSize} onChange={(e) => setStudentPageSize(Number(e.target.value))} aria-label={tx("studentsPerPage")}>
                <option value={10}>{tx("rows", { count: 10 })}</option>
                <option value={25}>{tx("rows", { count: 25 })}</option>
                <option value={50}>{tx("rows", { count: 50 })}</option>
              </select>
            </div>

            {loadingData ? (
              <div className="pageStateCard">{tx("loadingStudents")}</div>
            ) : (
              <div className="stackLg">
                <div className="tableWrap adminDirectoryTableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>{tx("select")}</th>
                        <th>{tx("student")}</th>
                        <th>{tx("email")}</th>
                        <th>{tx("cohortEnrollment")}</th>
                        <th>{tx("actionFocus")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5}>{tx("noStudents")}</td>
                        </tr>
                      ) : visibleStudents.map((student) => {
                        const enrollment = enrollmentLookup.get(student.id);
                        const isSelected = selectedStudentIds.includes(student.id);
                        const isFocused = focusedStudentId === student.id;

                        return (
                          <tr key={student.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudentSelection(student.id)}
                              />
                            </td>
                            <td>{student.fullName}</td>
                            <td>{student.email}</td>
                            <td>
                              {enrollment ? (
                                <span className={`statusPill ${STATUS_TONE[enrollment.status] || "statusDraft"}`}>
                                  {tx(`status.${enrollment.status}`, { defaultValue: enrollment.status })}
                                </span>
                              ) : (
                                <span className="small">{tx("notRegistered")}</span>
                              )}
                            </td>
                            <td>
                              <button
                                className={`btn${isFocused ? " btnPrimary" : ""}`}
                                type="button"
                                onClick={() => setFocusedStudentId(student.id)}
                              >
                                {isFocused ? tx("inspecting") : tx("inspect")}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="paginationBar">
                  <span>{tx("showingStudents", { start: studentStart, end: studentEnd, count: filteredStudents.length })}</span>
                  <div className="paginationActions">
                    <button className="btn" type="button" disabled={studentPage <= 1} onClick={() => setStudentPage((current) => Math.max(1, current - 1))}>
                      {tx("previous")}
                    </button>
                    <span className="paginationCurrent">{tx("pageOf", { page: studentPage, count: studentPageCount })}</span>
                    <button className="btn" type="button" disabled={studentPage >= studentPageCount} onClick={() => setStudentPage((current) => Math.min(studentPageCount, current + 1))}>
                      {tx("next")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="formActionsBar formActionsBarStart">
              <button
                className="btn btnPrimary"
                type="button"
                disabled={smuManaged || processingKey !== "" || selectedStudentIds.length === 0}
                onClick={handleCreateEnrollments}
              >
                {processingKey === "create" ? tx("creating") : tx("createEnrollments")}
              </button>
              <button
                className="btn"
                type="button"
                disabled={smuManaged || processingKey !== "" || selectedStudentIds.length === 0}
                onClick={() =>
                  setConfirmAction({
                    title: tx("activateTitle"),
                    text: tx("activateText", { count: selectedStudentIds.length }),
                    confirmLabel: tx("activateEnrollments"),
                    onConfirm: handleActivateEnrollments,
                  })
                }
              >
                {processingKey === "activate" ? tx("activating") : tx("activateEnrollments")}
              </button>
              <button
                className="btn"
                type="button"
                disabled={smuManaged || processingKey !== "" || selectedStudentIds.length === 0 || !filters.termId}
                onClick={() =>
                  setConfirmAction({
                    title: tx("generateTitle"),
                    text: tx("generateText", { count: selectedStudentIds.length }),
                    confirmLabel: tx("generateCourses"),
                    onConfirm: handleRegularizeEnrollments,
                  })
                }
              >
                {processingKey === "regularize" ? tx("generating") : tx("generateCurrentCourses")}
              </button>
            </div>
            {smuManaged ? (
              <div className="pageStateCard">
                {tx("smuOwnsCohort")}
              </div>
            ) : null}
          </div>
        </section>

        <section className="dashboardGrid dashboardGridWide">
          <article className="surfaceCard">
            <div className="sectionHeader">
              <div>
                <h3>{tx("focusedStudentView")}</h3>
                <span className="sectionMeta">{tx("focusedStudentMeta")}</span>
              </div>
            </div>
            <div className="sectionBody stackLg">
              {!focusedStudent ? (
                <div className="pageStateCard">{tx("selectStudentDetails")}</div>
              ) : loadingFocusedDetails ? (
                <div className="pageStateCard">{tx("loadingStudentDetails")}</div>
              ) : (
                <>
                  <div className="pageStateCard">
                    <strong>{focusedStudent.fullName}</strong>
                    <div className="small">{focusedStudent.email}</div>
                  </div>

                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>{tx("semesterEnrollments")}</th>
                          <th>{tx("term")}</th>
                          <th>{tx("yearSemester")}</th>
                          <th>{tx("statusLabel")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {focusedDetails.semesterEnrollments.length === 0 ? (
                          <tr>
                            <td colSpan={4}>{tx("noSemesterEnrollments")}</td>
                          </tr>
                        ) : (
                          focusedDetails.semesterEnrollments.map((enrollment) => (
                            <tr key={enrollment.id}>
                              <td>{enrollment.id.slice(0, 8)}</td>
                              <td>{enrollment.term?.code || "-"}</td>
                              <td>{enrollment.yearOfStudy} / {enrollment.semesterNo}</td>
                              <td>
                                <span className={`statusPill ${STATUS_TONE[enrollment.status] || "statusDraft"}`}>
                                  {tx(`status.${enrollment.status}`, { defaultValue: enrollment.status })}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>{tx("currentCourseEnrollments")}</th>
                          <th>{tx("offering")}</th>
                          <th>{tx("statusLabel")}</th>
                          <th>{tx("eligibleForExam")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {focusedDetails.courseEnrollments.length === 0 ? (
                          <tr>
                            <td colSpan={4}>{tx("noCourseEnrollments")}</td>
                          </tr>
                        ) : (
                          focusedDetails.courseEnrollments.map((enrollment) => (
                            <tr key={enrollment.id}>
                              <td>{enrollment.courseOffering?.course?.name || tx("offering")}</td>
                              <td>{enrollment.courseOffering?.term?.code || "-"} | {enrollment.courseOffering?.sectionCode || "-"}</td>
                              <td>
                                <span className={`statusPill ${STATUS_TONE[enrollment.status] || "statusDraft"}`}>
                                  {tx(`status.${enrollment.status}`, { defaultValue: enrollment.status })}
                                </span>
                              </td>
                              <td>{enrollment.eligibleForExam ? tx("yes") : tx("no")}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </article>

          <article className="surfaceCard">
            <div className="sectionHeader">
              <div>
                <h3>{tx("carryOverVisibility")}</h3>
                <span className="sectionMeta">{tx("carryOverMeta")}</span>
              </div>
            </div>
            <div className="sectionBody stackLg">
              <div className="pageStateCard">
                <strong>{tx("controlledUnlock")}</strong> {tx("controlledUnlockText")}
              </div>

              <div className="formGrid formGridTwo">
                <div className="field">
                  <label className="label">{tx("failedCourse")}</label>
                  <select
                    className="input"
                    value={carryOverForm.courseId}
                    onChange={(e) => setCarryOverForm((current) => ({ ...current, courseId: e.target.value }))}
                    disabled={!focusedStudent || processingKey !== ""}
                  >
                    <option value="">{tx("selectCourse")}</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">{tx("originTerm")}</label>
                  <select
                    className="input"
                    value={carryOverForm.originTermId}
                    onChange={(e) => setCarryOverForm((current) => ({ ...current, originTermId: e.target.value }))}
                    disabled={!focusedStudent || processingKey !== ""}
                  >
                    <option value="">{tx("selectTerm")}</option>
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.code} - {term.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">{tx("originSemester")}</label>
                  <select
                    className="input"
                    value={carryOverForm.originSemesterNo}
                    onChange={(e) => setCarryOverForm((current) => ({ ...current, originSemesterNo: Number(e.target.value) }))}
                    disabled={!focusedStudent || processingKey !== ""}
                  >
                    {[1, 2, 3, 4, 5, 6].map((semester) => (
                      <option key={semester} value={semester}>{tx("semester", { count: semester })}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">{tx("reason")}</label>
                  <select
                    className="input"
                    value={carryOverForm.reason}
                    onChange={(e) => setCarryOverForm((current) => ({ ...current, reason: e.target.value }))}
                    disabled={!focusedStudent || processingKey !== ""}
                  >
                    <option value="Failed">{tx("reasonFailed")}</option>
                    <option value="Absent">{tx("reasonAbsent")}</option>
                    <option value="Deferred">{tx("reasonDeferred")}</option>
                    <option value="NotCompleted">{tx("reasonNotCompleted")}</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="label">{tx("targetOffering")}</label>
                <select
                  className="input"
                  value={unlockOfferingId}
                  onChange={(e) => setUnlockOfferingId(e.target.value)}
                  disabled={!focusedStudent || processingKey !== ""}
                >
                  <option value="">{tx("selectOfferingUnlock")}</option>
                  {offerings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {formatOfferingLabel(offering)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row" style={{ justifyContent: "flex-start" }}>
                <button
                  className="btn btnPrimary"
                  type="button"
                  onClick={handleCreateCarryOver}
                  disabled={!focusedStudent || processingKey !== ""}
                >
                  {processingKey === "create-carry-over" ? tx("creating") : tx("createCarryOver")}
                </button>
              </div>

              {!focusedStudent ? (
                <div className="pageStateCard">{tx("selectStudentCarryOver")}</div>
              ) : loadingFocusedDetails ? (
                <div className="pageStateCard">{tx("loadingCarryOver")}</div>
              ) : (
                <div className="tableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>{tx("course")}</th>
                        <th>{tx("originTerm")}</th>
                        <th>{tx("originSemester")}</th>
                        <th>{tx("statusLabel")}</th>
                        <th>{tx("unlockActions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {focusedDetails.carryOvers.length === 0 ? (
                        <tr>
                          <td colSpan={5}>{tx("noCarryOver")}</td>
                        </tr>
                      ) : (
                        focusedDetails.carryOvers.map((carryOver) => (
                          <tr key={carryOver.id}>
                            <td>{carryOver.course?.name || tx("course")}</td>
                            <td>{carryOver.originTerm?.code || "-"}</td>
                            <td>{carryOver.originSemesterNo}</td>
                            <td>
                              <span className={`statusPill ${STATUS_TONE[carryOver.status] || "statusDraft"}`}>
                                {tx(`status.${carryOver.status}`, { defaultValue: carryOver.status })}
                              </span>
                            </td>
                            <td>
                              <div className="resourceActionGroup">
                                {carryOver.status === "Open" ? (
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={() => handleAssignCarryOver(carryOver.id)}
                                    disabled={processingKey !== ""}
                                  >
                                    {processingKey === `assign-${carryOver.id}` ? tx("unlocking") : tx("unlock")}
                                  </button>
                                ) : null}
                                {carryOver.status !== "Closed" && carryOver.status !== "Cancelled" ? (
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={() =>
                                      setConfirmAction({
                                        title: tx("closeCarryOverTitle"),
                                        text: tx("closeCarryOverText"),
                                        confirmLabel: tx("closeRecord"),
                                        onConfirm: () => handleCloseCarryOver(carryOver.id),
                                      })
                                    }
                                    disabled={processingKey !== ""}
                                  >
                                    {processingKey === `close-${carryOver.id}` ? tx("closing") : tx("close")}
                                  </button>
                                ) : null}
                                {carryOver.status === "Open" ? (
                                  <button
                                    className="btn btnDanger"
                                    type="button"
                                    onClick={() =>
                                      setConfirmAction({
                                        title: tx("cancelCarryOverTitle"),
                                        text: tx("cancelCarryOverText"),
                                        confirmLabel: tx("cancelRecord"),
                                        onConfirm: () => handleCancelCarryOver(carryOver.id),
                                      })
                                    }
                                    disabled={processingKey !== ""}
                                  >
                                    {processingKey === `cancel-${carryOver.id}` ? tx("cancelling") : tx("cancel")}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>{tx("batchResults")}</h3>
              <span className="sectionMeta">{tx("batchResultsMeta")}</span>
            </div>
          </div>
          <div className="sectionBody">
            {operationResults.length === 0 ? (
              <div className="pageStateCard">
                {tx("batchResultsEmpty")}
              </div>
            ) : (
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>{tx("student")}</th>
                      <th>{tx("action")}</th>
                      <th>{tx("outcome")}</th>
                      <th>{tx("message")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationResults.map((item, index) => (
                      <tr key={`${item.studentId}-${item.action}-${index}`}>
                        <td>{item.studentName}</td>
                        <td>{item.action}</td>
                        <td>{item.outcome}</td>
                        <td>{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {confirmAction ? (
          <ConfirmDialog
            title={confirmAction.title}
            text={confirmAction.text}
            confirmLabel={confirmAction.confirmLabel}
            cancelLabel={tx("cancel")}
            summaryLabel={tx("confirmationRequired")}
            onCancel={() => setConfirmAction(null)}
            onConfirm={runConfirmedAction}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function ConfirmDialog({ title, text, confirmLabel, cancelLabel, summaryLabel, onCancel, onConfirm }) {
  return (
    <div className="modalBackdrop" role="presentation">
      <div className="modalCard confirmationDialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <span className="summaryLabel">{summaryLabel}</span>
        <h3 id="confirm-dialog-title">{title}</h3>
        <p>{text}</p>
        <div className="formActionsBar">
          <button className="btn" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn btnPrimary" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function getSemesterOptions(yearOfStudy) {
  const year = Number(yearOfStudy);
  if (year === 1) return [1, 2];
  if (year === 2) return [3, 4];
  if (year === 3) return [5, 6];
  return [1];
}

function readError(error, fallback) {
  return error?.response?.data?.message || fallback;
}

function buildBatchMessage(results, label, tx) {
  const successWords = new Set([tx("outcomeCreated"), tx("outcomeActivated"), tx("outcomeCompleted")]);
  const successCount = results.filter((item) => successWords.has(item.outcome)).length;
  const failedCount = results.filter((item) => item.outcome === tx("outcomeFailed")).length;
  const skippedCount = results.filter((item) => item.outcome === tx("outcomeSkipped")).length;

  return tx("processedSummary", {
    total: results.length,
    label,
    success: successCount,
    failed: failedCount,
    skipped: skippedCount,
  });
}

function formatOfferingLabel(offering) {
  const course = offering.course?.code
    ? `${offering.course.code} - ${offering.course.name || "Course"}`
    : "Course";
  const term = offering.term?.code || "Term";
  const semester = offering.semesterNo ? `S${offering.semesterNo}` : "S-";
  const section = offering.sectionCode || "-";
  const status = offering.status || "Draft";

  return `${course} / ${term} / ${semester} / Section ${section} / ${status}`;
}
