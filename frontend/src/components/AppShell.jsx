import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { logout } from "../lib/auth";

const navigationByRole = {
  Admin: [
    { to: "/dashboard", labelKey: "shell.nav.adminOverview" },
    { to: "/admin/academic", labelKey: "shell.nav.adminAcademic" },
    { to: "/admin/enrollments", labelKey: "shell.nav.adminEnrollments" },
    { to: "/admin/users", labelKey: "shell.nav.adminUsers" },
  ],
  Professor: [
    { to: "/dashboard", labelKey: "shell.nav.professorOverview" },
    { to: "/question-bank", labelKey: "shell.nav.professorQuestionBank" },
    { to: "/exams", labelKey: "shell.nav.professorExams" },
    { to: "/exams/new", labelKey: "shell.nav.professorCreateExam" },
  ],
  Assistant: [
    { to: "/dashboard", labelKey: "shell.nav.assistantOverview" },
    { to: "/question-bank", labelKey: "shell.nav.assistantQuestionBank" },
    { to: "/exams", labelKey: "shell.nav.assistantExams" },
  ],
  Student: [
    { to: "/dashboard", labelKey: "shell.nav.studentOverview" },
    { to: "/exams", labelKey: "shell.nav.studentExams" },
    { to: "/results", labelKey: "shell.nav.studentResults" },
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
  const items = navigationByRole[user?.role] || navigationByRole.Student;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={`appShell roleShell roleShell${user?.role || "Guest"}`}>
      {isMobileMenuOpen ? <button className="mobileNavBackdrop" type="button" aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)} /> : null}
      <aside className={`sidebar sidebar${user?.role || "Guest"}${isMobileMenuOpen ? " sidebarOpen" : ""}`}>
        <div className="sidebarTop">
          <Link className="brand brandLarge" to="/dashboard">
            <img className="brandLogo brandLogoIcon" src="/app-logo.svg" alt="Online Exam" />
            <span className="brandCaption">
              <strong>{t("common.appName")}</strong>
              <small>{t("common.facultyWorkspace")}</small>
            </span>
          </Link>

          <div className="sidebarIdentity">
            <div className="avatarCircle">{getInitials(user?.email)}</div>
            <div>
              <div className="sidebarLabel">{t("common.signedIn")}</div>
              <div className="sidebarValue">{user?.email || t("common.unknownUser")}</div>
              <div className="sidebarMeta">{user?.role || t("common.guest")}</div>
            </div>
          </div>
        </div>

        <nav className="sidebarNav">
          <div className="sidebarSectionTitle">{t("common.workspace")}</div>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `navItem${isActive ? " navItemActive" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="sidebarFoot">
          <div className="supportPanel">
            <div className="sidebarSectionTitle">{t("common.operationalNote")}</div>
            <p>{t("common.operationalNoteText")}</p>
          </div>
          <button className="btn btnGhost" onClick={handleLogout}>
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

        <main className="contentArea">{children}</main>
      </div>
    </div>
  );
}

function getInitials(email) {
  if (!email) return "OE";
  return email.slice(0, 2).toUpperCase();
}
