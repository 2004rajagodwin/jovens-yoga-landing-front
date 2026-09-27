import { useEffect, useState } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
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
  const location = useLocation();
  const type = searchParams.get("type");
  const token = searchParams.get("token");

  const [status, setStatus] = useState(() => {
    if (type === "trial" && location.state?.trial?.paymentAmount != null) return "success";
    if (type === "trial" && location.state?.trial?.status === "TRIAL_ACTIVE") return "success";
    if (type === "paid" && location.state?.order?.status === "PAID") return "success";
    return "loading";
  });
  const [trial, setTrial] = useState(() => (type === "trial" ? location.state?.trial || null : null));
  const [order, setOrder] = useState(() => (type === "paid" ? location.state?.order || null : null));
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
          const converted = data.paymentAmount != null;
          const isExpiryPassed = data.trialExpiryDate && new Date(data.trialExpiryDate) <= new Date();
          const isAutoPayEnabled = !data.autoPayCancelled && Boolean(data.stripeSubscriptionId);
          const isRenewalPending = isAutoPayEnabled && isExpiryPassed && !converted && data.status !== "PAYMENT_FAILED";

          if (data.status !== "TRIAL_ACTIVE" && !converted && !isRenewalPending) {
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

  // If renewal is pending, poll for conversion
  useEffect(() => {
    if (type !== "trial" || !token || !trial) return;
    const isExpiryPassed = trial.trialExpiryDate && new Date(trial.trialExpiryDate) <= new Date();
    const isAutoPayEnabled = !trial.autoPayCancelled && Boolean(trial.stripeSubscriptionId);
    const isRenewalPending = isAutoPayEnabled && isExpiryPassed && trial.paymentAmount == null && trial.status !== "PAYMENT_FAILED";

    if (!isRenewalPending) return;

    let pollCount = 0;
    const maxPolls = 24; // ~60 seconds
    const interval = setInterval(() => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(interval);
        return;
      }
      getTrialByToken(token)
        .then((data) => {
          if (data) {
            setTrial(data);
            if (data.paymentAmount != null || data.status === "PAYMENT_FAILED" || (data.status === "TRIAL_EXPIRED" && data.autoPayCancelled)) {
              clearInterval(interval);
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [type, token, trial]);

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

  // Trial that has since converted to a paid subscription (post-AutoPay)
  if (trial && trial.paymentAmount != null) {
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
              <strong>Status:</strong> PAID / ACTIVE
            </p>
          </div>
        </div>
      </CheckoutLayout>
    );
  }

  // Renewal Payment Failed
  if (trial && trial.status === "PAYMENT_FAILED") {
    return (
      <CheckoutLayout>
        <div className="container py-5" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="alert alert-danger" style={{ padding: 22, borderRadius: 10 }}>
            <h2 className="mb-2" style={{ fontSize: 20, fontWeight: 600 }}>
              Renewal Payment Failed
            </h2>
            <p className="mb-3">
              Your automatic renewal payment could not be processed with your saved payment method. Please complete payment to continue your membership.
            </p>
            <Link
              to={`/checkout/duration?planId=${trial.planId || 2}&flow=paid`}
              className="btn btn-primary"
            >
              Pay Now
            </Link>
          </div>
        </div>
      </CheckoutLayout>
    );
  }

  // AutoPay Cancelled and Trial Expired
  if (trial && trial.autoPayCancelled && trial.trialExpiryDate && new Date(trial.trialExpiryDate) <= new Date() && trial.paymentAmount == null) {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center" style={{ maxWidth: 540, margin: "0 auto" }}>
          <h2 className="mb-2" style={{ fontSize: 24, fontWeight: 600 }}>
            Your Free Trial Has Ended
          </h2>
          <p className="text-muted mb-4">
            Your AutoPay was cancelled and your free trial has now expired. Choose a plan to continue your practice.
          </p>
          <Link
            to={`/checkout/duration?planId=${trial.planId || 2}&flow=paid`}
            className="btn btn-primary px-4 py-2"
          >
            Pay Now
          </Link>
        </div>
      </CheckoutLayout>
    );
  }

  // Renewal in progress
  if (trial && !trial.autoPayCancelled && trial.stripeSubscriptionId && trial.trialExpiryDate && new Date(trial.trialExpiryDate) <= new Date() && trial.paymentAmount == null && trial.status !== "PAYMENT_FAILED") {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center" style={{ maxWidth: 540, margin: "0 auto" }}>
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: "2.75rem", height: "2.75rem" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h2 className="mb-2" style={{ fontSize: 24, fontWeight: 600 }}>
            Your membership is being activated
          </h2>
          <p className="text-muted mb-4">
            Your free trial has ended and your automatic renewal is being processed. Please check again shortly.
          </p>
          <button
            type="button"
            className="btn btn-outline-primary px-4 py-2"
            onClick={() => {
              if (token) {
                getTrialByToken(token).then((data) => {
                  if (data) setTrial(data);
                }).catch(() => {});
              }
            }}
          >
            Check Status
          </button>
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
            <p className="thankyou-subtitle">Your {trial.planName} Free Trial is Active.</p>
            <p className="thankyou-tagline">Welcome to your yoga journey. We&rsquo;re excited to have you with us!</p>
          </div>

          <div className="thankyou-card">
            <div className="thankyou-card-head">
              <div>
                <h2 className="thankyou-card-title">Trial Details</h2>
                <p className="thankyou-card-subtitle">Here&rsquo;s your plan information</p>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="thankyou-status-pill">
                  <span className="thankyou-status-dot" aria-hidden="true"></span>
                  FREE TRIAL ACTIVE
                </span>
                {trial.autoPayCancelled && (
                  <span className="badge bg-warning text-dark px-2 py-1" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    AutoPay CANCELLED
                  </span>
                )}
              </div>
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
              <div className="thankyou-row">
                <span className="thankyou-row-label">AutoPay Status</span>
                <span className="thankyou-row-value">
                  {trial.autoPayCancelled ? (
                    <span className="text-warning fw-semibold">CANCELLED</span>
                  ) : (
                    <span className="text-success fw-semibold">ENABLED</span>
                  )}
                </span>
              </div>
            </div>

            <div className="thankyou-billing-note">
              <span className="thankyou-billing-icon" aria-hidden="true">
                <i className={`bi ${trial.autoPayCancelled ? "bi-info-circle text-warning" : "bi-calendar-check"}`} aria-hidden="true"></i>
              </span>
              <p>
                <strong>Your free trial is active until {new Date(trial.trialExpiryDate).toLocaleString()}.</strong>
                <br />
                {trial.autoPayCancelled ? (
                  "Your automatic renewal has been cancelled. Your trial continues until expiry and you will not be charged."
                ) : (
                  "You won’t be charged today. Your saved payment method will be automatically charged according to your selected plan after the trial ends."
                )}
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
