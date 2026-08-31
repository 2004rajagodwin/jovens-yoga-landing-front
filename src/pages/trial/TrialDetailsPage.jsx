import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import CustomerDetailsForm from "../../components/CustomerDetailsForm.jsx";
import { checkTrialEligibility, createTrial } from "../../services/trialApi.js";
import { ApiError } from "../../services/apiClient.js";

export default function TrialDetailsPage() {
  const [searchParams] = useSearchParams();
  const planId = Number(searchParams.get("planId"));
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [blockedMessage, setBlockedMessage] = useState("");

  async function handleSubmit(values) {
    setSubmitting(true);
    setErrorMessage("");
    setBlockedMessage("");

    try {
      const eligibility = await checkTrialEligibility(values.email, values.mobileNumber);

      if (!eligibility.eligible) {
        setBlockedMessage(eligibility.message);
        setSubmitting(false);
        return;
      }

      const trial = await createTrial(planId, values);
      navigate(`/thank-you?type=trial&id=${trial.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "TRIAL_ALREADY_USED") {
        setBlockedMessage(err.message);
      } else {
        setErrorMessage(err.message || "Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  if (!planId) {
    return (
      <div className="container py-5 text-center">
        <p>Missing plan selection. Please start from the pricing section.</p>
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="mb-2" style={{ fontSize: 28 }}>
        Start Your Free Trial
      </h1>
      <p className="text-muted mb-4">Tell us a bit about yourself to activate your free trial.</p>

      {blockedMessage ? (
        <div className="alert alert-warning">
          <p className="mb-3">{blockedMessage}</p>
          <Link to="/" className="btn" style={{ background: "#ff6b1b", color: "#fff" }}>
            View Standard &amp; Premium Plans
          </Link>
        </div>
      ) : (
        <CustomerDetailsForm
          submitLabel="Activate Free Trial"
          onSubmit={handleSubmit}
          submitting={submitting}
          errorMessage={errorMessage}
        />
      )}
    </div>
  );
}
