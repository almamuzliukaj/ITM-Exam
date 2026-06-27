import { useEffect, useState } from "react";
import { loadProtectedPhotoUrl } from "../lib/studentIdentityApi";

export default function StudentIdentityCard({ identity, compact = false, className = "" }) {
  const [photoObjectUrl, setPhotoObjectUrl] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    (async () => {
      try {
        if (!identity?.photoUrl) {
          setPhotoObjectUrl("");
          return;
        }

        objectUrl = await loadProtectedPhotoUrl(identity.photoUrl);
        if (active) setPhotoObjectUrl(objectUrl);
      } catch {
        if (active) setPhotoObjectUrl("");
      }
    })();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [identity?.photoUrl]);

  if (!identity) return null;

  const initials = identity.initials || buildInitials(identity.fullName, identity.email);
  const photoSrc = photoObjectUrl || "/student-photo-placeholder.svg";

  return (
    <div className={`studentIdentityCard${compact ? " studentIdentityCardCompact" : ""}${className ? ` ${className}` : ""}`}>
      <div className="studentIdentityPhoto" aria-hidden="true">
        <img src={photoSrc} alt="" />
        {!photoObjectUrl ? <span>{initials}</span> : null}
      </div>
      <div className="studentIdentityDetails">
        <span className="summaryLabel">Official student identity</span>
        <strong>{identity.fullName || "Student"}</strong>
        <small>{identity.email || "-"}</small>
        <small>ID: {identity.studentNumber || identity.studentId || "-"}</small>
      </div>
    </div>
  );
}

function buildInitials(fullName, email) {
  const parts = String(fullName || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return parts || String(email || "ST").slice(0, 2).toUpperCase();
}
