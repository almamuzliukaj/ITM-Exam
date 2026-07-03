export default function ConfirmDialog({
  title,
  eyebrow = "Confirmation",
  children,
  tone = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmDisabled = false,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="modalBackdrop" role="presentation">
      <section className={`modalCard confirmationDialog ${tone === "danger" ? "confirmationDialogDanger" : ""}`} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <div className="modalHeader">
          <div>
            <span className="summaryLabel">{eyebrow}</span>
            <h3 id="confirm-dialog-title">{title}</h3>
          </div>
        </div>
        <div className="sectionBody">
          {children}
        </div>
        <div className="modalFooter">
          <button className="btn" type="button" onClick={onCancel} disabled={confirmDisabled}>
            {cancelLabel}
          </button>
          <button className={tone === "danger" ? "btn btnDanger" : "btn btnPrimary"} type="button" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
