import { useEffect } from "react";
import { Link } from "react-router-dom";
import ThankYouConfetti from "../ThankYouConfetti.jsx";

const WHATSAPP_COMMUNITY_URL =
  import.meta.env.VITE_WHATSAPP_COMMUNITY_URL || "https://chat.whatsapp.com/invite/jovens-yoga";

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

function calculatePlanExpiryDate(startDateVal, durationLabel) {
  if (!startDateVal) return "";
  const d = new Date(startDateVal);
  if (isNaN(d.getTime())) return "";
  const expiry = new Date(d);
  if (typeof durationLabel === "string" && durationLabel.toLowerCase().includes("year")) {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + 1);
  }
  return formatDateOnly(expiry);
}

function formatPaidSelectedSlot(trial) {
  if (!trial) return "";
  const label = trial.slotLabel ? trial.slotLabel.trim() : "";
  const dateVal = trial.slotDate || trial.trialStartDate;
  const formattedDate = dateVal ? formatDateOnly(dateVal) : "";
  if (label && formattedDate) {
    return `${label} — ${formattedDate}`;
  }
  if (label) return label;
  if (formattedDate) return formattedDate;
  return "";
}

/**
 * Centered success card for successful AutoPay plan activation,
 * matching the visual design, palette, border radius, check icon,
 * details box, and buttons of the Free Trial Thank You page.
 */
export default function AutoPaySuccessCard({ trial, fallbackName }) {
  useEffect(() => {
    document.body.classList.add("thankyou-page-active");
    return () => {
      document.body.classList.remove("thankyou-page-active");
    };
  }, []);

  const firstName = trial?.firstName?.trim() || fallbackName?.trim() || "Member";
  const planName = trial?.planName || "Standard";
  const registrationId = trial?.id != null ? String(trial.id) : "";

  const paymentDateVal = trial?.paymentDate || trial?.trialExpiryDate || new Date();
  const paymentDate = formatDateOnly(paymentDateVal);

  const currency = trial?.paymentCurrency || trial?.currency || "INR";
  const rawAmount = trial?.paymentAmount != null ? trial.paymentAmount : trial?.price;
  const amountPaid = rawAmount != null ? `${currency} ${rawAmount}` : `${currency} 999`;

  const planStart = formatDateOnly(paymentDateVal);
  const planExpiry = calculatePlanExpiryDate(paymentDateVal, trial?.durationLabel);

  const selectedSlot = formatPaidSelectedSlot(trial);
  const subscriptionRef = trial?.stripeSubscriptionId || null;

  return (
    <div className="thankyou-wrapper">
      <ThankYouConfetti />

      {/* Main White AutoPay Success Card */}
      <div className="thankyou-main-card">
        {/* Green Gradient Header Section */}
        <div className="thankyou-header-banner" />

        {/* Circular Green Check Icon Overlapping Header */}
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
          <h1 className="thankyou-title">🎉 Congratulations, {firstName}!</h1>
          <p className="thankyou-status-subtitle">
            Your <span className="thankyou-status-highlight">{planName} Plan is now active.</span>
          </p>
          <p className="thankyou-welcome-msg">
            Your AutoPay payment was successful and your plan is now active.
          </p>

          {/* Green-Bordered Details Box */}
          <div className="thankyou-details-box">
            {planName && (
              <div className="thankyou-detail-row">
                <span className="thankyou-detail-label">Plan</span>
                <span className="thankyou-detail-value">{planName}</span>
              </div>
            )}
            {registrationId && (
              <div className="thankyou-detail-row">
                <span className="thankyou-detail-label">Registration ID</span>
                <span className="thankyou-detail-value">{registrationId}</span>
              </div>
            )}
            {paymentDate && (
              <div className="thankyou-detail-row">
                <span className="thankyou-detail-label">Payment Date</span>
                <span className="thankyou-detail-value">{paymentDate}</span>
              </div>
            )}
            {amountPaid && (
              <div className="thankyou-detail-row">
                <span className="thankyou-detail-label">Amount Paid</span>
                <span className="thankyou-detail-value">{amountPaid}</span>
              </div>
            )}
            {planStart && (
              <div className="thankyou-detail-row">
                <span className="thankyou-detail-label">Plan Start</span>
                <span className="thankyou-detail-value">{planStart}</span>
              </div>
            )}
            {planExpiry && (
              <div className="thankyou-detail-row">
                <span className="thankyou-detail-label">Plan Expiry</span>
                <span className="thankyou-detail-value">{planExpiry}</span>
              </div>
            )}
            {selectedSlot && (
              <div className="thankyou-detail-row">
                <span className="thankyou-detail-label">Selected Slot</span>
                <span className="thankyou-detail-value">{selectedSlot}</span>
              </div>
            )}
            {subscriptionRef && (
              <div className="thankyou-detail-row">
                <span className="thankyou-detail-label">Subscription Reference</span>
                <span className="thankyou-detail-value">{subscriptionRef}</span>
              </div>
            )}
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
    </div>
  );
}
