import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { getTrialByToken } from "../services/trialApi.js";
import { getOrder } from "../services/orderApi.js";
import { cancelTrialAutoPay } from "../services/paymentApi.js";
import CheckoutLayout from "../components/checkout/CheckoutLayout.jsx";
import ThankYouConfetti from "../components/ThankYouConfetti.jsx";
import CancelAutoPayModal from "../components/CancelAutoPayModal.jsx";
import { ApiError } from "../services/apiClient.js";

/**
 * Single Thank You concept for both flows. A visitor can freely type
 * /thank-you?type=paid&order=anything in the address bar — this page always re-verifies
 * against the backend and only ever renders success content once the backend confirms
 * TRIAL_ACTIVE or PAID. It never trusts the URL as proof by itself.
 */
export default function ThankYouPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading"); // loading | success | not-found
  const [trial, setTrial] = useState(null);
  const [order, setOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (type === "trial") {
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
  }, [type, searchParams, token]);

  async function handleConfirmCancelAutoPay() {
    if (cancelling || !token) return;
    setCancelling(true);
    setCancelError("");
    try {
      await cancelTrialAutoPay(token);
      setTrial((prev) => (prev ? { ...prev, autoPayCancelled: true } : prev));
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel AutoPay. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  function handleCloseCancelModal() {
    if (cancelling) return;
    setShowCancelModal(false);
    setCancelError("");
  }

  if (status === "loading") {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center">Loading…</div>
      </CheckoutLayout>
    );
  }

  if (status === "not-found") {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center" style={{ maxWidth: 480, margin: "0 auto" }}>
          <h1 className="mb-3" style={{ fontSize: 26 }}>
            Nothing to show yet
          </h1>
          <p className="text-muted mb-4">
            We couldn't confirm a successful trial or payment for this reference.
          </p>
          <Link to="/">Back to Home</Link>
        </div>
      </CheckoutLayout>
    );
  }

  // Trial that has since converted to a paid subscription (post-AutoPay) — distinct state,
  // distinct content from both the free-trial-active card below and the one-time paid-order
  // card further down. Left as its existing plain layout, only now inside CheckoutLayout.
  if (trial && trial.status === "TRIAL_EXPIRED" && trial.paymentAmount != null) {
    return (
      <CheckoutLayout>
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
      </CheckoutLayout>
    );
  }

  // Free trial, currently active — the redesigned premium confirmation experience.
  if (trial) {
    return (
      <CheckoutLayout>
        <div className="thankyou-page">
          <ThankYouConfetti />

          <div className="thankyou-hero">
            <div className="thankyou-success-icon-wrap">
              <span className="thankyou-burst" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <span
                    key={i}
                    className="thankyou-burst-ray"
                    style={{ transform: `rotate(${i * 45}deg) translateY(-46px)` }}
                  />
                ))}
              </span>
              <div className="thankyou-success-icon">
                <i className="bi bi-check-lg" aria-hidden="true"></i>
              </div>
            </div>
            <h1>Congratulations, {trial.firstName}!</h1>
            <p className="thankyou-subtitle">Your {trial.planName} 5-Day Free Trial is Active.</p>
            <p className="thankyou-tagline">Welcome to your yoga journey. We&rsquo;re excited to have you with us!</p>
          </div>

          <div className="thankyou-card">
            <div className="thankyou-card-head">
              <div>
                <h2 className="thankyou-card-title">Trial Details</h2>
                <p className="thankyou-card-subtitle">Here&rsquo;s your plan information</p>
              </div>
              <span className="thankyou-status-pill">
                <span className="thankyou-status-dot" aria-hidden="true"></span>
                FREE TRIAL ACTIVE
              </span>
            </div>

            <div className="thankyou-rows">
              <div className="thankyou-row">
                <span className="thankyou-row-label">Plan</span>
                <span className="thankyou-row-value">{trial.planName}</span>
              </div>
              <div className="thankyou-row">
                <span className="thankyou-row-label">Registration ID</span>
                <span className="thankyou-row-value">{trial.id}</span>
              </div>
              <div className="thankyou-row">
                <span className="thankyou-row-label">Trial Start</span>
                <span className="thankyou-row-value">{new Date(trial.trialStartDate).toLocaleString()}</span>
              </div>
              <div className="thankyou-row">
                <span className="thankyou-row-label">Trial Expiry</span>
                <span className="thankyou-row-value">{new Date(trial.trialExpiryDate).toLocaleString()}</span>
              </div>
              {trial.slotDate && (
                <div className="thankyou-row">
                  <span className="thankyou-row-label">Selected Slot</span>
                  <span className="thankyou-row-value">
                    {trial.slotLabel ? `${trial.slotLabel} — ` : ""}
                    {new Date(trial.slotDate).toLocaleDateString()} {trial.slotStartTime ?? ""}
                  </span>
                </div>
              )}
              <div className="thankyou-row">
                <span className="thankyou-row-label">Today</span>
                <span className="thankyou-row-value">{trial.currency} 0</span>
              </div>
              {trial.durationLabel && (
                <div className="thankyou-row">
                  <span className="thankyou-row-label">After Trial ({trial.durationLabel})</span>
                  <span className="thankyou-row-value">
                    {trial.currency} {trial.price}
                  </span>
                </div>
              )}
            </div>

            <div className="thankyou-billing-note">
              <span className="thankyou-billing-icon" aria-hidden="true">
                <i className="bi bi-calendar-check" aria-hidden="true"></i>
              </span>
              <p>
                <strong>Your 5-day free trial is now active.</strong>
                <br />
                You won&rsquo;t be charged today. Your saved payment method will be automatically charged
                according to your selected plan after the trial ends.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-3">
              <Link to={`/trial/details?token=${encodeURIComponent(token)}`} className="checkout-back-link">
                <i className="bi bi-arrow-left"></i> Back
              </Link>
              {!trial.autoPayCancelled && (
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => setShowCancelModal(true)}
                  disabled={cancelling}
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          {showCancelModal && (
            <CancelAutoPayModal
              onConfirm={handleConfirmCancelAutoPay}
              onCancel={handleCloseCancelModal}
              submitting={cancelling}
              errorMessage={cancelError}
            />
          )}

          {/* Same real WhatsApp contact number already used by the site-wide floating button
              on Home.jsx (insd-new-fix-whatsapp) — reused here, not a new/invented number.
              This opens WhatsApp directly; it does not call any backend AskEva/OTP endpoint. */}
          <a
           href="https://wa.me/19592000495"
            target="_blank"
            rel="noopener noreferrer"
            className="thankyou-cta thankyou-cta-whatsapp"
          >
            <i className="fab fa-whatsapp" aria-hidden="true"></i>
            Chat with us on WhatsApp
          </a>
        </div>
      </CheckoutLayout>
    );
  }

  return (
    <CheckoutLayout>
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
    </CheckoutLayout>
  );
}
