import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function SmuSourceBanner({
  title,
  description,
  isConfigured,
  loading,
  error,
  actionLabel,
}) {
  const { t } = useTranslation();
  const resolvedActionLabel = actionLabel || t("smuSource.review");

  return (
    <section className={`smuNotice ${isConfigured ? "smuNoticeActive" : "smuNoticeFallback"}`}>
      <div>
        <span className="summaryLabel">{loading ? t("smuSource.checking") : isConfigured ? t("smuSource.active") : t("smuSource.manual")}</span>
        <strong>{title}</strong>
        <p>{error || description}</p>
      </div>
      <div className="resourceActionGroup">
        <span className={`statusPill ${isConfigured ? "statusLive" : "statusDraft"}`}>
          {isConfigured ? t("smuSource.synced") : t("smuSource.fallback")}
        </span>
        <Link className="btn" to="/admin/smu">{resolvedActionLabel}</Link>
      </div>
    </section>
  );
}
