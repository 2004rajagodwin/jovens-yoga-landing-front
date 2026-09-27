import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getOrder } from "../../services/orderApi.js";
import { getTrialByToken } from "../../services/trialApi.js";
import { clearCheckoutState } from "../../services/checkoutState.js";
import CheckoutLayout from "../../components/checkout/CheckoutLayout.jsx";

// Maximum 30 attempts at 1.5s intervals (~45 seconds) to accommodate Bank OTP / 3DS delays.
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 30;

/**
 * Landing here from Stripe's success_url indicates the customer completed Stripe's checkout.
 * For trial checkout:
 * - Detects type=trial and immediately calls GET /api/trials/access/{token}.
 * - Does NOT wait for PAID or invoice.payment_succeeded ($0 today).
 * - Navigates immediately to /thank-you?type=trial&token={token} once TRIAL_ACTIVE is confirmed.
 * - Passes the fetched trial in router state to avoid loading flicker on the Thank You page.
 * - Tolerates 3DS/Bank OTP latency by polling every 1.5s for up to 30 attempts (~45s).
 * - Handles transient network/404 states safely without aborting polling.
 *
 * For paid checkout:
 * - Polls until the order status is confirmed as PAID.
 */
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") === "trial" ? "trial" : "paid";
  const orderNumber = searchParams.get("order");
  const token = searchParams.get("token");
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();

  const isTrial = type === "trial";
  const [phase, setPhase] = useState("verifying"); // verifying | timeout | error
  const attemptsRef = useRef(0);
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      if (isTrial) {
        if (!token) {
          setPhase("error");
          return;
        }

        const trial = await getTrialByToken(token);

        if (import.meta.env.DEV) {
          // Dev-only diagnostic logging — NEVER log sensitive tokens, card details, OTPs, or secrets.
          console.log("[PaymentSuccess] Trial poll:", {
            httpStatus: 200,
            trialStatus: trial?.status,
            trialId: trial?.id,
            stripeSubscriptionId: trial?.stripeSubscriptionId,
            trialStart: trial?.trialStartDate,
            trialExpiry: trial?.trialExpiryDate,
            attempt: attemptsRef.current + 1,
            sessionId: sessionId || "none",
          });
        }

        // TRIAL_ACTIVE -> Immediately navigate to Free Trial Thank You
        if (trial.status === "TRIAL_ACTIVE") {
          clearCheckoutState();
          navigate(`/thank-you?type=trial&token=${encodeURIComponent(token)}`, {
            replace: true,
            state: { trial },
          });
          return;
        }

        // Converted trial (TRIAL_EXPIRED with recorded payment) -> Navigate to paid confirmation
        if (trial.status === "TRIAL_EXPIRED" && trial.paymentAmount != null) {
          clearCheckoutState();
          navigate(`/thank-you?type=trial&token=${encodeURIComponent(token)}`, {
            replace: true,
            state: { trial },
          });
          return;
        }

        // Cancelled or payment failed
        if (trial.status === "CANCELLED" || trial.status === "PAYMENT_FAILED") {
          navigate(`/payment/failed?type=trial&token=${encodeURIComponent(token)}`, { replace: true });
          return;
        }

        // Unpaid expired trial
        if (trial.status === "TRIAL_EXPIRED") {
          navigate(`/trial/details?token=${encodeURIComponent(token)}`, { replace: true });
          return;
        }

        // TRIAL_PENDING_PAYMENT -> Continue polling
      } else {
        if (!orderNumber) {
          setPhase("error");
          return;
        }

        const order = await getOrder(orderNumber);

        if (order.status === "PAID") {
          clearCheckoutState();
          navigate(`/thank-you?type=paid&order=${encodeURIComponent(orderNumber)}`, {
            replace: true,
            state: { order },
          });
          return;
        }

        if (order.status === "FAILED") {
          navigate(`/payment/failed?order=${encodeURIComponent(orderNumber)}`, { replace: true });
          return;
        }

        if (order.status === "CANCELLED") {
          navigate(`/payment/cancelled?order=${encodeURIComponent(orderNumber)}`, { replace: true });
          return;
        }
      }

      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setPhase("timeout");
        return;
      }

      if (isMountedRef.current) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[PaymentSuccess] Polling attempt error:", {
          httpStatus: err?.status || 500,
          errorMessage: err?.message,
          attempt: attemptsRef.current + 1,
        });
      }

      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        // Only mark permanent error on exhausted 404 lookup; otherwise show timeout so user can retry.
        setPhase(err?.status === 404 ? "error" : "timeout");
        return;
      }

      // Transient failure (network/temporary 404) -> keep polling until MAX_POLL_ATTEMPTS
      if (isMountedRef.current) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }
  }, [isTrial, token, orderNumber, sessionId, navigate]);

  useEffect(() => {
    isMountedRef.current = true;
    attemptsRef.current = 0;

    if (isTrial ? !token : !orderNumber) {
      setPhase("error");
      return;
    }

    setPhase("verifying");

    // Start poll immediately
    timerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        poll();
      }
    }, 50);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTrial, orderNumber, token, poll]);

  if (phase === "error") {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center" style={{ maxWidth: 480, margin: "0 auto" }}>
          <h2 className="mb-2" style={{ fontSize: 24, fontWeight: 600 }}>
            {isTrial ? "Unable to Verify Free Trial" : "Verification Error"}
          </h2>
          <p className="text-muted mb-4">
            {isTrial
              ? "We couldn't verify this trial link. Please contact support or start a new trial."
              : "We couldn't verify this payment reference. Please contact support."}
          </p>
          <Link to="/" className="btn btn-primary px-4 py-2">
            Back to Home
          </Link>
        </div>
      </CheckoutLayout>
    );
  }

  if (phase === "timeout") {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center" style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="mb-3" style={{ fontSize: 38 }} aria-hidden="true">
            {isTrial ? "🧘‍♀️" : "⏱️"}
          </div>
          <h2 className="mb-2" style={{ fontSize: 24, fontWeight: 600 }}>
            {isTrial ? "Setting Up Your Free Trial" : "Payment Still Confirming"}
          </h2>
          <p className="text-muted mb-4">
            {isTrial
              ? "Your free trial confirmation is taking a moment. Please click Check Again or refresh to check status."
              : "Your payment is still being confirmed. This can take a moment — please check back shortly."}
          </p>
          <div className="d-flex justify-content-center gap-3">
            <button
              type="button"
              className="btn btn-primary px-4 py-2"
              onClick={() => {
                attemptsRef.current = 0;
                setPhase("verifying");
                poll();
              }}
            >
              Check Again
            </button>
            <Link to="/" className="btn btn-outline-secondary px-4 py-2">
              Back to Home
            </Link>
          </div>
        </div>
      </CheckoutLayout>
    );
  }

  return (
    <CheckoutLayout>
      <div className="container py-5 text-center" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div
          className="spinner-border text-primary mb-3"
          role="status"
          style={{ width: "2.75rem", height: "2.75rem" }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <h2 className="mb-2" style={{ fontSize: 22, fontWeight: 600 }}>
          {isTrial ? "Activating Your Free Trial…" : "Confirming Your Payment…"}
        </h2>
        <p className="text-muted mb-0">
          {isTrial
            ? "We're setting up your class schedule and access. This will only take a moment."
            : "Please wait while we confirm your payment with Stripe."}
        </p>
      </div>
    </CheckoutLayout>
  );
}
