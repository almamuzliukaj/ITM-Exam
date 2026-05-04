import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
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
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [assistants, setAssistants] = useState([]);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [termForm, setTermForm] = useState(initialTermForm);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [offeringForm, setOfferingForm] = useState(initialOfferingForm);
  const [submittingKey, setSubmittingKey] = useState("");

  const activeTerms = useMemo(
    () => terms.filter((term) => term.status !== "Closed" && term.status !== "Archived"),
    [terms],
  );

  const loadAcademicData = useCallback(async () => {
    try {
      setLoadingData(true);
      setPageError("");
      const [termData, courseData, offeringData, professorData, assistantData] = await Promise.all([
        listTerms(),
        listCourses(),
        listOfferings(),
        listUsers({ role: "Professor", isActive: true }),
        listUsers({ role: "Assistant", isActive: true }),
      ]);

      setTerms(Array.isArray(termData) ? termData : []);
      setCourses(Array.isArray(courseData) ? courseData : []);
      setOfferings(Array.isArray(offeringData) ? offeringData : []);
      setProfessors(Array.isArray(professorData) ? professorData : []);
      setAssistants(Array.isArray(assistantData) ? assistantData : []);
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

        <section className="adminDashboardHero">
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
        </section>

        <section className="dashboardGrid dashboardGridWide">
          <article className="surfaceCard adminFormCard">
            <div className="sectionHeader"><h3>Create term</h3></div>
            <div className="sectionBody">
              <form className="stackLg" onSubmit={handleTermSubmit}>
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
              </form>
            </div>
          </article>

          <article className="surfaceCard adminFormCard">
            <div className="sectionHeader"><h3>Create course</h3></div>
            <div className="sectionBody">
              <form className="stackLg" onSubmit={handleCourseSubmit}>
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
              </form>
            </div>
          </article>
        </section>

        <section className="surfaceCard adminFormCard">
          <div className="sectionHeader"><h3>Create course offering</h3></div>
          <div className="sectionBody">
            <form className="stackLg" onSubmit={handleOfferingSubmit}>
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
            </form>
          </div>
        </section>

        {loadingData ? (
          <div className="pageStateCard">Loading academic records...</div>
        ) : (
          <>
            <DirectoryTable
              title="Term directory"
              columns={["Code", "Name", "Academic year", "Status", "Current", "Actions"]}
              rows={terms.map((term) => [
                term.code,
                term.name,
                term.academicYearLabel,
                <span key={`status-${term.id}`} className={`statusPill ${term.status === "Closed" ? "statusDraft" : "statusLive"}`}>{term.status}</span>,
                term.isCurrent ? "Yes" : "No",
                <div key={`actions-${term.id}`} className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
                  {term.status === "Draft" ? <button className="btn" type="button" onClick={() => handleTermAction(term.id, "publish")}>Publish</button> : null}
                  {term.status !== "Closed" && term.status !== "Archived" ? <button className="btn" type="button" onClick={() => handleTermAction(term.id, "close")}>Close</button> : null}
                </div>,
              ])}
            />

            <DirectoryTable
              title="Course catalog"
              columns={["Code", "Name", "Year", "Semester", "Credits", "Status", "Actions"]}
              rows={courses.map((course) => [
                course.code,
                course.name,
                course.yearOfStudy,
                course.defaultSemesterNo,
                course.credits,
                <span key={`status-${course.id}`} className={`statusPill ${course.isActive ? "statusLive" : "statusDraft"}`}>{course.isActive ? "Active" : "Inactive"}</span>,
                course.isActive ? <button key={`deactivate-${course.id}`} className="btn" type="button" onClick={() => handleCourseDeactivate(course.id)}>Deactivate</button> : <span key={`inactive-${course.id}`} className="small">No action</span>,
              ])}
            />

            <DirectoryTable
              title="Course offerings"
              columns={["Course", "Term", "Year / Semester", "Section", "Status", "Professor", "Assistant", "Actions"]}
              rows={offerings.map((offering) => [
                `${offering.course?.code || ""} - ${offering.course?.name || ""}`,
                offering.term?.code || "-",
                `${offering.yearOfStudy} / ${offering.semesterNo}`,
                offering.sectionCode,
                <span key={`status-${offering.id}`} className={`statusPill ${offering.status === "Draft" ? "statusDraft" : "statusLive"}`}>{offering.status}</span>,
                resolveStaffName(offering.primaryProfessorId, professors),
                offering.assistantId ? resolveStaffName(offering.assistantId, assistants) : "-",
                <div key={`actions-${offering.id}`} className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
                  {offering.status === "Draft" ? <button className="btn" type="button" onClick={() => handleOfferingAction(offering.id, "publish")}>Publish</button> : null}
                  {offering.status !== "Closed" && offering.status !== "Archived" ? <button className="btn" type="button" onClick={() => handleOfferingAction(offering.id, "close")}>Close</button> : null}
                </div>,
              ])}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}

function DirectoryTable({ title, columns, rows }) {
  return (
    <section className="surfaceCard adminTableCard">
      <div className="sectionHeader"><h3>{title}</h3></div>
      <div className="sectionBody">
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                {columns.map((column) => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
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
  return users.find((entry) => entry.id === userId)?.fullName || "Assigned staff";
}

function readError(error, fallback) {
  return error?.response?.data?.message || fallback;
}
