import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getOrder } from "../../services/orderApi.js";
import { getTrialByToken } from "../../services/trialApi.js";
import { clearCheckoutState } from "../../services/checkoutState.js";

const FAST_POLL_ATTEMPTS = 10; // ~20s of active "Confirming…" polling before reassuring the user
const FAST_POLL_INTERVAL_MS = 2000;
// Stripe webhook delivery is normally near-instant but can legitimately take longer
// (retries, network latency). Once the fast window elapses, keep checking quietly in
// the background at a slower cadence instead of dead-ending on a false negative.
const SLOW_POLL_INTERVAL_MS = 5000;
const MAX_TOTAL_ATTEMPTS = 40; // ~20s fast + ~150s slow ≈ 3 minutes before truly giving up

/**
 * Landing here from Stripe's success_url is NOT proof of payment — it only means the
 * customer completed Stripe's UI. This page polls the backend (the Stripe webhook is
 * the actual source of truth) until the order's/trial's real status is known.
 *
 * The trial case is identified by a short-lived access token (never the trial's raw id —
 * that was a real IDOR, since a sequential id would let anyone enumerate other customers'
 * trial details).
 */
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") === "trial" ? "trial" : "paid";
  const orderNumber = searchParams.get("order");
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [phase, setPhase] = useState("verifying"); // verifying | timeout | error
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (type === "trial" ? !token : !orderNumber) {
      setPhase("error");
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        if (type === "trial") {
          const trial = await getTrialByToken(token);
          if (cancelled) return;

          if (trial.status === "TRIAL_ACTIVE") {
            navigate(`/thank-you?type=trial&token=${encodeURIComponent(token)}`, { replace: true });
            return;
          }
          if (trial.status === "CANCELLED" || trial.status === "PAYMENT_FAILED") {
            navigate(`/payment/failed?type=trial`, { replace: true });
            return;
          }
        } else {
          const order = await getOrder(orderNumber);
          if (cancelled) return;

          if (order.status === "PAID") {
            clearCheckoutState();
            navigate(`/thank-you?type=paid&order=${orderNumber}`, { replace: true });
            return;
          }
          if (order.status === "FAILED") {
            navigate(`/payment/failed?order=${orderNumber}`, { replace: true });
            return;
          }
          if (order.status === "CANCELLED") {
            navigate(`/payment/cancelled?order=${orderNumber}`, { replace: true });
            return;
          }
        }

        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_TOTAL_ATTEMPTS) {
          setPhase("timeout");
          return;
        }
        if (attemptsRef.current >= FAST_POLL_ATTEMPTS) {
          setPhase("timeout"); // reassure the user, but keep polling quietly below
          setTimeout(poll, SLOW_POLL_INTERVAL_MS);
          return;
        }
        setTimeout(poll, FAST_POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setPhase("error");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, orderNumber, token]);

  if (phase === "error") {
    return (
      <div className="container py-5 text-center">
        <p>We couldn't verify this payment. Please contact support with your reference.</p>
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="container py-5 text-center">
        <p>Your payment is still being confirmed. This can take a moment — please check back shortly.</p>
        <button type="button" className="btn btn-outline-secondary" onClick={() => window.location.reload()}>
          Check again
        </button>
      </div>
    );
  }

  return (
    <div className="container py-5 text-center">
      <p>Confirming your payment…</p>
    </div>
  );
}
