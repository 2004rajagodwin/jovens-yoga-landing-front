export default function ConfirmModal({ open, title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel, busy }) {
  if (!open) return null;

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(17,26,74,0.45)" }}
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content jy-fade-in" style={{ borderRadius: 16, border: "none" }}>
          <div className="modal-body p-4">
            <h5 style={{ fontWeight: 700, marginBottom: 8 }}>{title}</h5>
            <p style={{ color: "#697386", fontSize: 14, marginBottom: 22 }}>{message}</p>
            <div className="d-flex gap-2 justify-content-end">
              <button type="button" className="jy-btn jy-btn-outline" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className={`jy-btn ${danger ? "jy-btn-danger-outline" : "jy-btn-gradient"}`}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? "Please wait…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
