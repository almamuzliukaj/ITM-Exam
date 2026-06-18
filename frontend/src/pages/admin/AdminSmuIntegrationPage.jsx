import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppShell from "../../components/AppShell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { getSmuContract, getSmuLivePreview, runSmuSync } from "../../lib/smuApi";

export default function AdminSmuIntegrationPage() {
  const { t } = useTranslation();
  const tx = useCallback((key, options) => t(`adminSmu.${key}`, options), [t]);
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
      { label: tx("students"), value: preview.students?.length || 0 },
      { label: tx("staff"), value: preview.staff?.length || 0 },
      { label: tx("terms"), value: preview.terms?.length || 0 },
      { label: tx("courses"), value: preview.courses?.length || 0 },
      { label: tx("offerings"), value: preview.offerings?.length || 0 },
      { label: tx("enrollments"), value: preview.enrollments?.length || 0 },
    ];
  }, [preview, tx]);

  const loadContract = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      setContract(await getSmuContract());
    } catch (error) {
      setPageError(readError(error, tx("errors.loadContract")));
    } finally {
      setLoading(false);
    }
  }, [tx]);

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
      setPageSuccess(tx("previewLoaded"));
    } catch (error) {
      setPageError(readError(error, tx("errors.preview")));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSync() {
    const confirmed = window.confirm(tx("syncConfirm"));
    if (!confirmed) return;

    try {
      setSyncing(true);
      setPageError("");
      setPageSuccess("");
      const result = await runSmuSync();
      setSyncResult(result);
      setPageSuccess(tx("syncCompleted"));
    } catch (error) {
      setPageError(readError(error, tx("errors.sync")));
    } finally {
      setSyncing(false);
    }
  }

  if (userLoading) return <div className="pageState">{tx("loading")}</div>;
  if (!user) return <div className="pageState">{userError || tx("userError")}</div>;

  const sourceOfTruth = contract?.sourceOfTruth || [];
  const remainsInOnlineExam = contract?.remainsInOnlineExam || [];
  const endpoints = contract?.endpoints || [];

  return (
    <AppShell
      user={user}
      badge={tx("badge")}
      title={tx("title")}
      subtitle={tx("subtitle")}
      actions={
        <>
          <Link className="btn" to="/admin/academic">{tx("academic")}</Link>
          <Link className="btn" to="/admin/enrollments">{tx("enrollments")}</Link>
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
              <span>{tx("brand")}</span>
            </div>
            <div className="eyebrow">{tx("sourceOfTruth")}</div>
            <h2 className="heroTitle">{tx("heroTitle")}</h2>
            <p className="heroText">
              {tx("heroText")}
            </p>
          </div>
          <div className="adminHeroMeta">
            <div className="adminHeroMetaRow">
              <span>{tx("status")}</span>
              <strong>{contract?.isConfigured ? tx("configured") : tx("needsUrl")}</strong>
            </div>
            <div className="adminHeroMetaRow">
              <span>{tx("endpoints")}</span>
              <strong>{endpoints.length}</strong>
            </div>
            <div className="adminHeroMetaRow">
              <span>{tx("lastSync")}</span>
              <strong>{syncResult?.syncedAt ? formatDateTime(syncResult.syncedAt) : tx("notRun")}</strong>
            </div>
          </div>
        </section>

        <section className="smuActionPanel">
          <div>
            <span className="summaryLabel">{tx("integrationContract")}</span>
            <strong>{contract?.baseUrl || tx("baseUrlMissing")}</strong>
            <p>{tx("previewHint")}</p>
          </div>
          <div className="resourceActionGroup">
            <button className="btn" type="button" onClick={handlePreview} disabled={previewing || loading}>
              {previewing ? tx("loadingPreview") : tx("loadPreview")}
            </button>
            <button className="btn btnPrimary" type="button" onClick={handleSync} disabled={syncing || loading || !contract?.isConfigured}>
              {syncing ? tx("syncing") : tx("runSync")}
            </button>
          </div>
        </section>

        {loading ? (
          <div className="pageStateCard">{tx("loadingContract")}</div>
        ) : (
          <>
            <section className="dashboardGrid dashboardGridWide">
              <OwnershipPanel title={tx("smuOwns")} items={sourceOfTruth} />
              <OwnershipPanel title={tx("onlineExamOwns")} items={remainsInOnlineExam} />
            </section>

            <section className="surfaceCard adminTableCard">
              <div className="sectionHeader"><h3>{tx("requiredEndpoints")}</h3></div>
              <div className="sectionBody">
                <div className="tableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>{tx("entity")}</th>
                        <th>{tx("relativePath")}</th>
                        <th>{tx("purpose")}</th>
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
            <div className="sectionHeader"><h3>{tx("lastSyncResult")}</h3></div>
            <div className="sectionBody">
              <div className="smuSyncGrid">
                <SyncMetric label={tx("students")} created={syncResult.studentsCreated} updated={syncResult.studentsUpdated} tx={tx} />
                <SyncMetric label={tx("staff")} created={syncResult.staffCreated} updated={syncResult.staffUpdated} tx={tx} />
                <SyncMetric label={tx("terms")} created={syncResult.termsCreated} updated={syncResult.termsUpdated} tx={tx} />
                <SyncMetric label={tx("courses")} created={syncResult.coursesCreated} updated={syncResult.coursesUpdated} tx={tx} />
                <SyncMetric label={tx("offerings")} created={syncResult.offeringsCreated} updated={syncResult.offeringsUpdated} tx={tx} />
                <SyncMetric label={tx("enrollments")} created={(syncResult.semesterEnrollmentsCreated || 0) + (syncResult.courseEnrollmentsCreated || 0)} updated={(syncResult.semesterEnrollmentsUpdated || 0) + (syncResult.courseEnrollmentsUpdated || 0)} tx={tx} />
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

function SyncMetric({ label, created = 0, updated = 0, tx }) {
  return (
    <article className="summaryCard">
      <span className="summaryLabel">{label}</span>
      <strong>{created + updated}</strong>
      <small>{tx("syncMetric", { created, updated })}</small>
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
