const STATUS_STYLE = {
  PAID: "success",
  SENT: "success",
  TRIAL_ACTIVE: "success",
  ACTIVE: "success",
  PENDING: "warning",
  TRIAL_EXPIRED: "neutral",
  FAILED: "danger",
  CANCELLED: "neutral",
  REFUNDED: "info",
  INACTIVE: "neutral",
};

export default function StatusBadge({ status }) {
  const variant = STATUS_STYLE[status] || "neutral";
  return <span className={`jy-badge ${variant}`}>{status}</span>;
}
