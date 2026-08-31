import { useState } from "react";
import { Link } from "react-router-dom";
import { getCheckoutState, updateCheckoutState } from "../../services/checkoutState.js";
import { createOrder } from "../../services/orderApi.js";
import { createCheckoutSession } from "../../services/paymentApi.js";

export default function ReviewPage() {
  const state = getCheckoutState();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleConfirm() {
    setSubmitting(true);
    setErrorMessage("");

    try {
      // The order amount is authoritative server-side (looked up from the plan/duration
      // in the database) — the price shown here is for display only.
      const order = await createOrder(state.planId, state.durationId, state.customer);
      updateCheckoutState({ orderNumber: order.orderNumber });

      const checkout = await createCheckoutSession(order.orderNumber);
      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      setErrorMessage(err.message || "Could not start checkout. Please try again.");
      setSubmitting(false);
    }
  }

  if (!state.planId || !state.durationId || !state.customer) {
    return (
      <div className="container py-5 text-center">
        <p>Please complete the previous steps first.</p>
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="mb-4" style={{ fontSize: 28 }}>
        Review Your Order
      </h1>

      <div className="mb-4" style={{ border: "1px solid #eee", borderRadius: 10, padding: 24 }}>
        <p>
          <strong>Name:</strong> {state.customer.firstName} {state.customer.lastName}
        </p>
        <p>
          <strong>Email:</strong> {state.customer.email}
        </p>
        <p>
          <strong>Mobile:</strong> {state.customer.countryPhoneCode} {state.customer.mobileNumber}
        </p>
        <hr />
        <p>
          <strong>Plan:</strong> {state.planName}
        </p>
        <p>
          <strong>Duration:</strong> {state.durationLabel}
        </p>
        <p>
          <strong>Amount:</strong> {state.currency} {state.price}
        </p>
      </div>

      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        className="btn"
        style={{ background: "#ff6b1b", color: "#fff" }}
        onClick={handleConfirm}
        disabled={submitting}
      >
        {submitting ? "Redirecting to Stripe…" : "Proceed to Payment"}
      </button>
    </div>
  );
}
