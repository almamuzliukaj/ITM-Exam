import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import SmuSourceBanner from "../../components/SmuSourceBanner";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useSmuIntegrationStatus } from "../../hooks/useSmuIntegrationStatus";
import { listExams } from "../../lib/examsApi";
import { listUsers } from "../../lib/usersApi";
import {
  closeOffering,
  closeTerm,
  createCourse,
  createOffering,
  createTerm,
  deactivateCourse,
  listCourses,
  listOfferings,
  listTerms,
  publishOffering,
  publishTerm,
} from "../../lib/academicApi";

const initialTermForm = {
  code: "",
  name: "",
  season: "Winter",
  academicYearLabel: "",
  startDate: "",
  endDate: "",
  enrollmentOpenAt: "",
  enrollmentCloseAt: "",
  isCurrent: false,
};

const initialCourseForm = {
  code: "",
  name: "",
  credits: 6,
  yearOfStudy: 1,
  defaultSemesterNo: 1,
  isElective: false,
  description: "",
};

const initialOfferingForm = {
  courseId: "",
  termId: "",
  yearOfStudy: 1,
  semesterNo: 1,
  sectionCode: "A",
  deliveryType: "Regular",
  capacity: 80,
  primaryProfessorId: "",
  assistantId: "",
};

export default function AdminAcademicStructurePage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const smuStatus = useSmuIntegrationStatus();
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [exams, setExams] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [termForm, setTermForm] = useState(initialTermForm);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [offeringForm, setOfferingForm] = useState(initialOfferingForm);
  const [submittingKey, setSubmittingKey] = useState("");
  const [activeDirectory, setActiveDirectory] = useState("offerings");
  const [openCreatePanel, setOpenCreatePanel] = useState("");

  const activeTerms = useMemo(
    () => terms.filter((term) => term.status !== "Closed" && term.status !== "Archived"),
    [terms],
  );
  const smuManaged = smuStatus.isConfigured;
  const offeringReadiness = useMemo(
    () => offerings.map((offering) => buildOfferingReadiness(offering, exams)),
    [offerings, exams],
  );
  const readinessSummary = useMemo(
    () => ({
      ready: offeringReadiness.filter((entry) => entry.level === "Ready").length,
      review: offeringReadiness.filter((entry) => entry.level === "Review").length,
      blocked: offeringReadiness.filter((entry) => entry.level === "Blocked").length,
    }),
    [offeringReadiness],
  );

  const loadAcademicData = useCallback(async () => {
    try {
      setLoadingData(true);
      setPageError("");
      const [termData, courseData, offeringData, professorData, assistantData, examData] = await Promise.all([
        listTerms(),
        listCourses(),
        listOfferings(),
        listUsers({ role: "Professor", isActive: true }),
        listUsers({ role: "Assistant", isActive: true }),
        listExams().catch(() => []),
      ]);

      setTerms(Array.isArray(termData) ? termData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
      setOfferings(Array.isArray(offeringData) ? offeringData : []);
      setProfessors(Array.isArray(professorData) ? professorData : []);
      setAssistants(Array.isArray(assistantData) ? assistantData : []);
      setExams(Array.isArray(examData) ? examData : []);
    } catch (error) {
      setPageError(readError(error, "Failed to load academic structure data."));
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadAcademicData();
  }, [loadAcademicData]);

  async function handleTermSubmit(e) {
    e.preventDefault();
    if (smuManaged) {
      setPageError("SMU is the source of truth for terms. Run SMU sync instead of creating terms manually.");
      return;
    }
    try {
      setSubmittingKey("term");
      setPageError("");
      await createTerm({
        ...termForm,
        startDate: toIsoDate(termForm.startDate),
        endDate: toIsoDate(termForm.endDate),
        enrollmentOpenAt: toIsoDate(termForm.enrollmentOpenAt),
        enrollmentCloseAt: toIsoDate(termForm.enrollmentCloseAt),
      });
      setTermForm(initialTermForm);
      setPageSuccess("Term created successfully.");
      await loadAcademicData();
    } catch (error) {
      setPageError(readError(error, "Failed to create term."));
    } finally {
      setSubmittingKey("");
    }
  }

  async function handleCourseSubmit(e) {
    e.preventDefault();
    if (smuManaged) {
      setPageError("SMU is the source of truth for courses. Run SMU sync instead of creating courses manually.");
      return;
    }
    try {
      setSubmittingKey("course");
      setPageError("");
      await createCourse({
        ...courseForm,
        credits: Number(courseForm.credits),
        yearOfStudy: Number(courseForm.yearOfStudy),
        defaultSemesterNo: Number(courseForm.defaultSemesterNo),
      });
      setCourseForm(initialCourseForm);
      setPageSuccess("Course created successfully.");
      await loadAcademicData();
    } catch (error) {
      setPageError(readError(error, "Failed to create course."));
    } finally {
      setSubmittingKey("");
    }
  }

  async function handleOfferingSubmit(e) {
    e.preventDefault();
    if (smuManaged) {
      setPageError("SMU is the source of truth for course offerings. Run SMU sync instead of creating offerings manually.");
      return;
    }
    try {
      setSubmittingKey("offering");
      setPageError("");
      await createOffering({
        ...offeringForm,
        yearOfStudy: Number(offeringForm.yearOfStudy),
        semesterNo: Number(offeringForm.semesterNo),
        capacity: Number(offeringForm.capacity),
        assistantId: offeringForm.assistantId || null,
      });
      setOfferingForm(initialOfferingForm);
      setPageSuccess("Course offering created successfully.");
      await loadAcademicData();
    } catch (error) {
      setPageError(readError(error, "Failed to create course offering."));
    } finally {
      setSubmittingKey("");
    }
  }

  async function handleTermAction(termId, action) {
    if (smuManaged) {
      setPageError("Term lifecycle is managed by SMU while integration is active.");
      return;
    }
    try {
      setPageError("");
      if (action === "publish") await publishTerm(termId);
      if (action === "close") await closeTerm(termId);
      setPageSuccess(`Term ${action} action completed.`);
      await loadAcademicData();
    } catch (error) {
      setPageError(readError(error, `Failed to ${action} term.`));
    }
  }

  async function handleCourseDeactivate(courseId) {
    if (smuManaged) {
      setPageError("Course status is managed by SMU while integration is active.");
      return;
    }
    try {
      setPageError("");
      await deactivateCourse(courseId);
      setPageSuccess("Course deactivated successfully.");
      await loadAcademicData();
    } catch (error) {
      setPageError(readError(error, "Failed to deactivate course."));
    }
  }

  async function handleOfferingAction(offeringId, action) {
    if (smuManaged) {
      setPageError("Offering lifecycle is managed by SMU while integration is active.");
      return;
    }
    try {
      setPageError("");
      if (action === "publish") await publishOffering(offeringId);
      if (action === "close") await closeOffering(offeringId);
      setPageSuccess(`Offering ${action} action completed.`);
      await loadAcademicData();
    } catch (error) {
      setPageError(readError(error, `Failed to ${action} offering.`));
    }
  }

  if (userLoading) return <div className="pageState">Loading academic workspace...</div>;
  if (!user) return <div className="pageState">{userError || "Unable to load user profile."}</div>;

  return (
    <AppShell
      user={user}
      badge="Administration"
      title="Academic structure"
      subtitle="Configure terms, courses, and course offerings dynamically so the faculty can evolve without hardcoded academic rules."
      actions={
        <>
          <Link className="btn" to="/dashboard">Back to overview</Link>
          <Link className="btn" to="/admin/users">User management</Link>
        </>
      }
    >
      <div className="stackXl">
        {pageError ? <div className="alert">{pageError}</div> : null}
        {pageSuccess ? <div className="successBanner">{pageSuccess}</div> : null}
        <SmuSourceBanner
          title="Academic records come from SMU"
          description="Terms, courses, offerings, and staff assignments are displayed here from the synced Online Exam tables. Manual creation stays available only while SMU is not configured."
          isConfigured={smuStatus.isConfigured}
          loading={smuStatus.loading}
          error={smuStatus.error}
        />

        <section className="adminDashboardHero adminDashboardHeroCompact">
          <div className="adminDashboardHeroCopy">
            <div className="adminHeroBrand">
              <img className="adminHeroBrandLogo adminHeroBrandLogoIcon" src="/app-logo.svg" alt="Online Exam" />
              <span>Administration Portal</span>
            </div>
            <div className="eyebrow">Administration</div>
            <h2 className="heroTitle">Academic structure</h2>
            <p className="heroText">
              Maintain terms, course catalog records, and offering assignments in a layout focused on institutional control and semester planning.
            </p>
          </div>
          <div className="adminHeroMeta">
            <div className="adminHeroMetaRow">
              <span>Active terms</span>
              <strong>{activeTerms.length}</strong>
            </div>
            <div className="adminHeroMetaRow">
              <span>Faculty staff</span>
              <strong>{professors.length + assistants.length}</strong>
            </div>
            <div className="adminHeroMetaRow">
              <span>Draft offerings</span>
              <strong>{offerings.filter((offering) => offering.status === "Draft").length}</strong>
            </div>
            <div className="adminHeroMetaRow">
              <span>Ready offerings</span>
              <strong>{readinessSummary.ready}</strong>
            </div>
          </div>
        </section>

        <section className="summaryStrip">
          <article className="summaryCard">
            <span className="summaryLabel">Terms</span>
            <strong>{terms.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Courses</span>
            <strong>{courses.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Offerings</span>
            <strong>{offerings.length}</strong>
          </article>
          <article className="summaryCard">
            <span className="summaryLabel">Need review</span>
            <strong>{readinessSummary.review + readinessSummary.blocked}</strong>
          </article>
        </section>

        <section className="surfaceCard adminControlPanel">
          <div className="sectionHeader">
            <div>
              <h3>Academic workspace controls</h3>
              <span className="sectionMeta">Choose one record type at a time, then open a creation form only when needed.</span>
            </div>
          </div>
          <div className="sectionBody">
            <div className="adminToolbar">
              <div className="segmentedControl" aria-label="Academic directory view">
                <button className={activeDirectory === "terms" ? "active" : ""} type="button" onClick={() => setActiveDirectory("terms")}>
                  Terms
                </button>
                <button className={activeDirectory === "courses" ? "active" : ""} type="button" onClick={() => setActiveDirectory("courses")}>
                  Courses
                </button>
                <button className={activeDirectory === "offerings" ? "active" : ""} type="button" onClick={() => setActiveDirectory("offerings")}>
                  Offerings
                </button>
              </div>
              <div className="adminToolbarActions">
                <button className={openCreatePanel === "term" ? "btn btnPrimary" : "btn"} type="button" onClick={() => setOpenCreatePanel((current) => current === "term" ? "" : "term")}>
                  Create term
                </button>
                <button className={openCreatePanel === "course" ? "btn btnPrimary" : "btn"} type="button" onClick={() => setOpenCreatePanel((current) => current === "course" ? "" : "course")}>
                  Create course
                </button>
                <button className={openCreatePanel === "offering" ? "btn btnPrimary" : "btn"} type="button" onClick={() => setOpenCreatePanel((current) => current === "offering" ? "" : "offering")}>
                  Create offering
                </button>
              </div>
            </div>
          </div>
        </section>

        {openCreatePanel === "term" || openCreatePanel === "course" ? (
        <section className="dashboardGrid dashboardGridWide adminCreatePanel">
          {openCreatePanel === "term" ? (
          <article className="surfaceCard adminFormCard">
            <div className="sectionHeader">
              <div>
                <h3>Create term</h3>
                <span className="sectionMeta">{smuManaged ? "Locked because SMU owns term setup." : "Manual fallback for local setup."}</span>
              </div>
            </div>
            <div className="sectionBody">
              <form className="stackLg" onSubmit={handleTermSubmit}>
                {smuManaged ? <div className="pageStateCard">Use SMU sync to create or update academic terms.</div> : null}
                <fieldset className="formFieldset" disabled={smuManaged}>
                <div className="twoColGrid">
                  <div className="field">
                    <label className="label">Code</label>
                    <input className="input" value={termForm.code} onChange={(e) => setTermForm((c) => ({ ...c, code: e.target.value }))} required />
                  </div>
                  <div className="field">
                    <label className="label">Season</label>
                    <select className="input" value={termForm.season} onChange={(e) => setTermForm((c) => ({ ...c, season: e.target.value }))}>
                      <option value="Winter">Winter</option>
                      <option value="Summer">Summer</option>
                      <option value="Special">Special</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="label">Name</label>
                  <input className="input" value={termForm.name} onChange={(e) => setTermForm((c) => ({ ...c, name: e.target.value }))} required />
                </div>
                <div className="field">
                  <label className="label">Academic year label</label>
                  <input className="input" value={termForm.academicYearLabel} onChange={(e) => setTermForm((c) => ({ ...c, academicYearLabel: e.target.value }))} placeholder="2026/2027" required />
                </div>
                <div className="twoColGrid">
                  <DateField label="Start date" value={termForm.startDate} onChange={(value) => setTermForm((c) => ({ ...c, startDate: value }))} />
                  <DateField label="End date" value={termForm.endDate} onChange={(value) => setTermForm((c) => ({ ...c, endDate: value }))} />
                </div>
                <div className="twoColGrid">
                  <DateField label="Enrollment opens" value={termForm.enrollmentOpenAt} onChange={(value) => setTermForm((c) => ({ ...c, enrollmentOpenAt: value }))} />
                  <DateField label="Enrollment closes" value={termForm.enrollmentCloseAt} onChange={(value) => setTermForm((c) => ({ ...c, enrollmentCloseAt: value }))} />
                </div>
                <label className="checkboxRow">
                  <input type="checkbox" checked={termForm.isCurrent} onChange={(e) => setTermForm((c) => ({ ...c, isCurrent: e.target.checked }))} />
                  <span>Mark as current term</span>
                </label>
                <button className="btn btnPrimary" type="submit" disabled={submittingKey === "term"}>
                  {submittingKey === "term" ? "Creating..." : "Create term"}
                </button>
                </fieldset>
              </form>
            </div>
          </article>
          ) : null}

          {openCreatePanel === "course" ? (
          <article className="surfaceCard adminFormCard">
            <div className="sectionHeader">
              <div>
                <h3>Create course</h3>
                <span className="sectionMeta">{smuManaged ? "Locked because SMU owns the course catalog." : "Manual fallback for local setup."}</span>
              </div>
            </div>
            <div className="sectionBody">
              <form className="stackLg" onSubmit={handleCourseSubmit}>
                {smuManaged ? <div className="pageStateCard">Use SMU sync to create or update course catalog records.</div> : null}
                <fieldset className="formFieldset" disabled={smuManaged}>
                <div className="twoColGrid">
                  <div className="field">
                    <label className="label">Code</label>
                    <input className="input" value={courseForm.code} onChange={(e) => setCourseForm((c) => ({ ...c, code: e.target.value }))} required />
                  </div>
                  <div className="field">
                    <label className="label">Credits</label>
                    <input className="input" type="number" min="1" value={courseForm.credits} onChange={(e) => setCourseForm((c) => ({ ...c, credits: e.target.value }))} required />
                  </div>
                </div>
                <div className="field">
                  <label className="label">Course name</label>
                  <input className="input" value={courseForm.name} onChange={(e) => setCourseForm((c) => ({ ...c, name: e.target.value }))} required />
                </div>
                <div className="twoColGrid">
                  <div className="field">
                    <label className="label">Year of study</label>
                    <input className="input" type="number" min="1" value={courseForm.yearOfStudy} onChange={(e) => setCourseForm((c) => ({ ...c, yearOfStudy: e.target.value }))} required />
                  </div>
                  <div className="field">
                    <label className="label">Default semester number</label>
                    <input className="input" type="number" min="1" value={courseForm.defaultSemesterNo} onChange={(e) => setCourseForm((c) => ({ ...c, defaultSemesterNo: e.target.value }))} required />
                  </div>
                </div>
                <label className="checkboxRow">
                  <input type="checkbox" checked={courseForm.isElective} onChange={(e) => setCourseForm((c) => ({ ...c, isElective: e.target.checked }))} />
                  <span>Elective course</span>
                </label>
                <div className="field">
                  <label className="label">Description</label>
                  <textarea className="input textarea textareaCompact" value={courseForm.description} onChange={(e) => setCourseForm((c) => ({ ...c, description: e.target.value }))} />
                </div>
                <button className="btn btnPrimary" type="submit" disabled={submittingKey === "course"}>
                  {submittingKey === "course" ? "Creating..." : "Create course"}
                </button>
                </fieldset>
              </form>
            </div>
          </article>
          ) : null}
        </section>
        ) : null}

        {openCreatePanel === "offering" ? (
        <section className="surfaceCard adminFormCard">
          <div className="sectionHeader">
            <div>
              <h3>Create course offering</h3>
              <span className="sectionMeta">{smuManaged ? "Locked because SMU owns offering availability." : "Manual fallback for local offering setup."}</span>
            </div>
          </div>
          <div className="sectionBody">
            <form className="stackLg" onSubmit={handleOfferingSubmit}>
              {smuManaged ? <div className="pageStateCard">Use SMU sync to create or update course offerings. Dropdowns below use synced courses, terms, professors, and assistants.</div> : null}
              <fieldset className="formFieldset" disabled={smuManaged}>
              <div className="threeColGrid">
                <div className="field">
                  <label className="label">Course</label>
                  <select className="input" value={offeringForm.courseId} onChange={(e) => setOfferingForm((c) => ({ ...c, courseId: e.target.value }))} required>
                    <option value="">Select course</option>
                    {courses.filter((course) => course.isActive).map((course) => (
                      <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Term</label>
                  <select className="input" value={offeringForm.termId} onChange={(e) => setOfferingForm((c) => ({ ...c, termId: e.target.value }))} required>
                    <option value="">Select term</option>
                    {activeTerms.map((term) => (
                      <option key={term.id} value={term.id}>{term.code} - {term.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Delivery type</label>
                  <select className="input" value={offeringForm.deliveryType} onChange={(e) => setOfferingForm((c) => ({ ...c, deliveryType: e.target.value }))}>
                    <option value="Regular">Regular</option>
                    <option value="RetakeOnly">Retake only</option>
                    <option value="Special">Special</option>
                  </select>
                </div>
              </div>
              <div className="threeColGrid">
                <div className="field">
                  <label className="label">Year of study</label>
                  <input className="input" type="number" min="1" value={offeringForm.yearOfStudy} onChange={(e) => setOfferingForm((c) => ({ ...c, yearOfStudy: e.target.value }))} required />
                </div>
                <div className="field">
                  <label className="label">Semester number</label>
                  <input className="input" type="number" min="1" value={offeringForm.semesterNo} onChange={(e) => setOfferingForm((c) => ({ ...c, semesterNo: e.target.value }))} required />
                </div>
                <div className="field">
                  <label className="label">Capacity</label>
                  <input className="input" type="number" min="0" value={offeringForm.capacity} onChange={(e) => setOfferingForm((c) => ({ ...c, capacity: e.target.value }))} />
                </div>
              </div>
              <div className="threeColGrid">
                <div className="field">
                  <label className="label">Section</label>
                  <input className="input" value={offeringForm.sectionCode} onChange={(e) => setOfferingForm((c) => ({ ...c, sectionCode: e.target.value }))} required />
                </div>
                <div className="field">
                  <label className="label">Primary professor</label>
                  <select className="input" value={offeringForm.primaryProfessorId} onChange={(e) => setOfferingForm((c) => ({ ...c, primaryProfessorId: e.target.value }))} required>
                    <option value="">Select professor</option>
                    {professors.map((professor) => (
                      <option key={professor.id} value={professor.id}>{professor.fullName}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Assistant</label>
                  <select className="input" value={offeringForm.assistantId} onChange={(e) => setOfferingForm((c) => ({ ...c, assistantId: e.target.value }))}>
                    <option value="">No assistant</option>
                    {assistants.map((assistant) => (
                      <option key={assistant.id} value={assistant.id}>{assistant.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="btn btnPrimary" type="submit" disabled={submittingKey === "offering"}>
                {submittingKey === "offering" ? "Creating..." : "Create offering"}
              </button>
              </fieldset>
            </form>
          </div>
        </section>
        ) : null}

        {loadingData ? (
          <div className="pageStateCard">Loading academic records...</div>
        ) : (
          <>
            {activeDirectory === "terms" ? (
            <DirectoryTable
              title="Term directory"
              columns={["Code", "Name", "Academic year", "Status", "Current", "Source", "Actions"]}
              rows={terms.map((term) => [
                term.code,
                term.name,
                term.academicYearLabel,
                <span key={`status-${term.id}`} className={`statusPill ${term.status === "Closed" ? "statusDraft" : "statusLive"}`}>{term.status}</span>,
                term.isCurrent ? "Yes" : "No",
                <span key={`source-${term.id}`} className={`statusPill ${smuManaged ? "statusLive" : "statusDraft"}`}>{smuManaged ? "SMU sync" : "Local"}</span>,
                <div key={`actions-${term.id}`} className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
                  {smuManaged ? <span className="small">Managed by SMU</span> : null}
                  {!smuManaged && term.status === "Draft" ? <button className="btn" type="button" onClick={() => handleTermAction(term.id, "publish")}>Publish</button> : null}
                  {!smuManaged && term.status !== "Closed" && term.status !== "Archived" ? <button className="btn" type="button" onClick={() => handleTermAction(term.id, "close")}>Close</button> : null}
                </div>,
              ])}
            />
            ) : null}

            {activeDirectory === "courses" ? (
            <DirectoryTable
              title="Course catalog"
              columns={["Code", "Name", "Year", "Semester", "Credits", "Status", "Source", "Actions"]}
              rows={courses.map((course) => [
                course.code,
                course.name,
                course.yearOfStudy,
                course.defaultSemesterNo,
                course.credits,
                <span key={`status-${course.id}`} className={`statusPill ${course.isActive ? "statusLive" : "statusDraft"}`}>{course.isActive ? "Active" : "Inactive"}</span>,
                <span key={`source-${course.id}`} className={`statusPill ${smuManaged ? "statusLive" : "statusDraft"}`}>{smuManaged ? "SMU sync" : "Local"}</span>,
                smuManaged ? <span key={`managed-${course.id}`} className="small">Managed by SMU</span> : course.isActive ? <button key={`deactivate-${course.id}`} className="btn" type="button" onClick={() => handleCourseDeactivate(course.id)}>Deactivate</button> : <span key={`inactive-${course.id}`} className="small">No action</span>,
              ])}
            />
            ) : null}

            {activeDirectory === "offerings" ? (
            <>
              <OfferingReadinessPanel
                entries={offeringReadiness}
                professors={professors}
                assistants={assistants}
                summary={readinessSummary}
              />
              <DirectoryTable
                title="Course offerings"
                columns={["Course", "Term", "Year / Semester", "Section", "Status", "Professor", "Assistant", "Source", "Actions"]}
                rows={offerings.map((offering) => [
                  formatOfferingCourse(offering),
                  offering.term?.code || "-",
                  `${offering.yearOfStudy} / ${offering.semesterNo}`,
                  offering.sectionCode,
                  <span key={`status-${offering.id}`} className={`statusPill ${offering.status === "Draft" ? "statusDraft" : "statusLive"}`}>{offering.status}</span>,
                  resolveStaffName(offering.primaryProfessorId, professors),
                  offering.assistantId ? resolveStaffName(offering.assistantId, assistants) : "-",
                  <span key={`source-${offering.id}`} className={`statusPill ${smuManaged ? "statusLive" : "statusDraft"}`}>{smuManaged ? "SMU sync" : "Local"}</span>,
                  <div key={`actions-${offering.id}`} className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
                    {smuManaged ? <span className="small">Managed by SMU</span> : null}
                    {!smuManaged && offering.status === "Draft" ? <button className="btn" type="button" onClick={() => handleOfferingAction(offering.id, "publish")}>Publish</button> : null}
                    {!smuManaged && offering.status !== "Closed" && offering.status !== "Archived" ? <button className="btn" type="button" onClick={() => handleOfferingAction(offering.id, "close")}>Close</button> : null}
                  </div>,
                ])}
              />
            </>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

function OfferingReadinessPanel({ entries, professors, assistants, summary }) {
  return (
    <section className="surfaceCard adminReadinessPanel">
      <div className="sectionHeader">
        <div>
          <h3>Offering readiness</h3>
          <span className="sectionMeta">Operational checks only. Exam content, answers, grades, and feedback stay with academic staff.</span>
        </div>
        <div className="adminToolbarStatus">
          <span className="statusPill statusLive">{summary.ready} ready</span>
          <span className="statusPill statusWarn">{summary.review} review</span>
          <span className="statusPill statusDraft">{summary.blocked} blocked</span>
        </div>
      </div>
      <div className="sectionBody">
        <div className="tableWrap">
          <table className="dataTable readinessTable">
            <thead>
              <tr>
                <th>Offering</th>
                <th>Term</th>
                <th>Academic owner</th>
                <th>Exam setup</th>
                <th>Readiness</th>
                <th>Missing setup</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6}>No offerings available for readiness review.</td>
                </tr>
              ) : entries.map((entry) => (
                <tr key={entry.offering.id}>
                  <td>
                    <strong>{formatOfferingCourse(entry.offering)}</strong>
                    <span className="readinessSubtext">Section {entry.offering.sectionCode || "-"} · Year {entry.offering.yearOfStudy} · Semester {entry.offering.semesterNo}</span>
                  </td>
                  <td>{entry.offering.term?.code || "-"}</td>
                  <td>
                    <strong>{resolveStaffName(entry.offering.primaryProfessorId, professors)}</strong>
                    <span className="readinessSubtext">{entry.offering.assistantId ? resolveStaffName(entry.offering.assistantId, assistants) : "No assistant assigned"}</span>
                  </td>
                  <td>
                    <strong>{entry.examCount} exam{entry.examCount === 1 ? "" : "s"}</strong>
                    <span className="readinessSubtext">{entry.publishedExamCount} published</span>
                  </td>
                  <td>
                    <span className={`statusPill ${readinessStatusClass(entry.level)}`}>{entry.level}</span>
                  </td>
                  <td>
                    {entry.missing.length === 0 ? (
                      <span className="small">No missing setup</span>
                    ) : (
                      <div className="readinessMissingList">
                        {entry.missing.map((item) => <span key={`${entry.offering.id}-${item}`}>{item}</span>)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function DirectoryTable({ title, columns, rows }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return rows.slice(startIndex, startIndex + pageSize);
  }, [page, pageSize, rows]);
  const start = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(rows.length, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [title, pageSize]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  return (
    <section className="surfaceCard adminTableCard">
      <div className="sectionHeader">
        <div>
          <h3>{title}</h3>
          <span className="sectionMeta">Showing {start}-{end} of {rows.length} records.</span>
        </div>
      </div>
      <div className="sectionBody stackLg">
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                {columns.map((column) => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>No records found for this view.</td>
                </tr>
              ) : visibleRows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="paginationBar">
          <span>Showing {start}-{end} of {rows.length}</span>
          <div className="paginationActions">
            <select className="input inputCompact" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} aria-label={`${title} rows per page`}>
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
            </select>
            <button className="btn" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span className="paginationCurrent">Page {page} of {pageCount}</span>
            <button className="btn" type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <input className="input" type="date" value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}

function toIsoDate(value) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

function resolveStaffName(userId, users) {
  if (!userId) return "Unassigned";
  return users.find((entry) => entry.id === userId)?.fullName || "Assigned staff";
}

function formatOfferingCourse(offering) {
  const code = offering.course?.code || "Course";
  const name = offering.course?.name || "Unnamed offering";
  return `${code} - ${name}`;
}

function buildOfferingReadiness(offering, exams) {
  const offeringExams = exams.filter((exam) => exam.courseOfferingId === offering.id);
  const publishedExams = offeringExams.filter((exam) => exam.isPublished || exam.status === "Published");
  const checks = [
    { label: "Professor assignment", passed: Boolean(offering.primaryProfessorId) },
    { label: "Assistant assignment", passed: Boolean(offering.assistantId) },
    { label: "Offering published", passed: offering.status === "Published" || offering.status === "Active" },
    { label: "Exam created", passed: offeringExams.length > 0 },
    { label: "Published exam available", passed: publishedExams.length > 0 },
  ];
  const passedCount = checks.filter((check) => check.passed).length;
  const level = passedCount === checks.length ? "Ready" : passedCount >= 3 ? "Review" : "Blocked";
  return {
    offering,
    examCount: offeringExams.length,
    publishedExamCount: publishedExams.length,
    level,
    missing: checks.filter((check) => !check.passed).map((check) => check.label),
  };
}

function readinessStatusClass(level) {
  if (level === "Ready") return "statusLive";
  if (level === "Review") return "statusWarn";
  return "statusDraft";
}

function readError(error, fallback) {
  return error?.response?.data?.message || fallback;
}
