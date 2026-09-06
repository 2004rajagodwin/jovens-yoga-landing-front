import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CustomerDetailsForm from "../../components/CustomerDetailsForm.jsx";
import OtpVerificationModal from "../../components/OtpVerificationModal.jsx";
import { getCheckoutState, updateCheckoutState } from "../../services/checkoutState.js";
import CheckoutLayout from "../../components/checkout/CheckoutLayout.jsx";

export default function UserDetailsPage() {
  const navigate = useNavigate();
  const state = getCheckoutState();
  const [errorMessage] = useState("");
  const [pendingCustomer, setPendingCustomer] = useState(null);

  function handleSubmit(values) {
    // OTP verification gates every "Continue" from User Details, for every user —
    // the form is held here, unsubmitted, until the modal reports success.
    setPendingCustomer(values);
  }

  function handleOtpVerified(verificationToken) {
    updateCheckoutState({ customer: pendingCustomer, otpToken: verificationToken });
    setPendingCustomer(null);
    navigate("/checkout/review");
  }

  if (!state.planId || !state.durationId) {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center">
          <p>Please select a plan and duration first.</p>
          <Link to="/">Back to Home</Link>
        </div>
      </CheckoutLayout>
    );
  }

  return (
    <CheckoutLayout>
      <div className="container py-5" style={{ maxWidth: 640 }}>
        <h1 className="mb-2" style={{ fontSize: 28 }}>Your Details</h1>
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

        {pendingCustomer && (
          <OtpVerificationModal
            firstName={pendingCustomer.firstName}
            email={pendingCustomer.email}
            countryPhoneCode={pendingCustomer.countryPhoneCode}
            mobileNumber={pendingCustomer.mobileNumber}
            onVerified={handleOtpVerified}
            onCancel={() => setPendingCustomer(null)}
          />
        )}
      </div>
    </CheckoutLayout>
  );
}
