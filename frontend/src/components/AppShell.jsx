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
    { to: "/exams", labelKey: "shell.nav.professorExams" },
    { to: "/exams/new", labelKey: "shell.nav.professorCreateExam" },
  ],
  Assistant: [
    { to: "/dashboard", labelKey: "shell.nav.assistantOverview" },
    { to: "/exams", labelKey: "shell.nav.assistantExams" },
  ],
  Student: [
    { to: "/dashboard", labelKey: "shell.nav.studentOverview" },
    { to: "/exams", labelKey: "shell.nav.studentExams" },
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

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarTop">
          <Link className="brand brandLarge" to="/dashboard">
            <span className="logoMark" />
            <span>
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

      <div className="mainPanel">
        <header className="topbar">
          <div>
            {badge ? <div className="eyebrow">{badge}</div> : null}
            <h1 className="pageTitle">{title}</h1>
            {subtitle ? <p className="pageSubtitle">{subtitle}</p> : null}
          </div>
          <div className="topbarActions">{actions}</div>
          <LanguageSwitcher compact />
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
