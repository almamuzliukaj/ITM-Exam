import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
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
  const { user, loading: userLoading, error: userError } = useCurrentUser();
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

  const visibleTerms = useMemo(
    () => terms.filter((term) => term.status !== "Closed" && term.status !== "Archived"),
    [terms],
  );

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
      setPageError(readError(error, "Failed to load enrollment data."));
    } finally {
      setLoadingData(false);
    }
  }, []);

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
        setPageError(readError(error, "Failed to load focused student details."));
      } finally {
        setLoadingFocusedDetails(false);
      }
    },
    [],
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
    if (!focusedStudentId && students.length > 0) {
      setFocusedStudentId(students[0].id);
    }
  }, [students, focusedStudentId]);

  useEffect(() => {
    if (!focusedStudentId) return;
    loadFocusedStudentDetails(focusedStudentId, filters.termId);
  }, [focusedStudentId, filters.termId, loadFocusedStudentDetails]);

  async function handleCreateEnrollments() {
    if (!filters.termId) {
      setPageError("Select a term before creating enrollments.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      setPageError("Select at least one student for cohort registration.");
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
          studentName: selectedStudentsMap.get(studentId)?.fullName || "Student",
          action: "Create semester enrollment",
          outcome: "Skipped",
          message: `Existing ${existingEnrollment.status.toLowerCase()} enrollment found for selected term.`,
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
          studentName: selectedStudentsMap.get(studentId)?.fullName || "Student",
          action: "Create semester enrollment",
          outcome: "Created",
          message: `${filters.createStatus} enrollment created.`,
        });
      } catch (error) {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || "Student",
          action: "Create semester enrollment",
          outcome: "Failed",
          message: readError(error, "Enrollment creation failed."),
        });
      }
    }

    setOperationResults(results);
    setPageSuccess(buildBatchMessage(results, "semester enrollments"));
    setProcessingKey("");
    await loadData();
    if (focusedStudentId) {
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    }
  }

  async function handleActivateEnrollments() {
    if (selectedStudentIds.length === 0) {
      setPageError("Select at least one student before activation.");
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
          studentName: selectedStudentsMap.get(studentId)?.fullName || "Student",
          action: "Activate semester enrollment",
          outcome: "Skipped",
          message: "No enrollment exists for the selected cohort.",
        });
        continue;
      }

      if (currentEnrollment.status === "Active") {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || "Student",
          action: "Activate semester enrollment",
          outcome: "Skipped",
          message: "Enrollment is already active.",
        });
        continue;
      }

      try {
        await activateSemesterEnrollment(currentEnrollment.id);
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || "Student",
          action: "Activate semester enrollment",
          outcome: "Activated",
          message: "Enrollment moved to active.",
        });
      } catch (error) {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || "Student",
          action: "Activate semester enrollment",
          outcome: "Failed",
          message: readError(error, "Activation failed."),
        });
      }
    }

    setOperationResults(results);
    setPageSuccess(buildBatchMessage(results, "activation requests"));
    setProcessingKey("");
    await loadData();
    if (focusedStudentId) {
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    }
  }

  async function handleRegularizeEnrollments() {
    if (!filters.termId) {
      setPageError("Select a term before generating course enrollments.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      setPageError("Select at least one student before generating current semester courses.");
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
          studentName: selectedStudentsMap.get(studentId)?.fullName || "Student",
          action: "Generate current semester courses",
          outcome: "Completed",
          message: `${result?.created ?? 0} course enrollments created.`,
        });
      } catch (error) {
        results.push({
          studentId,
          studentName: selectedStudentsMap.get(studentId)?.fullName || "Student",
          action: "Generate current semester courses",
          outcome: "Failed",
          message: readError(error, "Course enrollment generation failed."),
        });
      }
    }

    setOperationResults(results);
    setPageSuccess(buildBatchMessage(results, "course regularization requests"));
    setProcessingKey("");
    if (focusedStudentId) {
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    }
  }

  async function handleCreateCarryOver() {
    if (!focusedStudentId) {
      setPageError("Select a student before creating a carry-over record.");
      return;
    }

    if (!carryOverForm.courseId || !carryOverForm.originTermId) {
      setPageError("Select the failed course and origin term before creating carry-over.");
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
      setPageSuccess("Carry-over record created for the focused student.");
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    } catch (error) {
      setPageError(readError(error, "Carry-over creation failed."));
    } finally {
      setProcessingKey("");
    }
  }

  async function handleAssignCarryOver(carryOverId) {
    if (!unlockOfferingId) {
      setPageError("Select a target offering before unlocking this carry-over.");
      return;
    }

    try {
      setProcessingKey(`assign-${carryOverId}`);
      setPageError("");
      setPageSuccess("");
      await assignCarryOverOffering(carryOverId, { courseOfferingId: unlockOfferingId });
      setPageSuccess("Carry-over unlocked into the selected offering and exam eligibility was created.");
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    } catch (error) {
      setPageError(readError(error, "Carry-over unlock failed."));
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
      setPageSuccess("Carry-over record closed.");
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    } catch (error) {
      setPageError(readError(error, "Carry-over close failed."));
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
      setPageSuccess("Carry-over record cancelled.");
      await loadFocusedStudentDetails(focusedStudentId, filters.termId);
    } catch (error) {
      setPageError(readError(error, "Carry-over cancellation failed."));
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
    const visibleIds = filteredStudents.map((student) => student.id);
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

  if (userLoading) return <div className="pageState">Loading enrollment workspace...</div>;
  if (!user) return <div className="pageState">{userError || "Unable to load user profile."}</div>;

  const focusedStudent = students.find((student) => student.id === focusedStudentId) || null;
  const allVisibleSelected =
    filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIds.includes(student.id));

  return (
    <AppShell
      user={user}
      badge="Administration"
      title="Enrollment control"
      subtitle="Register current-semester cohorts, activate semester status, and generate eligible course enrollments for selected students."
      actions={
        <>
          <Link className="btn" to="/admin/academic">Academic setup</Link>
          <Link className="btn" to="/admin/users">User management</Link>
          <Link className="btn" to="/dashboard">Back to overview</Link>
        </>
      }
    >
      <div className="stackXl">
        {pageError ? <div className="alert">{pageError}</div> : null}
        {pageSuccess ? <div className="successBanner">{pageSuccess}</div> : null}
        <section className="smuNotice">
          <div>
            <span className="summaryLabel">SMU transition</span>
            <strong>Enrollment eligibility will be synced from SMU</strong>
            <p>Semester and course enrollments are shown here for review and fallback operations until the SMU sync becomes the source of truth.</p>
          </div>
          <Link className="btn" to="/admin/smu">Review SMU contract</Link>
        </section>

        <section className="summaryStrip">
          <article className="summaryCard">
            <span className="summaryLabel">Selected students</span>
            <strong>{selectedStudentIds.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Current cohort enrollments</span>
            <strong>{matchingSemesterEnrollments.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Active in selected cohort</span>
            <strong>{activeEnrollmentsCount}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Pending in selected cohort</span>
            <strong>{pendingEnrollmentsCount}</strong>
          </article>
        </section>

        <section className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>Cohort setup</h3>
              <span className="sectionMeta">Choose the academic term, study year, semester, and default enrollment status.</span>
            </div>
            <span className="statusPill statusDraft">Step 1</span>
          </div>
          <div className="sectionBody stackLg">
            <div className="formGrid formGridThree">
              <div className="field">
                <label className="label">Term</label>
                <select
                  className="input"
                  value={filters.termId}
                  onChange={(e) => setFilters((current) => ({ ...current, termId: e.target.value }))}
                >
                  <option value="">Select term</option>
                  {visibleTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.code} - {term.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Year of study</label>
                <select
                  className="input"
                  value={filters.yearOfStudy}
                  onChange={(e) =>
                    setFilters((current) => ({ ...current, yearOfStudy: Number(e.target.value) }))
                  }
                >
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Semester number</label>
                <select
                  className="input"
                  value={filters.semesterNo}
                  onChange={(e) =>
                    setFilters((current) => ({ ...current, semesterNo: Number(e.target.value) }))
                  }
                >
                  {validSemesterOptions.map((semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="threeColGrid">
              <div className="field">
                <label className="label">Create enrollment status</label>
                <select
                  className="input"
                  value={filters.createStatus}
                  onChange={(e) => setFilters((current) => ({ ...current, createStatus: e.target.value }))}
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                </select>
              </div>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <label className="label">Admin notes</label>
                <input
                  className="input"
                  value={filters.notes}
                  onChange={(e) => setFilters((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Optional note for cohort registration batch"
                />
              </div>
            </div>

            <div className="pageStateCard">
              <strong>Current cohort target:</strong>{" "}
              {currentTerm
                ? `${currentTerm.name} | Year ${filters.yearOfStudy} | Semester ${filters.semesterNo}`
                : "Select a term to start cohort registration."}
            </div>
          </div>
        </section>

        <section className="surfaceCard">
          <div className="sectionHeader">
            <div>
              <h3>Student cohort selection</h3>
              <span className="sectionMeta">Filter students, select the cohort, then run the required academic operation.</span>
            </div>
            <span className="statusPill statusLive">{selectedStudentIds.length} selected</span>
          </div>
          <div className="sectionBody stackLg">
            <div className="filtersRow">
              <input
                className="input"
                placeholder="Search active students by name or email"
                value={filters.search}
                onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
              />
              <button className="btn" type="button" onClick={toggleSelectAllVisible}>
                {allVisibleSelected ? "Clear visible selection" : "Select visible students"}
              </button>
            </div>

            {loadingData ? (
              <div className="pageStateCard">Loading student cohort data...</div>
            ) : (
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Cohort enrollment</th>
                      <th>Action focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
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
                                {enrollment.status}
                              </span>
                            ) : (
                              <span className="small">Not registered for selected cohort</span>
                            )}
                          </td>
                          <td>
                            <button
                              className={`btn${isFocused ? " btnPrimary" : ""}`}
                              type="button"
                              onClick={() => setFocusedStudentId(student.id)}
                            >
                              {isFocused ? "Inspecting" : "Inspect"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="formActionsBar formActionsBarStart">
              <button
                className="btn btnPrimary"
                type="button"
                disabled={processingKey !== "" || selectedStudentIds.length === 0}
                onClick={handleCreateEnrollments}
              >
                {processingKey === "create" ? "Creating..." : "Create semester enrollments"}
              </button>
              <button
                className="btn"
                type="button"
                disabled={processingKey !== "" || selectedStudentIds.length === 0}
                onClick={() =>
                  setConfirmAction({
                    title: "Activate selected enrollments?",
                    text: `This will move ${selectedStudentIds.length} selected student enrollment(s) to active where an enrollment exists.`,
                    confirmLabel: "Activate enrollments",
                    onConfirm: handleActivateEnrollments,
                  })
                }
              >
                {processingKey === "activate" ? "Activating..." : "Activate selected enrollments"}
              </button>
              <button
                className="btn"
                type="button"
                disabled={processingKey !== "" || selectedStudentIds.length === 0 || !filters.termId}
                onClick={() =>
                  setConfirmAction({
                    title: "Generate course enrollments?",
                    text: `This will generate current semester course enrollments for ${selectedStudentIds.length} selected student(s).`,
                    confirmLabel: "Generate courses",
                    onConfirm: handleRegularizeEnrollments,
                  })
                }
              >
                {processingKey === "regularize" ? "Generating..." : "Generate current semester courses"}
              </button>
            </div>
          </div>
        </section>

        <section className="dashboardGrid dashboardGridWide">
          <article className="surfaceCard">
            <div className="sectionHeader">
              <div>
                <h3>Focused student view</h3>
                <span className="sectionMeta">Inspect semester and course eligibility for the selected student.</span>
              </div>
            </div>
            <div className="sectionBody stackLg">
              {!focusedStudent ? (
                <div className="pageStateCard">Select a student to inspect enrollment details.</div>
              ) : loadingFocusedDetails ? (
                <div className="pageStateCard">Loading student enrollment details...</div>
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
                          <th>Semester enrollments</th>
                          <th>Term</th>
                          <th>Year / Semester</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {focusedDetails.semesterEnrollments.length === 0 ? (
                          <tr>
                            <td colSpan={4}>No semester enrollments found.</td>
                          </tr>
                        ) : (
                          focusedDetails.semesterEnrollments.map((enrollment) => (
                            <tr key={enrollment.id}>
                              <td>{enrollment.id.slice(0, 8)}</td>
                              <td>{enrollment.term?.code || "-"}</td>
                              <td>{enrollment.yearOfStudy} / {enrollment.semesterNo}</td>
                              <td>
                                <span className={`statusPill ${STATUS_TONE[enrollment.status] || "statusDraft"}`}>
                                  {enrollment.status}
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
                          <th>Current course enrollments</th>
                          <th>Offering</th>
                          <th>Status</th>
                          <th>Eligible for exam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {focusedDetails.courseEnrollments.length === 0 ? (
                          <tr>
                            <td colSpan={4}>No course enrollments found for the selected term.</td>
                          </tr>
                        ) : (
                          focusedDetails.courseEnrollments.map((enrollment) => (
                            <tr key={enrollment.id}>
                              <td>{enrollment.courseOffering?.course?.name || "Offering"}</td>
                              <td>{enrollment.courseOffering?.term?.code || "-"} | {enrollment.courseOffering?.sectionCode || "-"}</td>
                              <td>
                                <span className={`statusPill ${STATUS_TONE[enrollment.status] || "statusDraft"}`}>
                                  {enrollment.status}
                                </span>
                              </td>
                              <td>{enrollment.eligibleForExam ? "Yes" : "No"}</td>
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
                <h3>Carry-over visibility</h3>
                <span className="sectionMeta">Create, unlock, close, or cancel carry-over records with clear status feedback.</span>
              </div>
            </div>
            <div className="sectionBody stackLg">
              <div className="pageStateCard">
                <strong>Controlled unlock flow:</strong> create a carry-over from a previous semester, then assign it to an active offering to create exam eligibility.
              </div>

              <div className="formGrid formGridTwo">
                <div className="field">
                  <label className="label">Failed / carried course</label>
                  <select
                    className="input"
                    value={carryOverForm.courseId}
                    onChange={(e) => setCarryOverForm((current) => ({ ...current, courseId: e.target.value }))}
                    disabled={!focusedStudent || processingKey !== ""}
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Origin term</label>
                  <select
                    className="input"
                    value={carryOverForm.originTermId}
                    onChange={(e) => setCarryOverForm((current) => ({ ...current, originTermId: e.target.value }))}
                    disabled={!focusedStudent || processingKey !== ""}
                  >
                    <option value="">Select term</option>
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.code} - {term.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Origin semester</label>
                  <select
                    className="input"
                    value={carryOverForm.originSemesterNo}
                    onChange={(e) => setCarryOverForm((current) => ({ ...current, originSemesterNo: Number(e.target.value) }))}
                    disabled={!focusedStudent || processingKey !== ""}
                  >
                    {[1, 2, 3, 4, 5, 6].map((semester) => (
                      <option key={semester} value={semester}>Semester {semester}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Reason</label>
                  <select
                    className="input"
                    value={carryOverForm.reason}
                    onChange={(e) => setCarryOverForm((current) => ({ ...current, reason: e.target.value }))}
                    disabled={!focusedStudent || processingKey !== ""}
                  >
                    <option value="Failed">Failed</option>
                    <option value="Absent">Absent</option>
                    <option value="Deferred">Deferred</option>
                    <option value="NotCompleted">Not completed</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="label">Target offering for unlock</label>
                <select
                  className="input"
                  value={unlockOfferingId}
                  onChange={(e) => setUnlockOfferingId(e.target.value)}
                  disabled={!focusedStudent || processingKey !== ""}
                >
                  <option value="">Select offering when assigning carry-over</option>
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
                  {processingKey === "create-carry-over" ? "Creating..." : "Create carry-over"}
                </button>
              </div>

              {!focusedStudent ? (
                <div className="pageStateCard">Select a student to review carry-over history.</div>
              ) : loadingFocusedDetails ? (
                <div className="pageStateCard">Loading carry-over records...</div>
              ) : (
                <div className="tableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Origin term</th>
                        <th>Origin semester</th>
                        <th>Status</th>
                        <th>Unlock actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {focusedDetails.carryOvers.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No carry-over records for the selected student.</td>
                        </tr>
                      ) : (
                        focusedDetails.carryOvers.map((carryOver) => (
                          <tr key={carryOver.id}>
                            <td>{carryOver.course?.name || "Course"}</td>
                            <td>{carryOver.originTerm?.code || "-"}</td>
                            <td>{carryOver.originSemesterNo}</td>
                            <td>
                              <span className={`statusPill ${STATUS_TONE[carryOver.status] || "statusDraft"}`}>
                                {carryOver.status}
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
                                    {processingKey === `assign-${carryOver.id}` ? "Unlocking..." : "Unlock"}
                                  </button>
                                ) : null}
                                {carryOver.status !== "Closed" && carryOver.status !== "Cancelled" ? (
                                  <button
                                    className="btn"
                                    type="button"
                                    onClick={() =>
                                      setConfirmAction({
                                        title: "Close carry-over record?",
                                        text: "This marks the carry-over as closed and may finalize its offering connection.",
                                        confirmLabel: "Close record",
                                        onConfirm: () => handleCloseCarryOver(carryOver.id),
                                      })
                                    }
                                    disabled={processingKey !== ""}
                                  >
                                    {processingKey === `close-${carryOver.id}` ? "Closing..." : "Close"}
                                  </button>
                                ) : null}
                                {carryOver.status === "Open" ? (
                                  <button
                                    className="btn btnDanger"
                                    type="button"
                                    onClick={() =>
                                      setConfirmAction({
                                        title: "Cancel carry-over record?",
                                        text: "This cancels the open carry-over record for the focused student.",
                                        confirmLabel: "Cancel record",
                                        onConfirm: () => handleCancelCarryOver(carryOver.id),
                                      })
                                    }
                                    disabled={processingKey !== ""}
                                  >
                                    {processingKey === `cancel-${carryOver.id}` ? "Cancelling..." : "Cancel"}
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
              <h3>Batch operation results</h3>
              <span className="sectionMeta">Review the latest create, activate, or regularization operation.</span>
            </div>
          </div>
          <div className="sectionBody">
            {operationResults.length === 0 ? (
              <div className="pageStateCard">
                Use the cohort actions above to create, activate, or regularize student registrations.
              </div>
            ) : (
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Action</th>
                      <th>Outcome</th>
                      <th>Message</th>
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
            onCancel={() => setConfirmAction(null)}
            onConfirm={runConfirmedAction}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

function ConfirmDialog({ title, text, confirmLabel, onCancel, onConfirm }) {
  return (
    <div className="modalBackdrop" role="presentation">
      <div className="modalCard confirmationDialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <span className="summaryLabel">Confirmation required</span>
        <h3 id="confirm-dialog-title">{title}</h3>
        <p>{text}</p>
        <div className="formActionsBar">
          <button className="btn" type="button" onClick={onCancel}>
            Cancel
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

function buildBatchMessage(results, label) {
  const successCount = results.filter((item) => ["Created", "Activated", "Completed"].includes(item.outcome)).length;
  const failedCount = results.filter((item) => item.outcome === "Failed").length;
  const skippedCount = results.filter((item) => item.outcome === "Skipped").length;

  return `Processed ${results.length} ${label}: ${successCount} successful, ${failedCount} failed, ${skippedCount} skipped.`;
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
