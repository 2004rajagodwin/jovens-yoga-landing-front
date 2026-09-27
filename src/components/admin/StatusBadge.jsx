const STATUS_STYLE = {
  PAID: "success",
  SENT: "success",
  TRIAL_ACTIVE: "success",
  ACTIVE: "success",
  TRIAL: "info",
  PENDING: "warning",
  TRIAL_PENDING_PAYMENT: "warning",
  TRIAL_EXPIRED: "neutral",
  EXPIRED: "neutral",
  FAILED: "danger",
  PAYMENT_FAILED: "danger",
  CANCELLED: "danger",
  REFUNDED: "info",
  INACTIVE: "neutral",
  NONE: "neutral",
};

export default function StatusBadge({ status }) {
  const variant = STATUS_STYLE[status] || "neutral";
  return <span className={`jy-badge ${variant}`}>{status}</span>;
}
