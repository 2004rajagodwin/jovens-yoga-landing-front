import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getTrialByToken } from "../services/trialApi.js";
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
          const token = searchParams.get("token");
          const data = await getTrialByToken(token);
          if (cancelled) return;
          const converted = data.status === "TRIAL_EXPIRED" && data.paymentAmount != null;
          if (data.status !== "TRIAL_ACTIVE" && !converted) {
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

  if (trial && trial.status === "TRIAL_EXPIRED" && trial.paymentAmount != null) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 className="mb-3" style={{ fontSize: 28 }}>
          🎉 Congratulations, {trial.firstName}!
        </h1>
        <p className="text-muted mb-4">Your {trial.planName} Plan is now active.</p>

        <div className="text-start" style={{ border: "1px solid #eee", borderRadius: 10, padding: 24 }}>
          <p>
            <strong>Plan:</strong> {trial.planName}
          </p>
          <p>
            <strong>Trial Expired:</strong> {new Date(trial.trialExpiryDate).toLocaleString()}
          </p>
          <p>
            <strong>Payment Date:</strong> {new Date(trial.paymentDate).toLocaleString()}
          </p>
          <p>
            <strong>Amount:</strong> {trial.paymentCurrency} {trial.paymentAmount}
          </p>
          <p>
            <strong>Subscription Reference:</strong> {trial.stripeSubscriptionId}
          </p>
          <p className="mb-0">
            <strong>Status:</strong> ACTIVE / PAID
          </p>
        </div>
      </div>
    );
  }

  if (trial) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 className="mb-3" style={{ fontSize: 28 }}>
          🎉 Congratulations, {trial.firstName}!
        </h1>
        <p className="text-muted mb-4">
          Your {trial.planName} 5-Day Free Trial is Active.
        </p>

        <div className="text-start" style={{ border: "1px solid #eee", borderRadius: 10, padding: 24 }}>
          <p>
            <strong>Plan:</strong> {trial.planName}
          </p>
          <p>
            <strong>Registration ID:</strong> {trial.id}
          </p>
          <p>
            <strong>Trial Start:</strong> {new Date(trial.trialStartDate).toLocaleString()}
          </p>
          <p>
            <strong>Trial Expiry:</strong> {new Date(trial.trialExpiryDate).toLocaleString()}
          </p>
          {trial.slotDate && (
            <p>
              <strong>Selected Slot:</strong> {trial.slotLabel ? `${trial.slotLabel} — ` : ""}
              {new Date(trial.slotDate).toLocaleDateString()} {trial.slotStartTime ?? ""}
            </p>
          )}
          <p>
            <strong>Today:</strong> {trial.currency} 0
          </p>
          {trial.durationLabel && (
            <p className="mb-0">
              <strong>After Trial ({trial.durationLabel}):</strong> {trial.currency} {trial.price}
            </p>
          )}
        </div>

        <p className="fw-bold mt-4 mb-0">Status: FREE TRIAL ACTIVE</p>
        <p className="text-muted mt-2">
          Your 5-day free trial is now active. You won&rsquo;t be charged today. Your saved payment method will be
          automatically charged according to your selected plan after the trial ends.
        </p>
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
