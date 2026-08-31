import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getTrial } from "../services/trialApi.js";
import { getOrder } from "../services/orderApi.js";

/**
 * Single Thank You concept for both flows. A visitor can freely type
 * /thank-you?type=paid&order=anything in the address bar — this page always re-verifies
 * against the backend and only ever renders success content once the backend confirms
 * TRIAL_ACTIVE or PAID. It never trusts the URL as proof by itself.
 */
export default function ThankYouPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");

  const [status, setStatus] = useState("loading"); // loading | success | not-found
  const [trial, setTrial] = useState(null);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (type === "trial") {
          const id = searchParams.get("id");
          const data = await getTrial(id);
          if (cancelled) return;
          if (data.status !== "TRIAL_ACTIVE") {
            setStatus("not-found");
            return;
          }
          setTrial(data);
          setStatus("success");
        } else if (type === "paid") {
          const orderNumber = searchParams.get("order");
          const data = await getOrder(orderNumber);
          if (cancelled) return;
          if (data.status !== "PAID") {
            setStatus("not-found");
            return;
          }
          setOrder(data);
          setStatus("success");
        } else {
          setStatus("not-found");
        }
      } catch {
        if (!cancelled) setStatus("not-found");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [type, searchParams]);

  if (status === "loading") {
    return <div className="container py-5 text-center">Loading…</div>;
  }

  if (status === "not-found") {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1 className="mb-3" style={{ fontSize: 26 }}>
          Nothing to show yet
        </h1>
        <p className="text-muted mb-4">
          We couldn't confirm a successful trial or payment for this reference.
        </p>
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  if (trial) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 className="mb-3" style={{ fontSize: 28 }}>
          Your Free Trial Is Active
        </h1>
        <p className="text-muted mb-4">Welcome, {trial.firstName}! Your free trial has been activated.</p>

        <div className="text-start" style={{ border: "1px solid #eee", borderRadius: 10, padding: 24 }}>
          <p>
            <strong>Plan:</strong> {trial.planName}
          </p>
          <p>
            <strong>Registration ID:</strong> {trial.id}
          </p>
          <p>
            <strong>Trial Start:</strong> {new Date(trial.trialStartDate).toLocaleDateString()}
          </p>
          <p>
            <strong>Trial Expiry:</strong> {new Date(trial.trialExpiryDate).toLocaleDateString()}
          </p>
          <p className="mb-0">
            <strong>Status:</strong> {trial.status}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5 text-center" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="mb-3" style={{ fontSize: 28 }}>
        Payment Confirmed
      </h1>
      <p className="text-muted mb-4">Thank you, {order.customerName}! Your membership is now active.</p>

      <div className="text-start" style={{ border: "1px solid #eee", borderRadius: 10, padding: 24 }}>
        <p>
          <strong>Order ID:</strong> {order.orderNumber}
        </p>
        <p>
          <strong>Plan:</strong> {order.planName}
        </p>
        <p>
          <strong>Duration:</strong> {order.durationLabel}
        </p>
        <p>
          <strong>Amount:</strong> {order.currency} {order.amount}
        </p>
        <p className="mb-0">
          <strong>Status:</strong> {order.status}
        </p>
      </div>
    </div>
  );
}
