// Professional confirmation modal for AutoPay cancellation — replaces the native
// window.confirm() popup. Styled to match OtpVerificationModal.jsx's existing pattern
// (white card, rounded corners, subtle shadow) so it fits the site's visual theme.
export default function CancelAutoPayModal({ onConfirm, onCancel, submitting, errorMessage }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: 16,
      }}
    >
      <div
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: 14,
          padding: "32px 28px",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onCancel}
          disabled={submitting}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            fontSize: 20,
            lineHeight: 1,
            color: "#6b7280",
            cursor: submitting ? "default" : "pointer",
            padding: 4,
          }}
        >
          &times;
        </button>

        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>Cancel AutoPay?</h2>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>
          Your free trial will remain active until it expires. After the trial ends, no payment will be taken.
        </p>

        {errorMessage && (
          <div className="alert alert-danger" role="alert" style={{ fontSize: 13, padding: "8px 12px", textAlign: "left" }}>
            {errorMessage}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn"
            style={{ width: "100%", background: "#dc3545", color: "#fff" }}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Cancelling…" : "Cancel Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}
