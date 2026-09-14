import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getPlan } from "../../services/planApi.js";
import { updateCheckoutState } from "../../services/checkoutState.js";
import CheckoutLayout from "../../components/checkout/CheckoutLayout.jsx";

export default function DurationPage() {
  const [searchParams] = useSearchParams();
  const planId = Number(searchParams.get("planId"));
  const flow = searchParams.get("flow") === "trial" ? "trial" : "paid";
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!planId) {
      setStatus("error");
      return;
    }
    getPlan(planId)
      .then((data) => {
        setPlan(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [planId]);

  function selectDuration(duration) {
    if (flow === "trial") {
      navigate(`/trial/details?planId=${plan.id}&durationId=${duration.id}`);
      return;
    }
    updateCheckoutState({
      planId: plan.id,
      planName: plan.name,
      durationId: duration.id,
      durationLabel: duration.durationLabel,
      price: duration.price,
      currency: duration.currency,
    });
    navigate("/checkout/user-details");
  }

  if (status === "loading") {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center">Loading plan options…</div>
      </CheckoutLayout>
    );
  }

  if (status === "error" || !plan) {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center">
          <p>We couldn't load this plan. Please go back and try again.</p>
          <Link to="/">Back to Home</Link>
        </div>
      </CheckoutLayout>
    );
  }

  const activeDurations = (plan.durations || []).filter((d) => d.active);

  return (
    <CheckoutLayout>
      <div style={{ marginTop: 30 }}>
      <div className="container py-5 mt-5" style={{ maxWidth: 640 }}>
        <h1 className="mb-2 tamionere" style={{ fontSize: 28, fontWeight: 700 }}>
          Choose a Duration for {plan.name}
        </h1>
        <p className="text-muted mb-4">
          {plan.description}
          {flow === "trial" && " Your 5-day free trial will start today; this is the plan you'll be billed after it ends."}
        </p>

        <div className="d-flex flex-column gap-3">
          {activeDurations.map((duration) => (
            <button
              key={duration.id}
              type="button"
              className="duration-option-card"
              onClick={() => selectDuration(duration)}
            >
              <span>{duration.durationLabel}</span>
              <strong>
                {duration.currency} {duration.price}
              </strong>
            </button>
          ))}
          {activeDurations.length === 0 && <p>No duration options are currently available for this plan.</p>}
        </div>

        <button type="button" className="checkout-back-link" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i> Back
        </button>
      </div>
      </div>
    </CheckoutLayout>
  );
}
