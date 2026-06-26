import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import StudentIdentityCard from "./StudentIdentityCard";
import { logout } from "../lib/auth";

const navigationByRole = {
  Admin: [
    {
      titleKey: "shell.sections.overview",
      items: [{ to: "/dashboard", labelKey: "shell.nav.adminOverview", icon: "OV" }],
    },
    {
      titleKey: "shell.sections.academicOperations",
      items: [
        { to: "/admin/academic", labelKey: "shell.nav.adminAcademic", icon: "AC" },
        { to: "/admin/enrollments", labelKey: "shell.nav.adminEnrollments", icon: "EN" },
        { to: "/admin/users", labelKey: "shell.nav.adminUsers", icon: "US" },
        { to: "/admin/smu", labelKey: "shell.nav.adminSmu", icon: "SM" },
        { to: "/reports", labelKey: "shell.nav.adminReports", icon: "RP" },
      ],
    },
  ],
  Professor: [
    {
      titleKey: "shell.sections.overview",
      items: [{ to: "/dashboard", labelKey: "shell.nav.professorOverview", icon: "OV" }],
    },
    {
      titleKey: "shell.sections.teaching",
      items: [
        { to: "/exams", labelKey: "shell.nav.professorExams", icon: "EX" },
        { to: "/exams/new", labelKey: "shell.nav.professorCreateExam", icon: "NE" },
        { to: "/question-bank", labelKey: "shell.nav.professorQuestionBank", icon: "QB" },
        { to: "/gradebook", labelKey: "shell.nav.professorGradebook", icon: "GB", fallbackLabel: "Gradebook" },
        { to: "/reports", labelKey: "shell.nav.professorReports", icon: "RP" },
      ],
    },
  ],
  Assistant: [
    {
      titleKey: "shell.sections.overview",
      items: [{ to: "/dashboard", labelKey: "shell.nav.assistantOverview", icon: "OV" }],
    },
    {
      titleKey: "shell.sections.teachingSupport",
      items: [
        { to: "/question-bank", labelKey: "shell.nav.assistantQuestionBank", icon: "QB" },
        { to: "/exams", labelKey: "shell.nav.assistantExams", icon: "EX" },
        { to: "/reports", labelKey: "shell.nav.assistantReports", icon: "RP" },
      ],
    },
  ],
  Student: [
    {
      titleKey: "shell.sections.overview",
      items: [{ to: "/dashboard", labelKey: "shell.nav.studentOverview", icon: "OV" }],
    },
    {
      titleKey: "shell.sections.studentRecords",
      items: [
        { to: "/exams", labelKey: "shell.nav.studentExams", icon: "EX" },
        { to: "/results", labelKey: "shell.nav.studentResults", icon: "RS" },
      ],
    },
  ],
};

export default function AppShell({
  user,
  title,
  subtitle,
  badge,
  actions,
  children,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const groups = navigationByRole[user?.role] || navigationByRole.Student;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={`appShell roleShell roleShell${user?.role || "Guest"}`}>
      <a className="skipLink" href="#main-content">Skip to main content</a>
      {isMobileMenuOpen ? <button className="mobileNavBackdrop" type="button" aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)} /> : null}
      <aside className={`sidebar sidebar${user?.role || "Guest"}${isMobileMenuOpen ? " sidebarOpen" : ""}`} aria-label="Primary navigation">
        <div className="sidebarTop">
          <Link className="brand brandLarge" to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
            <img className="brandLogo brandLogoIcon" src="/app-logo.svg" alt="Online Exam" />
            <span className="brandCaption">
              <strong>{t("common.appName")}</strong>
              <small>{t("common.facultyWorkspace")}</small>
            </span>
          </Link>

          <button
            className="mobileCloseButton"
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            ×
          </button>

          <div className="sidebarIdentity">
            {user?.role === "Student" ? (
              <StudentIdentityCard identity={user} compact />
            ) : (
              <>
                <div className="avatarCircle">{getInitials(user?.email)}</div>
                <div>
                  <div className="sidebarLabel">{t("common.signedIn")}</div>
                  <div className="sidebarValue">{user?.email || t("common.unknownUser")}</div>
                  <div className="sidebarMeta">
                    <span className="roleDot" aria-hidden="true" />
                    {user?.role || t("common.guest")}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <nav className="sidebarNav" aria-label={`${user?.role || "User"} workspace navigation`}>
          {groups.map((group) => (
            <div className="navGroup" key={group.titleKey}>
              <div className="sidebarSectionTitle">{t(group.titleKey)}</div>
              <div className="navGroupItems">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `navItem${isActive ? " navItemActive" : ""}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="navIcon" aria-hidden="true">{item.icon}</span>
                    <span className="navText">{item.fallbackLabel ? t(item.labelKey, item.fallbackLabel) : t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebarFoot">
          <div className="supportPanel">
            <div className="sidebarSectionTitle">{t("common.operationalNote")}</div>
            <p>{t("common.operationalNoteText")}</p>
          </div>
          <button className="btn btnGhost" type="button" onClick={handleLogout}>
            {t("common.logout")}
          </button>
        </div>
      </aside>

      <div className={`mainPanel mainPanel${user?.role || "Guest"}`}>
        <header className="topbar">
          <div className="topbarIntro">
            <div className="topbarIntroRow">
              <button
                className="mobileMenuButton"
                type="button"
                aria-label="Open navigation"
                onClick={() => setIsMobileMenuOpen((current) => !current)}
              >
                <span />
                <span />
                <span />
              </button>
              <div>
                {badge ? <div className="eyebrow">{badge}</div> : null}
                <h1 className="pageTitle">{title}</h1>
              </div>
            </div>
            {subtitle ? <p className="pageSubtitle">{subtitle}</p> : null}
          </div>
          <div className="topbarTools">
            <div className="topbarActions">{actions}</div>
            <LanguageSwitcher compact />
          </div>
        </header>

        <main id="main-content" className="contentArea" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}

function getInitials(email) {
  if (!email) return "OE";
  return email.slice(0, 2).toUpperCase();
}
