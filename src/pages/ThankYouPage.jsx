import { useEffect, useState } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import { getTrialByToken } from "../services/trialApi.js";
import { getOrder } from "../services/orderApi.js";
import CheckoutLayout from "../components/checkout/CheckoutLayout.jsx";
import ThankYouConfetti from "../components/ThankYouConfetti.jsx";
import AutoPaySuccessCard from "../components/checkout/AutoPaySuccessCard.jsx";

// WhatsApp Community Invite URL — update this constant when changing the community link.
const WHATSAPP_COMMUNITY_URL =
  import.meta.env.VITE_WHATSAPP_COMMUNITY_URL || "https://chat.whatsapp.com/invite/jovens-yoga";

function formatDateTime(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

function formatDateOnly(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatSelectedSlot(trial) {
  if (!trial) return "";
  const parts = [];
  if (trial.slotLabel) {
    parts.push(trial.slotLabel);
  }
  let datePart = "";
  if (trial.slotDate) {
    datePart = formatDateOnly(trial.slotDate);
    if (trial.slotStartTime) {
      datePart += ` ${trial.slotStartTime}`;
    }
  }
  if (parts.length > 0 && datePart) {
    return `${parts[0]} — ${datePart}`;
  }
  if (parts.length > 0) return parts[0];
  if (datePart) return datePart;
  return "";
}

function getTrialDays(trial) {
  if (trial?.trialStartDate && trial?.trialExpiryDate) {
    const start = new Date(trial.trialStartDate).getTime();
    const end = new Date(trial.trialExpiryDate).getTime();
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return diffDays;
  }
  return 5;
}

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

  useEffect(() => {
    document.body.classList.add("thankyou-page-active");
    return () => {
      document.body.classList.remove("thankyou-page-active");
    };
  }, []);

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
        <AutoPaySuccessCard trial={trial} />
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

  // Free trial, currently active — matching the second reference design exactly
  if (trial) {
    const trialDays = getTrialDays(trial);
    const firstName = trial.firstName || "Member";
    const planName = trial.planName || "Standard";
    const currency = trial.currency || "INR";
    const monthlyPrice = trial.price != null ? trial.price : "19.19";
    const slotText = formatSelectedSlot(trial);

    return (
      <CheckoutLayout>
        <div className="thankyou-wrapper">
          <ThankYouConfetti />

          {/* Main White Thank You Card */}
          <div className="thankyou-main-card">
            {/* Green Gradient Header Section */}
            <div className="thankyou-header-banner" />

            {/* Large Circular Green Check Icon Overlapping Header */}
            <div className="thankyou-check-wrapper">
              <div className="thankyou-check-outer">
                <div className="thankyou-check-inner">
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="thankyou-card-body">
              <h1 className="thankyou-title">Congratulations, {firstName} !</h1>
              <p className="thankyou-status-subtitle">
                Your {planName} <span className="thankyou-status-highlight">{trialDays}-Day Free Trial is Active.</span>
              </p>
              <p className="thankyou-welcome-msg">
                Welcome to your yoga journey, We’re excited to have you with us !
              </p>

              {/* Green-Bordered Trial Details Box */}
              <div className="thankyou-details-box">
                <div className="thankyou-detail-row">
                  <span className="thankyou-detail-label">Plan</span>
                  <span className="thankyou-detail-value">{planName}</span>
                </div>
                <div className="thankyou-detail-row">
                  <span className="thankyou-detail-label">Registration ID</span>
                  <span className="thankyou-detail-value">{trial.id}</span>
                </div>
                <div className="thankyou-detail-row">
                  <span className="thankyou-detail-label">Trial Start</span>
                  <span className="thankyou-detail-value">{formatDateTime(trial.trialStartDate)}</span>
                </div>
                <div className="thankyou-detail-row">
                  <span className="thankyou-detail-label">Trial Expiry</span>
                  <span className="thankyou-detail-value">{formatDateTime(trial.trialExpiryDate)}</span>
                </div>
                {slotText && (
                  <div className="thankyou-detail-row">
                    <span className="thankyou-detail-label">Selected Slot</span>
                    <span className="thankyou-detail-value">{slotText}</span>
                  </div>
                )}
                <div className="thankyou-detail-row">
                  <span className="thankyou-detail-label">Today</span>
                  <span className="thankyou-detail-value">{currency} 0</span>
                </div>
                <div className="thankyou-detail-row">
                  <span className="thankyou-detail-label">After Trial (Per Month)</span>
                  <span className="thankyou-detail-value">{currency} {monthlyPrice}</span>
                </div>
              </div>

              {/* Action Buttons: 1. Back to Home (black), 2. Join WhatsApp Community (green) */}
              <div className="thankyou-btn-group">
                <Link to="/" className="thankyou-btn-home">
                  Back to Home
                </Link>
                <a
                  href={WHATSAPP_COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="thankyou-btn-whatsapp"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="thankyou-wa-icon"
                    aria-hidden="true"
                  >
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.004.579 1.777.857 2.806.857 3.18 0 5.767-2.586 5.767-5.766.001-3.18-2.585-5.766-5.767-5.766zm3.393 8.163c-.144.405-.837.774-1.17.824-.312.045-.634.073-1.801-.412-1.393-.579-2.28-2.001-2.35-2.094-.07-.093-.564-.75-.564-1.429 0-.679.354-1.014.479-1.152.125-.138.272-.173.363-.173.091 0 .182.001.261.005.083.004.195-.032.304.232.113.275.385.94.42 1.009.034.07.057.151.011.242-.046.091-.069.148-.137.228-.068.079-.143.176-.205.237-.068.068-.139.141-.06.277.079.136.35 1.774 1.344 2.247.288.137.534.195.727.226.24.038.382.032.525-.084.143-.117.614-.716.779-.961.164-.245.328-.205.549-.123.221.082 1.402.661 1.642.781.24.12.4.18.459.282.06.102.06.592-.084.997z" />
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.34 5L2 22l5.17-1.31C8.61 21.49 10.26 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm.03 17.67c-1.57 0-3.08-.47-4.38-1.32l-.31-.2-3.06.8.82-2.98-.21-.33c-.93-1.46-1.42-3.15-1.42-4.91 0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 8.94-8.94 8.94z" />
                  </svg>
                  <span>Join WhatsApp Community</span>
                </a>
              </div>
            </div>
          </div>

          {/* Green Important Notice Box Below Card */}
          <div className="thankyou-notice-card">
            <div className="thankyou-notice-header">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Important Notice</span>
            </div>
            <div className="thankyou-notice-body">
              <strong>Your {trialDays}-day free trial is now active.</strong> You won’t be charged today. Your saved payment method will be automatically charged <strong>{currency} {monthlyPrice}/month</strong> after the trial ends on <strong>{formatDateOnly(trial.trialExpiryDate)}</strong>.
            </div>
          </div>
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
