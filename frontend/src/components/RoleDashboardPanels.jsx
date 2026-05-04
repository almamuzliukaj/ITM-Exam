import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
 feat/student-eligibility-dashboard
 feat/student-eligibility-dashboard
import { getMyEligibilityDashboard } from "../lib/studentApi";


import { listMyOfferings } from "../lib/academicApi";
 main
import { getDashboardSummary } from "../lib/dashboardApi";
 main

export default function RoleDashboardPanels({ role = "Student" }) {
  const { t } = useTranslation();
  const roleKey = role.toLowerCase();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offerings, setOfferings] = useState([]);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [offeringsError, setOfferingsError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getDashboardSummary();
        if (active) setSummary(data);
      } catch {
        if (active) setError(t("dashboard.statsError"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (roleKey !== "professor") {
      setOfferings([]);
      setOfferingsError("");
      setOfferingsLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setOfferingsLoading(true);
        setOfferingsError("");
        const data = await listMyOfferings();
        if (active) setOfferings(Array.isArray(data) ? data : []);
      } catch {
        if (active) setOfferingsError(t("rolePanels.professor.offerings.error"));
      } finally {
        if (active) setOfferingsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [roleKey, t]);

  const config = getDashboardConfig(roleKey, t, summary?.metrics, loading, Boolean(error));

  if (roleKey === "admin") {
    return (
      <div className="stackXl">
        <section className="adminDashboardHero">
          <div className="adminDashboardHeroCopy">
            <div className="adminHeroBrand">
              <img className="adminHeroBrandLogo adminHeroBrandLogoIcon" src="/app-logo.svg" alt="Online Exam" />
              <span>Administration Portal</span>
            </div>
            <div className="eyebrow">{config.badge}</div>
            <h2 className="heroTitle">{config.heroTitle}</h2>
            <p className="heroText">{config.heroText}</p>
          </div>
          <div className="adminHeroActions">
            {config.quickActions.map((action) => (
              <Link key={action.to} className="btn btnPrimary" to={action.to}>
                {action.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="adminMetricGrid">
          {config.stats.map((stat) => (
            <article key={stat.label} className="adminMetricCard">
              <span className="summaryLabel">{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.meta}</p>
            </article>
          ))}
        </section>

        <section className="adminSectionGrid">
          {config.sections.map((section) => (
            <article key={section.title} className="surfaceCard adminSectionCard">
              <div className="sectionHeader">
                <h3>{section.title}</h3>
              </div>
              <div className="sectionBody">
                <div className="bulletStack adminList">
                  {section.items.map((item) => (
                    <div key={item} className="listRow">
                      <span className="listDot" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    );
  }

 feat/student-eligibility-dashboard
  if (roleKey === "student") {
    return <StudentEligibilityPanel config={config} />;

  if (roleKey === "professor") {
    return (
      <ProfessorDashboard
        config={config}
        offerings={offerings}
        offeringsLoading={offeringsLoading}
        offeringsError={offeringsError}
        summaryError={error}
        t={t}
      />
    );
main
  }

  return (
    <div className="stackXl">
      {error ? <div className="alert">{error}</div> : null}

      <section className="heroPanel">
        <div className="heroCopy">
          <div className="eyebrow">{config.badge}</div>
          <h2 className="heroTitle">{config.heroTitle}</h2>
          <p className="heroText">{config.heroText}</p>
          <div className="heroActions">
            {config.quickActions.map((action) => (
              <Link key={action.to} className="btn btnPrimary" to={action.to}>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="heroStats">
          {config.stats.map((stat) => (
            <article key={stat.label} className="metricCard">
              <div className="metricValue">{stat.value}</div>
              <div className="metricLabel">{stat.label}</div>
              <div className="metricMeta">{stat.meta}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboardGrid">
        {config.sections.map((section) => (
          <article key={section.title} className="surfaceCard">
            <div className="sectionHeader">
              <h3>{section.title}</h3>
            </div>
            <div className="sectionBody">
              <div className="bulletStack">
                {section.items.map((item) => (
                  <div key={item} className="listRow">
                    <span className="listDot" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

 feat/student-eligibility-dashboard
 feat/student-eligibility-dashboard
function StudentEligibilityPanel({ config }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const result = await getMyEligibilityDashboard();
        if (!ignore) setDashboard(result);
      } catch (err) {
        if (!ignore) {
          setError(err?.response?.data?.message || "Failed to load student eligibility.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return <div className="pageStateCard">Loading student eligibility...</div>;
  }

  if (error) {
    return <div className="alert">{error}</div>;
  }

  const summary = dashboard?.summary || {};
  const currentTerm = dashboard?.currentTerm;
  const semesterEnrollment = dashboard?.semesterEnrollment;
  const courses = dashboard?.courses || [];
  const exams = dashboard?.exams || [];
  const carryOvers = dashboard?.carryOvers || [];

  const stats = [
    {
      label: "Eligible courses",
      value: summary.eligibleCourses ?? 0,
      meta: currentTerm ? currentTerm.name : "No current term"
    },
    {
      label: "Visible exams",
      value: summary.visibleExams ?? 0,
      meta: "Published and eligible only"
    },
    {
      label: "Upcoming exams",
      value: summary.upcomingExams ?? 0,
      meta: "Next 7 days"
    },
    {
      label: "Carry-over items",
      value: summary.openCarryOvers ?? 0,
      meta: "Open or assigned"
    }
  ];

  return (
    <div className="stackXl">
      <section className="heroPanel">
        <div className="heroCopy">
          <div>
            <div className="eyebrow">{config.badge}</div>
            <h2 className="heroTitle">{config.heroTitle}</h2>
            <p className="heroText">{config.heroText}</p>
          </div>
          <div className="studentTermSummary">
            <span className="summaryLabel">Current academic visibility</span>
            <strong>{currentTerm ? `${currentTerm.name} (${currentTerm.code})` : "No current term configured"}</strong>
            <p>
              {semesterEnrollment
                ? `Year ${semesterEnrollment.yearOfStudy}, semester ${semesterEnrollment.semesterNo} - ${semesterEnrollment.status}`
                : "No active semester enrollment was found for this student."}
            </p>
          </div>
          <div className="heroActions">
            <Link className="btn btnPrimary" to="/exams">
              View eligible exams
            </Link>
          </div>
        </div>
        <div className="heroStats">
          {stats.map((stat) => (

function ProfessorDashboard({ config, offerings, offeringsLoading, offeringsError, summaryError, t }) {
  const groups = groupOfferingsByYearSemester(offerings);

  return (
    <div className="stackXl">
      {summaryError ? <div className="alert">{summaryError}</div> : null}
      {offeringsError ? <div className="alert">{offeringsError}</div> : null}

      <section className="heroPanel">
        <div className="heroCopy">
          <div className="eyebrow">{config.badge}</div>
          <h2 className="heroTitle">{config.heroTitle}</h2>
          <p className="heroText">{config.heroText}</p>
          <div className="heroActions">
            {config.quickActions.map((action) => (
              <Link key={action.to} className="btn btnPrimary" to={action.to}>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="heroStats">
          {config.stats.map((stat) => (
 main
            <article key={stat.label} className="metricCard">
              <div className="metricValue">{stat.value}</div>
              <div className="metricLabel">{stat.label}</div>
              <div className="metricMeta">{stat.meta}</div>
            </article>
          ))}
        </div>
      </section>

 feat/student-eligibility-dashboard
      <section className="dashboardGrid">
        <article className="surfaceCard">
          <div className="sectionHeader">
            <h3>Current semester courses</h3>
          </div>
          <div className="sectionBody">
            {courses.length ? (
              <div className="studentItemList">
                {courses.map((course) => (
                  <div key={course.enrollmentId} className="studentItemRow">
                    <div>
                      <strong>{course.courseCode} - {course.courseName}</strong>
                      <span>Year {course.yearOfStudy}, semester {course.semesterNo}, section {course.sectionCode}</span>
                    </div>
                    <span className="statusPill statusLive">{course.enrollmentSource}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="emptyState">No eligible current-semester courses are visible yet.</div>
            )}
          </div>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader">
            <h3>Visible exams</h3>
          </div>
          <div className="sectionBody">
            {exams.length ? (
              <div className="studentItemList">
                {exams.map((exam) => (
                  <div key={exam.id} className="studentItemRow">
                    <div>
                      <strong>{exam.title}</strong>
                      <span>{exam.courseCode} - {formatDateTime(exam.startsAt)} / {exam.durationMinutes} min</span>
                    </div>
                    <Link className="btn" to={`/exams/${exam.id}`}>
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="emptyState">No published exams are visible for your eligible courses.</div>
            )}
          </div>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader">
            <h3>Carry-over courses</h3>
          </div>
          <div className="sectionBody">
            {carryOvers.length ? (
              <div className="studentItemList">
                {carryOvers.map((item) => (
                  <div key={item.id} className="studentItemRow">
                    <div>
                      <strong>{item.courseCode} - {item.courseName}</strong>
                      <span>{item.reason} from semester {item.originSemesterNo}{item.originTerm ? `, ${item.originTerm}` : ""}</span>
                    </div>
                    <span className="statusPill statusDraft">{item.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="emptyState">No open carry-over courses are currently assigned.</div>
            )}
          </div>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader">
            <h3>Visibility rules</h3>
          </div>
          <div className="sectionBody">
            <div className="bulletStack">
              <div className="listRow">
                <span className="listDot" />
                <span>Only eligible enrollments from the current term are shown.</span>
              </div>
              <div className="listRow">
                <span className="listDot" />
                <span>Exams must be published and linked to an eligible course offering.</span>
              </div>
              <div className="listRow">
                <span className="listDot" />
                <span>Carry-over courses appear separately until they are closed or cancelled.</span>
              </div>
            </div>
          </div>
        </article>

      <section className="surfaceCard professorOfferingsSurface">
        <div className="sectionHeader professorOfferingsHeader">
          <div>
            <h3>{t("rolePanels.professor.offerings.title")}</h3>
            <span className="small">{t("rolePanels.professor.offerings.subtitle")}</span>
          </div>
          <span className="statusPill statusLive">
            {t("rolePanels.professor.offerings.total", { count: offerings.length })}
          </span>
        </div>
        <div className="sectionBody">
          {offeringsLoading ? (
            <div className="pageStateCard">{t("rolePanels.professor.offerings.loading")}</div>
          ) : groups.length === 0 ? (
            <div className="emptyState">
              <p>{t("rolePanels.professor.offerings.emptyTitle")}</p>
              <p>{t("rolePanels.professor.offerings.emptyText")}</p>
            </div>
          ) : (
            <div className="offeringGroupStack">
              {groups.map((group) => (
                <article className="offeringGroup" key={group.key}>
                  <div className="offeringGroupHeader">
                    <div>
                      <h4>{t("rolePanels.professor.offerings.groupTitle", { year: group.year, semester: group.semester })}</h4>
                      <span className="small">{t("rolePanels.professor.offerings.groupCount", { count: group.items.length })}</span>
                    </div>
                  </div>

                  <div className="assignedOfferingGrid">
                    {group.items.map((offering) => (
                      <article className="assignedOfferingCard" key={offering.id}>
                        <div className="resourceMetaRow">
                          <span className={`statusPill ${isLiveOffering(offering.status) ? "statusLive" : "statusDraft"}`}>
                            {offering.status || "-"}
                          </span>
                          <span className="small">{formatSection(offering, t)}</span>
                        </div>
                        <h4>{formatCourseTitle(offering, t)}</h4>
                        <dl className="offeringMetaList">
                          <div>
                            <dt>{t("rolePanels.professor.offerings.term")}</dt>
                            <dd>{formatTerm(offering, t)}</dd>
                          </div>
                          <div>
                            <dt>{t("rolePanels.professor.offerings.delivery")}</dt>
                            <dd>{offering.deliveryType || "-"}</dd>
                          </div>
                          <div>
                            <dt>{t("rolePanels.professor.offerings.capacity")}</dt>
                            <dd>{Number.isFinite(Number(offering.capacity)) ? offering.capacity : "-"}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
 main
      </section>
    </div>
  );
}

 feat/student-eligibility-dashboard
function formatDateTime(value) {
  if (!value) return "No schedule";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getDashboardConfig(roleKey, t) {

function groupOfferingsByYearSemester(offerings) {
  const groups = new Map();

  [...offerings]
    .sort((a, b) =>
      Number(a.yearOfStudy ?? 0) - Number(b.yearOfStudy ?? 0) ||
      Number(a.semesterNo ?? 0) - Number(b.semesterNo ?? 0) ||
      String(a.course?.code || "").localeCompare(String(b.course?.code || "")) ||
      String(a.sectionCode || "").localeCompare(String(b.sectionCode || ""))
    )
    .forEach((offering) => {
      const year = Number(offering.yearOfStudy ?? 0);
      const semester = Number(offering.semesterNo ?? 0);
      const key = `${year}-${semester}`;

      if (!groups.has(key)) {
        groups.set(key, { key, year, semester, items: [] });
      }

      groups.get(key).items.push(offering);
    });

  return Array.from(groups.values());
}

function formatCourseTitle(offering, t) {
  const code = offering.course?.code?.trim();
  const name = offering.course?.name?.trim();

  if (code && name) return `${code} - ${name}`;
  return code || name || t("rolePanels.professor.offerings.courseFallback");
}

function formatTerm(offering, t) {
  const name = offering.term?.name?.trim();
  const academicYear = offering.term?.academicYearLabel?.trim();

  if (name && academicYear) return `${name} (${academicYear})`;
  return name || academicYear || t("rolePanels.professor.offerings.termFallback");
}

function formatSection(offering, t) {
  return t("rolePanels.professor.offerings.section", { section: offering.sectionCode || "-" });
}

function isLiveOffering(status) {
  return ["Published", "Active"].includes(status);
}
 main

function getDashboardConfig(roleKey, t, metrics = {}, loading = false, hasError = false) {
 main
  const fallback = "student";
  const current = ["admin", "professor", "assistant", "student"].includes(roleKey) ? roleKey : fallback;
  const value = (key) => formatMetric(metrics?.[key], loading, hasError);

  const statsByRole = {
    admin: [
      { label: t("rolePanels.admin.stats.activeUsers.label"), value: value("activeUsers"), meta: t("rolePanels.admin.stats.activeUsers.meta") },
      { label: t("rolePanels.admin.stats.offerings.label"), value: value("offerings"), meta: t("rolePanels.admin.stats.offerings.meta") },
      { label: t("rolePanels.admin.stats.imports.label"), value: value("imports"), meta: t("rolePanels.admin.stats.imports.meta") },
      { label: t("rolePanels.admin.stats.alerts.label"), value: value("alerts"), meta: t("rolePanels.admin.stats.alerts.meta") },
    ],
    professor: [
      { label: t("rolePanels.professor.stats.assignedCourses.label"), value: value("assignedCourses"), meta: t("rolePanels.professor.stats.assignedCourses.meta") },
      { label: t("rolePanels.professor.stats.draftExams.label"), value: value("draftExams"), meta: t("rolePanels.professor.stats.draftExams.meta") },
      { label: t("rolePanels.professor.stats.questionBank.label"), value: value("questionBank"), meta: t("rolePanels.professor.stats.questionBank.meta") },
      { label: t("rolePanels.professor.stats.grading.label"), value: value("grading"), meta: t("rolePanels.professor.stats.grading.meta") },
    ],
    assistant: [
      { label: t("rolePanels.assistant.stats.assignedOfferings.label"), value: value("assignedOfferings"), meta: t("rolePanels.assistant.stats.assignedOfferings.meta") },
      { label: t("rolePanels.assistant.stats.supportExams.label"), value: value("supportExams"), meta: t("rolePanels.assistant.stats.supportExams.meta") },
      { label: t("rolePanels.assistant.stats.reviewTasks.label"), value: value("reviewTasks"), meta: t("rolePanels.assistant.stats.reviewTasks.meta") },
      { label: t("rolePanels.assistant.stats.activeSessions.label"), value: value("activeSessions"), meta: t("rolePanels.assistant.stats.activeSessions.meta") },
    ],
    student: [
      { label: t("rolePanels.student.stats.eligibleExams.label"), value: value("eligibleExams"), meta: t("rolePanels.student.stats.eligibleExams.meta") },
      { label: t("rolePanels.student.stats.upcoming.label"), value: value("upcoming"), meta: t("rolePanels.student.stats.upcoming.meta") },
      { label: t("rolePanels.student.stats.results.label"), value: value("results"), meta: t("rolePanels.student.stats.results.meta") },
      { label: t("rolePanels.student.stats.carryOver.label"), value: value("carryOver"), meta: t("rolePanels.student.stats.carryOver.meta") },
    ],
  };

  const quickActionsByRole = {
    admin: [
      { label: t("rolePanels.admin.quickActions.academicSetup"), to: "/admin/academic" },
      { label: t("rolePanels.admin.quickActions.manageUsers"), to: "/admin/users" },
    ],
    professor: [
      { label: t("rolePanels.professor.quickActions.openExams"), to: "/exams" },
      { label: t("rolePanels.professor.quickActions.createExam"), to: "/exams/new" },
    ],
    assistant: [
      { label: t("rolePanels.assistant.quickActions.assignedExams"), to: "/exams" },
    ],
    student: [
      { label: t("rolePanels.student.quickActions.viewExams"), to: "/exams" },
    ],
  };

  const sectionsByRole = {
    admin: [
      {
        title: t("rolePanels.admin.sections.priorities.title"),
        items: t("rolePanels.admin.sections.priorities.items", { returnObjects: true }),
      },
      {
        title: t("rolePanels.admin.sections.nextMoves.title"),
        items: t("rolePanels.admin.sections.nextMoves.items", { returnObjects: true }),
      },
    ],
    professor: [
      {
        title: t("rolePanels.professor.sections.focus.title"),
        items: t("rolePanels.professor.sections.focus.items", { returnObjects: true }),
      },
      {
        title: t("rolePanels.professor.sections.courses.title"),
        items: t("rolePanels.professor.sections.courses.items", { returnObjects: true }),
      },
    ],
    assistant: [
      {
        title: t("rolePanels.assistant.sections.responsibilities.title"),
        items: t("rolePanels.assistant.sections.responsibilities.items", { returnObjects: true }),
      },
      {
        title: t("rolePanels.assistant.sections.notes.title"),
        items: t("rolePanels.assistant.sections.notes.items", { returnObjects: true }),
      },
    ],
    student: [
      {
        title: t("rolePanels.student.sections.visible.title"),
        items: t("rolePanels.student.sections.visible.items", { returnObjects: true }),
      },
      {
        title: t("rolePanels.student.sections.security.title"),
        items: t("rolePanels.student.sections.security.items", { returnObjects: true }),
      },
    ],
  };

  return {
    badge: t(`rolePanels.${current}.badge`),
    heroTitle: t(`rolePanels.${current}.heroTitle`),
    heroText: t(`rolePanels.${current}.heroText`),
    stats: statsByRole[current],
    quickActions: quickActionsByRole[current],
    sections: sectionsByRole[current],
  };
}

function formatMetric(rawValue, loading, hasError) {
  if (loading) return "...";
  if (hasError) return "--";
  const value = Number(rawValue ?? 0);
  if (!Number.isFinite(value)) return "00";
  return String(value).padStart(2, "0");
}
