import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getSmuContract, getSmuLivePreview, runSmuSync } from "../../lib/smuApi";

export default function AdminSmuIntegrationPage() {
  const { user, loading: userLoading, error: userError } = useCurrentUser();
  const [contract, setContract] = useState(null);
  const [preview, setPreview] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");

  const previewCounts = useMemo(() => {
    if (!preview) return null;
    return [
      { label: "Students", value: preview.students?.length || 0 },
      { label: "Staff", value: preview.staff?.length || 0 },
      { label: "Terms", value: preview.terms?.length || 0 },
      { label: "Courses", value: preview.courses?.length || 0 },
      { label: "Offerings", value: preview.offerings?.length || 0 },
      { label: "Enrollments", value: preview.enrollments?.length || 0 },
    ];
  }, [preview]);

  const loadContract = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      setContract(await getSmuContract());
    } catch (error) {
      setPageError(readError(error, "Failed to load SMU integration contract."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  async function handlePreview() {
    try {
      setPreviewing(true);
      setPageError("");
      setPageSuccess("");
      const data = await getSmuLivePreview();
      setPreview(data);
      setContract(data.contract || contract);
      setPageSuccess("SMU preview loaded. Review mapped records before running a real sync.");
    } catch (error) {
      setPageError(readError(error, "Live preview is unavailable. Confirm the SMU base URL and endpoints."));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSync() {
    const confirmed = window.confirm("Run SMU sync now? This can create or update users, terms, courses, offerings, and enrollments.");
    if (!confirmed) return;

    try {
      setSyncing(true);
      setPageError("");
      setPageSuccess("");
      const result = await runSmuSync();
      setSyncResult(result);
      setPageSuccess("SMU sync completed.");
    } catch (error) {
      setPageError(readError(error, "SMU sync failed. Review configuration and try again."));
    } finally {
      setSyncing(false);
    }
  }

  if (userLoading) return <div className="pageState">Loading SMU workspace...</div>;
  if (!user) return <div className="pageState">{userError || "Unable to load user profile."}</div>;

  const sourceOfTruth = contract?.sourceOfTruth || [];
  const remainsInOnlineExam = contract?.remainsInOnlineExam || [];
  const endpoints = contract?.endpoints || [];

  return (
    <AppShell
      user={user}
      badge="Administration"
      title="SMU integration readiness"
      subtitle="Plan and verify which academic records come from the external student management system before manual admin screens are reduced to sync views."
      actions={
        <>
          <Link className="btn" to="/admin/academic">Academic</Link>
          <Link className="btn" to="/admin/enrollments">Enrollments</Link>
        </>
      }
    >
      <div className="stackXl">
        {pageError ? <div className="alert">{pageError}</div> : null}
        {pageSuccess ? <div className="successBanner">{pageSuccess}</div> : null}

        <section className="adminDashboardHero adminDashboardHeroCompact">
          <div className="adminDashboardHeroCopy">
            <div className="adminHeroBrand">
              <img className="adminHeroBrandLogo adminHeroBrandLogoIcon" src="/app-logo.svg" alt="Online Exam" />
              <span>SMU Integration</span>
            </div>
            <div className="eyebrow">Source of truth</div>
            <h2 className="heroTitle">Academic data comes from SMU</h2>
            <p className="heroText">
              Students, staff, terms, courses, offerings, and enrollments should be synchronized from SMU. Online Exam keeps exam authoring, attempts, grading, publishing, and integrity records.
            </p>
          </div>
          <div className="adminHeroMeta">
            <div className="adminHeroMetaRow">
              <span>Status</span>
              <strong>{contract?.isConfigured ? "Configured" : "Needs URL"}</strong>
            </div>
            <div className="adminHeroMetaRow">
              <span>Endpoints</span>
              <strong>{endpoints.length}</strong>
            </div>
            <div className="adminHeroMetaRow">
              <span>Last sync</span>
              <strong>{syncResult?.syncedAt ? formatDateTime(syncResult.syncedAt) : "Not run"}</strong>
            </div>
          </div>
        </section>

        <section className="smuActionPanel">
          <div>
            <span className="summaryLabel">Integration contract</span>
            <strong>{contract?.baseUrl || "SMU base URL is not configured"}</strong>
            <p>Use preview first when the SMU API is available. Sync should run only after the mapped record counts look correct.</p>
          </div>
          <div className="resourceActionGroup">
            <button className="btn" type="button" onClick={handlePreview} disabled={previewing || loading}>
              {previewing ? "Loading preview..." : "Load live preview"}
            </button>
            <button className="btn btnPrimary" type="button" onClick={handleSync} disabled={syncing || loading || !contract?.isConfigured}>
              {syncing ? "Syncing..." : "Run sync"}
            </button>
          </div>
        </section>

        {loading ? (
          <div className="pageStateCard">Loading SMU contract...</div>
        ) : (
          <>
            <section className="dashboardGrid dashboardGridWide">
              <OwnershipPanel title="SMU owns" items={sourceOfTruth} />
              <OwnershipPanel title="Online Exam owns" items={remainsInOnlineExam} />
            </section>

            <section className="surfaceCard adminTableCard">
              <div className="sectionHeader"><h3>Required SMU endpoints</h3></div>
              <div className="sectionBody">
                <div className="tableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>Entity</th>
                        <th>Relative path</th>
                        <th>Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoints.map((endpoint) => (
                        <tr key={`${endpoint.entity}-${endpoint.relativePath}`}>
                          <td>{endpoint.entity}</td>
                          <td><code>{endpoint.relativePath}</code></td>
                          <td>{endpoint.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}

        {previewCounts ? (
          <section className="summaryStrip">
            {previewCounts.map((item) => (
              <article className="summaryCard" key={item.label}>
                <span className="summaryLabel">{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </section>
        ) : null}

        {syncResult ? (
          <section className="surfaceCard adminTableCard">
            <div className="sectionHeader"><h3>Last sync result</h3></div>
            <div className="sectionBody">
              <div className="smuSyncGrid">
                <SyncMetric label="Students" created={syncResult.studentsCreated} updated={syncResult.studentsUpdated} />
                <SyncMetric label="Staff" created={syncResult.staffCreated} updated={syncResult.staffUpdated} />
                <SyncMetric label="Terms" created={syncResult.termsCreated} updated={syncResult.termsUpdated} />
                <SyncMetric label="Courses" created={syncResult.coursesCreated} updated={syncResult.coursesUpdated} />
                <SyncMetric label="Offerings" created={syncResult.offeringsCreated} updated={syncResult.offeringsUpdated} />
                <SyncMetric label="Enrollments" created={(syncResult.semesterEnrollmentsCreated || 0) + (syncResult.courseEnrollmentsCreated || 0)} updated={(syncResult.semesterEnrollmentsUpdated || 0) + (syncResult.courseEnrollmentsUpdated || 0)} />
              </div>
              {syncResult.warnings?.length ? (
                <div className="alert">
                  {syncResult.warnings.map((warning) => <div key={warning}>{warning}</div>)}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function OwnershipPanel({ title, items }) {
  return (
    <article className="surfaceCard adminTableCard">
      <div className="sectionHeader"><h3>{title}</h3></div>
      <div className="sectionBody">
        <div className="smuOwnershipGrid">
          {items.map((item) => (
            <div className="smuOwnershipItem" key={`${title}-${item.entity}`}>
              <span className="summaryLabel">{item.sourceSystem}</span>
              <strong>{item.entity}</strong>
              <p>{item.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function SyncMetric({ label, created = 0, updated = 0 }) {
  return (
    <article className="summaryCard">
      <span className="summaryLabel">{label}</span>
      <strong>{created + updated}</strong>
      <small>{created} created, {updated} updated</small>
    </article>
  );
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function readError(error, fallback) {
  return error?.response?.data?.message ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    fallback;
}
