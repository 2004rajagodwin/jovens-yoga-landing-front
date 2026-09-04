import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { cancelOrder } from "../../services/orderApi.js";
import { cancelTrialByToken } from "../../services/trialApi.js";

export default function PaymentCancelledPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") === "trial" ? "trial" : "paid";
  const orderNumber = searchParams.get("order");
  const token = searchParams.get("token");

  useEffect(() => {
    // Safe no-op if the order/trial is already in a terminal state — only downgrades a
    // still-PENDING order or trial, never fabricates success.
    if (type === "trial" && token) {
      cancelTrialByToken(token).catch(() => {});
    } else if (orderNumber) {
      cancelOrder(orderNumber).catch(() => {});
    }
  }, [type, orderNumber, token]);

  return (
    <div className="container py-5 text-center" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1 className="mb-3" style={{ fontSize: 26 }}>
        Checkout Cancelled
      </h1>
      <p className="text-muted mb-4">
        No payment was made and no plan was activated. You can restart checkout anytime.
      </p>
      <Link to="/" className="btn" style={{ background: "#ff6b1b", color: "#fff" }}>
        Back to Pricing
      </Link>
    </div>
  );
}
