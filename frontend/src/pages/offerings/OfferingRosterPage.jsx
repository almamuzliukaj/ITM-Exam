import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getOffering, listOfferingStudents } from "../../lib/academicApi";

export default function OfferingRosterPage() {
  const { offeringId } = useParams();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [offering, setOffering] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRoster() {
      try {
        setLoading(true);
        setError("");
        const [offeringData, rosterData] = await Promise.all([
          getOffering(offeringId),
          listOfferingStudents(offeringId),
        ]);
        if (!active) return;
        setOffering(offeringData);
        setStudents(Array.isArray(rosterData) ? rosterData : []);
      } catch (err) {
        if (active) setError(readApiMessage(err) || "Failed to load the offering roster.");
      } finally {
        if (active) setLoading(false);
      }
    }

    if (offeringId) loadRoster();

    return () => {
      active = false;
    };
  }, [offeringId]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.fullName, student.email, student.studentNumber, student.status, student.enrollmentSource]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [students, search]);

  if (userLoading) return <div className="pageState">Loading roster...</div>;
  if (!user) return <div className="pageState">{userError || "User session could not be loaded."}</div>;

  return (
    <AppShell
      user={user}
      badge={user.role === "Assistant" ? "Assistant roster" : "Course roster"}
      title={formatOfferingTitle(offering)}
      subtitle="Shared course-offering roster scoped to your active teaching assignment."
      actions={<Link className="btn" to="/dashboard">Back to dashboard</Link>}
    >
      <div className="stackXl">
        {error ? <div className="alert">{error}</div> : null}

        <section className="surfaceCard listControlPanel">
          <div className="sectionHeader">
            <div>
              <h3>Student roster</h3>
              <span className="sectionMeta">Students remain enrolled on the course offering; assistant access is assignment-based.</span>
            </div>
            <span className="statusPill statusLive">
              {filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="sectionBody">
            <div className="assessmentFiltersGrid">
              <div className="field fieldSpanWide">
                <label className="label">Search roster</label>
                <input
                  className="input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, email, student number, enrollment status..."
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="pageStateCard">Loading students...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="emptyState">
            <strong>No students found</strong>
            <span>{students.length ? "Adjust the roster search." : "No enrollments are attached to this offering yet."}</span>
          </div>
        ) : (
          <div className="tableWrap">
            <table className="dataTable examDirectoryTable">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Student number</th>
                  <th>Enrollment</th>
                  <th>Exam eligibility</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.enrollmentId}>
                    <td>
                      <div className="examDirectoryTitle">
                        <strong>{student.fullName || student.email}</strong>
                        <span>{student.email}</span>
                      </div>
                    </td>
                    <td>{student.studentNumber || "-"}</td>
                    <td>
                      <span className="statusPill statusDraft">{student.status || "-"}</span>
                      <span className="small">{student.enrollmentSource || "-"}</span>
                    </td>
                    <td>
                      <span className={`statusPill ${student.eligibleForExam ? "statusLive" : "statusDraft"}`}>
                        {student.eligibleForExam ? "Eligible" : "Not eligible"}
                      </span>
                    </td>
                    <td>{formatDate(student.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function formatOfferingTitle(offering) {
  if (!offering) return "Course offering roster";
  const course = offering.course;
  const courseLabel = course?.code && course?.name ? `${course.code} - ${course.name}` : course?.code || course?.name || "Course offering";
  const term = offering.term?.code || offering.term?.name || "";
  const section = offering.sectionCode ? `Section ${offering.sectionCode}` : "";
  return [courseLabel, term, section].filter(Boolean).join(" | ");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function readApiMessage(err) {
  return err?.response?.data?.message ||
    (typeof err?.response?.data === "string" ? err.response.data : null) ||
    err?.message;
}
