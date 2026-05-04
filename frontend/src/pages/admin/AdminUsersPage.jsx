import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  createUser,
  importUsers,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from "../../lib/usersApi";

const ROLE_OPTIONS = ["Student", "Professor", "Assistant"];
const CSV_TEMPLATE = `FullName,Email,Role,IsActive,Password
Alice Student,alice@student.edu,Student,true,
Bob Professor,bob@university.edu,Professor,true,Welcome123
Sara Assistant,sara@university.edu,Assistant,true,`;

const initialCreateForm = {
  fullName: "",
  email: "",
  role: "Student",
  password: "",
  isActive: true,
};

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading, error: userError } = useCurrentUser();
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
  const [editForm, setEditForm] = useState({ fullName: "", role: "Student", isActive: true });
  const [passwordDrafts, setPasswordDrafts] = useState({});

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
    setEditingId(account.id);
    setEditForm({
      fullName: account.fullName,
      role: account.role,
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

        <section className="adminDashboardHero">
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

        <section className="dashboardGrid dashboardGridWide">
          <article className="surfaceCard adminFormCard">
            <div className="sectionHeader"><h3>{t("adminUsers.createUser")}</h3></div>
            <div className="sectionBody">
              <form className="stackLg" onSubmit={handleCreateUser}>
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
                  <select className="input" value={createForm.role} onChange={(e) => setCreateForm((c) => ({ ...c, role: e.target.value }))}>
                    {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{t(`adminUsers.roles.${role}`)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">{t("adminUsers.temporaryPassword")}</label>
                  <input className="input" value={createForm.password} onChange={(e) => setCreateForm((c) => ({ ...c, password: e.target.value }))} required />
                </div>
                <label className="checkboxRow">
                  <input type="checkbox" checked={createForm.isActive} onChange={(e) => setCreateForm((c) => ({ ...c, isActive: e.target.checked }))} />
                  <span>{t("adminUsers.activeAccount")}</span>
                </label>
                <button className="btn btnPrimary" type="submit" disabled={creating}>{creating ? t("adminUsers.creating") : t("adminUsers.createButton")}</button>
              </form>
            </div>
          </article>

          <article className="surfaceCard adminFormCard">
            <div className="sectionHeader"><h3>{t("adminUsers.bulkImport")}</h3></div>
            <div className="sectionBody stackLg">
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
            </div>
          </article>
        </section>

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

        {importResult ? (
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
                          <th>{t("adminUsers.temporaryPassword")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.users.map((account) => (
                          <tr key={account.id}>
                            <td>{account.fullName}</td>
                            <td>{account.email}</td>
                            <td>{t(`adminUsers.roles.${account.role}`) || account.role}</td>
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
          <div className="sectionHeader"><h3>{t("adminUsers.userDirectory")}</h3></div>
          <div className="sectionBody stackLg">
            <div className="filtersRow">
              <input className="input" placeholder={t("adminUsers.searchPlaceholder")} value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} />
              <select className="input" value={filters.role} onChange={(e) => setFilters((c) => ({ ...c, role: e.target.value }))}>
                <option value="">{t("adminUsers.allRoles")}</option>
                {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{t(`adminUsers.roles.${role}`)}</option>)}
                <option value="Admin">{t("adminUsers.roles.Admin")}</option>
              </select>
              <select className="input" value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
                <option value="all">{t("adminUsers.allStatuses")}</option>
                <option value="active">{t("adminUsers.active")}</option>
                <option value="inactive">{t("adminUsers.inactive")}</option>
              </select>
            </div>

            {loadingUsers ? (
              <div className="pageStateCard">{t("adminUsers.loadingRecords")}</div>
            ) : (
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>{t("adminUsers.fullName")}</th>
                      <th>{t("adminUsers.email")}</th>
                      <th>{t("adminUsers.role")}</th>
                      <th>{t("adminUsers.status")}</th>
                      <th>{t("adminUsers.created")}</th>
                      <th>{t("adminUsers.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((account) => {
                      const isEditing = editingId === account.id;
                      return (
                        <tr key={account.id}>
                          <td>{isEditing ? <input className="input" value={editForm.fullName} onChange={(e) => setEditForm((c) => ({ ...c, fullName: e.target.value }))} /> : account.fullName}</td>
                          <td>{account.email}</td>
                          <td>{isEditing ? (
                            <select className="input" value={editForm.role} onChange={(e) => setEditForm((c) => ({ ...c, role: e.target.value }))}>
                              {[...ROLE_OPTIONS, "Admin"].map((role) => <option key={role} value={role}>{t(`adminUsers.roles.${role}`)}</option>)}
                            </select>
                          ) : t(`adminUsers.roles.${account.role}`) || account.role}</td>
                          <td><span className={`statusPill ${account.isActive ? "statusLive" : "statusDraft"}`}>{account.isActive ? t("adminUsers.active") : t("adminUsers.inactive")}</span></td>
                          <td>{new Date(account.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="actionsCol">
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
                                  <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start" }}>
                                    <button className="btn" type="button" onClick={() => beginEdit(account)}>{t("adminUsers.edit")}</button>
                                    <button className="btn" type="button" onClick={() => toggleStatus(account)}>
                                      {account.isActive ? t("adminUsers.deactivate") : t("adminUsers.activate")}
                                    </button>
                                  </div>
                                  <div className="row" style={{ gap: 8, justifyContent: "flex-start" }}>
                                    <input className="input" placeholder={t("adminUsers.newPassword")} value={passwordDrafts[account.id] || ""} onChange={(e) => setPasswordDrafts((c) => ({ ...c, [account.id]: e.target.value }))} />
                                    <button className="btn" type="button" onClick={() => handleResetPassword(account.id)}>{t("adminUsers.reset")}</button>
                                  </div>
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
    const parts = lines[index].split(",").map((part) => part.trim());
    const [fullName = "", email = "", role = "", isActive = "true", password = ""] = parts;
    const key = email.toLowerCase();
    const lineNumber = index + 1;
    let error = "";

    if (!fullName || !email || !role) {
      error = t("adminUsers.csvErrors.required");
    } else if (!ROLE_OPTIONS.includes(role) && role !== "Admin") {
      error = t("adminUsers.csvErrors.invalidRole");
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
      role,
      isActive: isActive.toLowerCase() !== "false",
      password,
    });
  }

  return { rows, errors };
}

function isStrongPassword(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function readError(error, fallback) {
  return error?.response?.data?.message || fallback;
}
