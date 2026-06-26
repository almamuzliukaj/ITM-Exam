import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppShell from "../../components/AppShell";
import SmuSourceBanner from "../../components/SmuSourceBanner";
import StudentIdentityCard from "../../components/StudentIdentityCard";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useSmuIntegrationStatus } from "../../hooks/useSmuIntegrationStatus";
import {
  createUser,
  importUsers,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  uploadOfficialStudentPhoto,
} from "../../lib/usersApi";

const ROLE_OPTIONS = ["Student", "Professor", "Assistant", "Admin"];
const CSV_TEMPLATE = `FullName,Email,Role,StudentNumber,IsActive,Password
Alice Student,alice@student.edu,Student,STU-2026-001,true,
Bob Professor,bob@university.edu,Professor,,true,Welcome123
Sara Assistant,sara@university.edu,Assistant,,true,`;

const initialCreateForm = {
  fullName: "",
  email: "",
  role: "Student",
  studentNumber: "",
  password: "",
  isActive: true,
};

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const smuStatus = useSmuIntegrationStatus();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: "", role: "", status: "all" });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [creating, setCreating] = useState(false);
  const [importText, setImportText] = useState(CSV_TEMPLATE);
  const [defaultPassword, setDefaultPassword] = useState("Welcome123");
  const [generatePasswords, setGeneratePasswords] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", role: "Student", studentNumber: "", isActive: true });
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [photoUploadingId, setPhotoUploadingId] = useState("");
  const [activeUserTool, setActiveUserTool] = useState("");
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPageSize, setDirectoryPageSize] = useState(10);

  const queryFilters = useMemo(() => {
    const statusFilter = filters.status === "all" ? {} : { isActive: filters.status === "active" };
    return {
      search: filters.search || undefined,
      role: filters.role || undefined,
      ...statusFilter,
    };
  }, [filters]);

  const userSummary = useMemo(() => {
    const active = users.filter((account) => account.isActive).length;
    const inactive = users.length - active;
    const staff = users.filter((account) => account.role === "Professor" || account.role === "Assistant").length;

    return { active, inactive, staff };
  }, [users]);
  const directoryPageCount = Math.max(1, Math.ceil(users.length / directoryPageSize));
  const visibleUsers = useMemo(() => {
    const startIndex = (directoryPage - 1) * directoryPageSize;
    return users.slice(startIndex, startIndex + directoryPageSize);
  }, [directoryPage, directoryPageSize, users]);
  const directoryStart = users.length === 0 ? 0 : (directoryPage - 1) * directoryPageSize + 1;
  const directoryEnd = Math.min(users.length, directoryPage * directoryPageSize);
  const smuManaged = smuStatus.isConfigured;

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      setPageError("");
      const data = await listUsers(queryFilters);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setPageError(readError(error, t("adminUsers.loadUsersError")));
    } finally {
      setLoadingUsers(false);
    }
  }, [queryFilters, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setDirectoryPage(1);
  }, [filters.search, filters.role, filters.status, directoryPageSize]);

  useEffect(() => {
    setDirectoryPage((current) => Math.min(current, directoryPageCount));
  }, [directoryPageCount]);

  async function handleCreateUser(e) {
    e.preventDefault();
    try {
      setCreating(true);
      setPageError("");
      setPageSuccess("");
      await createUser(createForm);
      setCreateForm(initialCreateForm);
      setPageSuccess(t("adminUsers.createSuccess"));
      await loadUsers();
    } catch (error) {
      setPageError(readError(error, t("adminUsers.createError")));
    } finally {
      setCreating(false);
    }
  }

  function handlePreviewImport() {
    const { rows, errors } = parseCsvRows(importText, t);
    setImportPreview(rows.map((row) => ({ ...row, error: errors[row.__line] || "" })));
    setImportResult(null);
    setPageError(Object.keys(errors).length > 0 ? t("adminUsers.previewIssue") : "");
  }

  async function handleImportUsers() {
    try {
      const { rows, errors } = parseCsvRows(importText, t);
      setImportPreview(rows.map((row) => ({ ...row, error: errors[row.__line] || "" })));
      if (Object.keys(errors).length > 0) {
        setPageError(t("adminUsers.fixCsv"));
        return;
      }

      setImporting(true);
      setPageError("");
      setPageSuccess("");

      const payload = {
        defaultPassword: defaultPassword || null,
        generatePasswords,
        users: rows.map((row) => {
          const payloadRow = { ...row };
          delete payloadRow.__line;
          return payloadRow;
        }),
      };

      const result = await importUsers(payload);
      setImportResult(result);
      setPageSuccess(t("adminUsers.importSuccess", { count: result.imported }));
      await loadUsers();
    } catch (error) {
      setPageError(readError(error, t("adminUsers.importError")));
    } finally {
      setImporting(false);
    }
  }

  function beginEdit(account) {
    if (isSmuManagedAccount(account, smuManaged)) {
      setPageError("Student and staff profile fields are managed by SMU while integration is active.");
      return;
    }
    setEditingId(account.id);
    setEditForm({
      fullName: account.fullName,
      role: account.role,
      studentNumber: account.studentNumber || "",
      isActive: account.isActive,
    });
  }

  async function saveEdit(userId) {
    try {
      setPageError("");
      await updateUser(userId, editForm);
      setEditingId(null);
      setPageSuccess(t("adminUsers.updateSuccess"));
      await loadUsers();
    } catch (error) {
      setPageError(readError(error, t("adminUsers.updateError")));
    }
  }

  async function toggleStatus(account) {
    if (isSmuManagedAccount(account, smuManaged)) {
      setPageError("Student and staff activation status is managed by SMU while integration is active.");
      return;
    }
    try {
      setPageError("");
      await updateUserStatus(account.id, !account.isActive);
      setPageSuccess(
        t("adminUsers.statusSuccess", {
          action: account.isActive ? t("adminUsers.deactivated") : t("adminUsers.activated")
        })
      );
      await loadUsers();
    } catch (error) {
      setPageError(readError(error, t("adminUsers.statusError")));
    }
  }

  async function handleResetPassword(userId) {
    const account = users.find((entry) => entry.id === userId);
    if (isSmuManagedAccount(account, smuManaged)) {
      setPageError("Password reset for SMU-managed students and staff should be handled from the source system.");
      return;
    }
    const newPassword = passwordDrafts[userId];
    if (!newPassword) {
      setPageError(t("adminUsers.resetMissing"));
      return;
    }

    try {
      setPageError("");
      await resetUserPassword(userId, newPassword);
      setPasswordDrafts((current) => ({ ...current, [userId]: "" }));
      setPageSuccess(t("adminUsers.resetSuccess"));
    } catch (error) {
      setPageError(readError(error, t("adminUsers.resetError")));
    }
  }

  async function handlePhotoUpload(account, file) {
    if (!file) return;
    if (account.role !== "Student") {
      setPageError("Official photographs are managed only for student accounts.");
      return;
    }

    try {
      setPhotoUploadingId(account.id);
      setPageError("");
      setPageSuccess("");
      await uploadOfficialStudentPhoto(account.id, file);
      setPageSuccess("Official student photograph saved.");
      await loadUsers();
    } catch (error) {
      setPageError(readError(error, "Official photograph could not be saved."));
    } finally {
      setPhotoUploadingId("");
    }
  }

  if (userLoading) {
    return <div className="pageState">{t("adminUsers.loading")}</div>;
  }

  if (!user) {
    return <div className="pageState">{userError || t("adminUsers.userError")}</div>;
  }

  return (
    <AppShell
      user={user}
      badge={t("adminUsers.badge")}
      title={t("adminUsers.title")}
      subtitle={t("adminUsers.subtitle")}
      actions={<Link className="btn" to="/dashboard">{t("adminUsers.backToOverview")}</Link>}
    >
      <div className="stackXl">
        {pageError ? <div className="alert">{pageError}</div> : null}
        {pageSuccess ? <div className="successBanner">{pageSuccess}</div> : null}
        <SmuSourceBanner
          title="Students and staff come from SMU"
          description="Synced student, professor, and assistant records are displayed here for review. Manual account creation and CSV import remain available for local overrides and emergency onboarding."
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
            <div className="eyebrow">{t("adminUsers.badge")}</div>
            <h2 className="heroTitle">{t("adminUsers.title")}</h2>
            <p className="heroText">{t("adminUsers.subtitle")}</p>
          </div>
          <div className="adminHeroMeta">
            <div className="adminHeroMetaRow">
              <span>{t("adminUsers.active")}</span>
              <strong>{userSummary.active}</strong>
            </div>
            <div className="adminHeroMetaRow">
              <span>{t("adminUsers.inactive")}</span>
              <strong>{userSummary.inactive}</strong>
            </div>
            <div className="adminHeroMetaRow">
              <span>Staff</span>
              <strong>{userSummary.staff}</strong>
            </div>
          </div>
        </section>

        <section className="surfaceCard adminControlPanel">
          <div className="sectionHeader">
            <div>
              <h3>Account workspace controls</h3>
              <span className="sectionMeta">Keep the directory visible and open account tools only when needed.</span>
            </div>
          </div>
          <div className="sectionBody">
            <div className="adminToolbar">
              <div className="segmentedControl" aria-label="User management tool">
                <button className={activeUserTool === "" ? "active" : ""} type="button" onClick={() => setActiveUserTool("")}>
                  Directory
                </button>
                <button className={activeUserTool === "create" ? "active" : ""} type="button" onClick={() => setActiveUserTool("create")}>
                  Create user
                </button>
                <button className={activeUserTool === "import" ? "active" : ""} type="button" onClick={() => setActiveUserTool("import")}>
                  Import CSV
                </button>
              </div>
              <div className="adminToolbarStatus">
                <span className="statusPill statusLive">{userSummary.active} active</span>
                <span className="statusPill statusDraft">{userSummary.inactive} inactive</span>
              </div>
            </div>
          </div>
        </section>

        {activeUserTool === "create" || activeUserTool === "import" ? (
        <section className="dashboardGrid dashboardGridWide adminCreatePanel">
          {activeUserTool === "create" ? (
          <article className="surfaceCard adminFormCard">
            <div className="sectionHeader">
              <div>
                <h3>{t("adminUsers.createUser")}</h3>
                <span className="sectionMeta">{smuManaged ? "Manual override while SMU is configured." : "Manual fallback for local accounts."}</span>
              </div>
            </div>
            <div className="sectionBody">
              <form className="stackLg" onSubmit={handleCreateUser}>
                {smuManaged ? <div className="pageStateCard">SMU is configured. Manual accounts are still allowed for emergency, testing, or local-only users.</div> : null}
                <fieldset className="formFieldset">
                <div className="field">
                  <label className="label">{t("adminUsers.fullName")}</label>
                  <input className="input" value={createForm.fullName} onChange={(e) => setCreateForm((c) => ({ ...c, fullName: e.target.value }))} required />
                </div>
                <div className="field">
                  <label className="label">{t("adminUsers.email")}</label>
                  <input className="input" type="email" value={createForm.email} onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))} required />
                </div>
                <div className="field">
                  <label className="label">{t("adminUsers.role")}</label>
                  <select className="input" value={createForm.role} onChange={(e) => setCreateForm((c) => ({ ...c, role: e.target.value, studentNumber: e.target.value === "Student" ? c.studentNumber : "" }))}>
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{t(`adminUsers.roles.${role}`)}</option>)}
                  </select>
                </div>
                {createForm.role === "Student" ? (
                  <div className="field">
                    <label className="label">Student ID number</label>
                    <input className="input" value={createForm.studentNumber} onChange={(e) => setCreateForm((c) => ({ ...c, studentNumber: e.target.value }))} required />
                  </div>
                ) : null}
                <div className="field">
                  <label className="label">{t("adminUsers.temporaryPassword")}</label>
                  <input className="input" value={createForm.password} onChange={(e) => setCreateForm((c) => ({ ...c, password: e.target.value }))} required />
                </div>
                <label className="checkboxRow">
                  <input type="checkbox" checked={createForm.isActive} onChange={(e) => setCreateForm((c) => ({ ...c, isActive: e.target.checked }))} />
                  <span>{t("adminUsers.activeAccount")}</span>
                </label>
                <button className="btn btnPrimary" type="submit" disabled={creating}>{creating ? t("adminUsers.creating") : t("adminUsers.createButton")}</button>
                </fieldset>
              </form>
            </div>
          </article>
          ) : null}

          {activeUserTool === "import" ? (
          <article className="surfaceCard adminFormCard">
            <div className="sectionHeader">
              <div>
                <h3>{t("adminUsers.bulkImport")}</h3>
                <span className="sectionMeta">{smuManaged ? "Manual override while SMU is configured." : "Manual fallback for seed/import work."}</span>
              </div>
            </div>
            <div className="sectionBody stackLg">
              {smuManaged ? <div className="pageStateCard">SMU is configured. CSV import remains available for test data, missing local accounts, or emergency onboarding.</div> : null}
              <fieldset className="formFieldset">
              <div className="field">
                <label className="label">{t("adminUsers.defaultPassword")}</label>
                <input className="input" value={defaultPassword} onChange={(e) => setDefaultPassword(e.target.value)} placeholder={t("adminUsers.defaultPasswordPlaceholder")} />
              </div>
              <label className="checkboxRow">
                <input type="checkbox" checked={generatePasswords} onChange={(e) => setGeneratePasswords(e.target.checked)} />
                <span>{t("adminUsers.generatePasswords")}</span>
              </label>
              <div className="field">
                <label className="label">{t("adminUsers.csvRows")}</label>
                <textarea className="input textarea" value={importText} onChange={(e) => setImportText(e.target.value)} />
              </div>
              <div className="row" style={{ justifyContent: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <button className="btn" type="button" onClick={handlePreviewImport}>{t("adminUsers.validateFile")}</button>
                <button className="btn btnPrimary" type="button" onClick={handleImportUsers} disabled={importing}>
                  {importing ? t("adminUsers.importing") : t("adminUsers.importUsers")}
                </button>
              </div>
              </fieldset>
            </div>
          </article>
          ) : null}
        </section>
        ) : null}

        {activeUserTool === "import" ? (
        <section className="surfaceCard adminTableCard">
          <div className="sectionHeader"><h3>{t("adminUsers.importPreview")}</h3></div>
          <div className="sectionBody">
            {importPreview.length === 0 ? (
              <div className="pageStateCard">{t("adminUsers.previewHint")}</div>
            ) : (
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>{t("adminUsers.line")}</th>
                      <th>{t("adminUsers.fullName")}</th>
                      <th>{t("adminUsers.email")}</th>
                      <th>{t("adminUsers.role")}</th>
                      <th>Student ID</th>
                      <th>{t("adminUsers.status")}</th>
                      <th>{t("adminUsers.validation")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row) => (
                      <tr key={`${row.email}-${row.__line}`}>
                        <td>{row.__line}</td>
                        <td>{row.fullName}</td>
                        <td>{row.email}</td>
                        <td>{t(`adminUsers.roles.${row.role}`) || row.role}</td>
                        <td>{row.studentNumber || "-"}</td>
                        <td>{row.isActive ? t("adminUsers.active") : t("adminUsers.inactive")}</td>
                        <td>{row.error || t("adminUsers.ready")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        ) : null}

        {activeUserTool === "import" && importResult ? (
          <section className="dashboardGrid">
            <article className="surfaceCard adminTableCard">
              <div className="sectionHeader"><h3>{t("adminUsers.importSummary")}</h3></div>
              <div className="sectionBody">
                <div className="summaryStrip">
                  <article className="summaryCard"><span className="summaryLabel">{t("adminUsers.requested")}</span><strong>{importResult.requested}</strong></article>
                  <article className="summaryCard"><span className="summaryLabel">{t("adminUsers.imported")}</span><strong>{importResult.imported}</strong></article>
                  <article className="summaryCard"><span className="summaryLabel">{t("adminUsers.failed")}</span><strong>{importResult.failed}</strong></article>
                </div>
              </div>
            </article>

            {importResult.users?.length > 0 ? (
              <article className="surfaceCard adminTableCard">
                <div className="sectionHeader"><h3>{t("adminUsers.importedAccounts")}</h3></div>
                <div className="sectionBody">
                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>{t("adminUsers.fullName")}</th>
                          <th>{t("adminUsers.email")}</th>
                          <th>{t("adminUsers.role")}</th>
                          <th>Student ID</th>
                          <th>{t("adminUsers.temporaryPassword")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.users.map((account) => (
                          <tr key={account.id}>
                            <td>{account.fullName}</td>
                            <td>{account.email}</td>
                            <td>{t(`adminUsers.roles.${account.role}`) || account.role}</td>
                            <td>{account.studentNumber || "-"}</td>
                            <td>{account.temporaryPassword || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            ) : null}

            {importResult.errors?.length > 0 ? (
              <article className="surfaceCard adminTableCard">
                <div className="sectionHeader"><h3>{t("adminUsers.failedRows")}</h3></div>
                <div className="sectionBody">
                  <div className="tableWrap">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>{t("adminUsers.email")}</th>
                          <th>{t("common.error") || "Error"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((item, index) => (
                          <tr key={`${item.email}-${index}`}>
                            <td>{item.email}</td>
                            <td>{item.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            ) : null}
          </section>
        ) : null}

        <section className="surfaceCard adminTableCard">
          <div className="sectionHeader">
            <div>
              <h3>{t("adminUsers.userDirectory")}</h3>
              <span className="sectionMeta">
                Showing {directoryStart}-{directoryEnd} of {users.length} account{users.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className="sectionBody stackLg">
            <div className="filtersRow">
              <input className="input" placeholder={t("adminUsers.searchPlaceholder")} value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} />
              <select className="input" value={filters.role} onChange={(e) => setFilters((c) => ({ ...c, role: e.target.value }))}>
                <option value="">{t("adminUsers.allRoles")}</option>
                {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{t(`adminUsers.roles.${role}`)}</option>)}
              </select>
              <select className="input" value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
                <option value="all">{t("adminUsers.allStatuses")}</option>
                <option value="active">{t("adminUsers.active")}</option>
                <option value="inactive">{t("adminUsers.inactive")}</option>
              </select>
              <select className="input inputCompact" value={directoryPageSize} onChange={(e) => setDirectoryPageSize(Number(e.target.value))} aria-label="Rows per page">
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>

            {loadingUsers ? (
              <div className="pageStateCard">{t("adminUsers.loadingRecords")}</div>
            ) : (
              <div className="stackLg">
                <div className="tableWrap adminDirectoryTableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>Identity</th>
                        <th>{t("adminUsers.email")}</th>
                        <th>{t("adminUsers.role")}</th>
                        <th>Student ID</th>
                        <th>{t("adminUsers.status")}</th>
                        <th>Source</th>
                        <th>{t("adminUsers.created")}</th>
                        <th>{t("adminUsers.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={8}>No users match the current filters.</td>
                        </tr>
                      ) : visibleUsers.map((account) => {
                        const isEditing = editingId === account.id;
                        const smuLockedAccount = isSmuManagedAccount(account, smuManaged);
                        return (
                          <tr key={account.id}>
                            <td>
                              {isEditing ? (
                                <input className="input" value={editForm.fullName} onChange={(e) => setEditForm((c) => ({ ...c, fullName: e.target.value }))} />
                              ) : account.role === "Student" ? (
                                <StudentIdentityCard identity={account} compact />
                              ) : account.fullName}
                            </td>
                            <td>{account.email}</td>
                            <td>{isEditing ? (
                              <select className="input" value={editForm.role} onChange={(e) => setEditForm((c) => ({ ...c, role: e.target.value, studentNumber: e.target.value === "Student" ? c.studentNumber : "" }))}>
                                {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{t(`adminUsers.roles.${role}`)}</option>)}
                              </select>
                            ) : t(`adminUsers.roles.${account.role}`) || account.role}</td>
                            <td>
                              {isEditing && editForm.role === "Student" ? (
                                <input className="input inputCompact" value={editForm.studentNumber} onChange={(e) => setEditForm((c) => ({ ...c, studentNumber: e.target.value }))} />
                              ) : account.studentNumber || "-"}
                            </td>
                            <td><span className={`statusPill ${account.isActive ? "statusLive" : "statusDraft"}`}>{account.isActive ? t("adminUsers.active") : t("adminUsers.inactive")}</span></td>
                            <td><span className={`statusPill ${smuLockedAccount ? "statusLive" : "statusDraft"}`}>{smuLockedAccount ? "SMU sync" : "Local"}</span></td>
                            <td>{new Date(account.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div className="actionsCol">
                                {smuLockedAccount ? (
                                  <span className="small">Managed by SMU</span>
                                ) : null}
                                {isEditing ? (
                                  <>
                                    <label className="checkboxRow">
                                      <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((c) => ({ ...c, isActive: e.target.checked }))} />
                                      <span>{t("adminUsers.active")}</span>
                                    </label>
                                    <div className="row" style={{ gap: 8, justifyContent: "flex-start" }}>
                                      <button className="btn btnPrimary" type="button" onClick={() => saveEdit(account.id)}>{t("adminUsers.save")}</button>
                                      <button className="btn" type="button" onClick={() => setEditingId(null)}>{t("common.cancel")}</button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {!smuLockedAccount ? <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
                                      <button className="btn" type="button" onClick={() => beginEdit(account)}>{t("adminUsers.edit")}</button>
                                      <button className="btn" type="button" onClick={() => toggleStatus(account)}>
                                        {account.isActive ? t("adminUsers.deactivate") : t("adminUsers.activate")}
                                      </button>
                                    </div> : null}
                                    {!smuLockedAccount ? <div className="row" style={{ gap: 8, justifyContent: "flex-start" }}>
                                      <input className="input" placeholder={t("adminUsers.newPassword")} value={passwordDrafts[account.id] || ""} onChange={(e) => setPasswordDrafts((c) => ({ ...c, [account.id]: e.target.value }))} />
                                      <button className="btn" type="button" onClick={() => handleResetPassword(account.id)}>{t("adminUsers.reset")}</button>
                                    </div> : null}
                                    {account.role === "Student" ? (
                                      <label className="btn officialPhotoUploadButton">
                                        {photoUploadingId === account.id ? "Uploading..." : account.hasOfficialPhoto ? "Replace photo" : "Upload photo"}
                                        <input
                                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                          type="file"
                                          disabled={photoUploadingId === account.id}
                                          onChange={(event) => handlePhotoUpload(account, event.target.files?.[0])}
                                        />
                                      </label>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="paginationBar">
                  <span>
                    Showing {directoryStart}-{directoryEnd} of {users.length}
                  </span>
                  <div className="paginationActions">
                    <button className="btn" type="button" disabled={directoryPage <= 1} onClick={() => setDirectoryPage((current) => Math.max(1, current - 1))}>
                      Previous
                    </button>
                    <span className="paginationCurrent">Page {directoryPage} of {directoryPageCount}</span>
                    <button className="btn" type="button" disabled={directoryPage >= directoryPageCount} onClick={() => setDirectoryPage((current) => Math.min(directoryPageCount, current + 1))}>
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function parseCsvRows(rawText, t) {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return { rows: [], errors: {} };
  }

  const rows = [];
  const errors = {};
  const seenEmails = new Set();

  for (let index = 1; index < lines.length; index += 1) {
    const parts = parseCsvLine(lines[index]).map((part) => part.trim());
    const [fullName = "", email = "", role = "", studentNumber = "", isActive = "true", password = ""] = parts;
    const normalizedRole = normalizeRole(role);
    const key = email.toLowerCase();
    const lineNumber = index + 1;
    let error = "";

    if (!fullName || !email || !role) {
      error = t("adminUsers.csvErrors.required");
    } else if (!normalizedRole) {
      error = t("adminUsers.csvErrors.invalidRole");
    } else if (normalizedRole === "Student" && !studentNumber.trim()) {
      error = "Student ID number is required for student accounts.";
    } else if (seenEmails.has(key)) {
      error = t("adminUsers.csvErrors.duplicate");
    } else if (password && !isStrongPassword(password)) {
      error = t("adminUsers.csvErrors.weakPassword");
    }

    seenEmails.add(key);

    if (error) {
      errors[lineNumber] = error;
    }

    rows.push({
      __line: lineNumber,
      fullName,
      email,
      role: normalizedRole || role,
      studentNumber,
      isActive: isActive.toLowerCase() !== "false",
      password,
    });
  }

  return { rows, errors };
}

function isStrongPassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function normalizeRole(role) {
  return ROLE_OPTIONS.find((option) => option.toLowerCase() === String(role || "").trim().toLowerCase()) || "";
}

function readError(error, fallback) {
  return error?.response?.data?.message ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    fallback;
}

function isSmuManagedAccount(account, smuManaged) {
  return Boolean(smuManaged && account && ["Student", "Professor", "Assistant"].includes(account.role));
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}
