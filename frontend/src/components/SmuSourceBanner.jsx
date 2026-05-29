import { Link } from "react-router-dom";

export default function SmuSourceBanner({
  title,
  description,
  isConfigured,
  loading,
  error,
  actionLabel = "Review SMU contract",
}) {
  return (
    <section className={`smuNotice ${isConfigured ? "smuNoticeActive" : "smuNoticeFallback"}`}>
      <div>
        <span className="summaryLabel">{loading ? "Checking SMU" : isConfigured ? "SMU source active" : "Manual fallback"}</span>
        <strong>{title}</strong>
        <p>{error || description}</p>
      </div>
      <div className="resourceActionGroup">
        <span className={`statusPill ${isConfigured ? "statusLive" : "statusDraft"}`}>
          {isConfigured ? "Synced data" : "Fallback mode"}
        </span>
        <Link className="btn" to="/admin/smu">{actionLabel}</Link>
      </div>
    </section>
  );
}
