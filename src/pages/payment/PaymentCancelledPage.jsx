import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { cancelOrder } from "../../services/orderApi.js";

export default function PaymentCancelledPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order");

  useEffect(() => {
    // Safe no-op if the order is already PAID/FAILED/CANCELLED — only downgrades a
    // still-PENDING order, never fabricates success.
    if (orderNumber) {
      cancelOrder(orderNumber).catch(() => {});
    }
  }, [orderNumber]);

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
