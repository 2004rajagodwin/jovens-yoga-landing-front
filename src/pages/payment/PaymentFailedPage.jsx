import { useSearchParams, Link } from "react-router-dom";

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <div className="container py-5 text-center" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1 className="mb-3" style={{ fontSize: 26 }}>
        Payment Failed
      </h1>
      <p className="text-muted mb-4">
        Your payment could not be completed{orderNumber ? ` (order ${orderNumber})` : ""}. You have not been
        charged, and no plan has been activated.
      </p>
      <Link to="/" className="btn" style={{ background: "#ff6b1b", color: "#fff" }}>
        Try Again
      </Link>
    </div>
  );
}
