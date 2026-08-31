import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getOrder } from "../../services/orderApi.js";
import { clearCheckoutState } from "../../services/checkoutState.js";

const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2000;

/**
 * Landing here from Stripe's success_url is NOT proof of payment — it only means the
 * customer completed Stripe's UI. This page polls the backend (the Stripe webhook is
 * the actual source of truth) until the order's real status is known.
 */
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order");
  const navigate = useNavigate();

  const [phase, setPhase] = useState("verifying"); // verifying | timeout | error
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!orderNumber) {
      setPhase("error");
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
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

        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setPhase("timeout");
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setPhase("error");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  if (phase === "error") {
    return (
      <div className="container py-5 text-center">
        <p>We couldn't verify this payment. Please contact support with your order reference.</p>
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
