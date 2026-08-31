import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CustomerDetailsForm from "../../components/CustomerDetailsForm.jsx";
import { getCheckoutState, updateCheckoutState } from "../../services/checkoutState.js";

export default function UserDetailsPage() {
  const navigate = useNavigate();
  const state = getCheckoutState();
  const [errorMessage] = useState("");

  function handleSubmit(values) {
    updateCheckoutState({ customer: values });
    navigate("/checkout/review");
  }

  if (!state.planId || !state.durationId) {
    return (
      <div className="container py-5 text-center">
        <p>Please select a plan and duration first.</p>
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="mb-2" style={{ fontSize: 28 }}>
        Your Details
      </h1>
      <p className="text-muted mb-4">
        {state.planName} · {state.durationLabel} · {state.currency} {state.price}
      </p>

      <CustomerDetailsForm
        initialValues={state.customer}
        submitLabel="Continue to Review"
        onSubmit={handleSubmit}
        submitting={false}
        errorMessage={errorMessage}
      />
    </div>
  );
}
