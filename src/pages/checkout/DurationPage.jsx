import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { getPlan } from "../../services/planApi.js";
import { getPricing } from "../../services/pricingApi.js";
import { detectSupportedCountryName, SUPPORTED_COUNTRIES } from "../../lib/countryDetection.js";
import { getCheckoutState, updateCheckoutState } from "../../services/checkoutState.js";
import CheckoutLayout from "../../components/checkout/CheckoutLayout.jsx";

export default function DurationPage() {
  const [searchParams] = useSearchParams();
  const planId = Number(searchParams.get("planId"));
  const flow = searchParams.get("flow") === "trial" ? "trial" : "paid";
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [status, setStatus] = useState("loading");
  const [durationPricing, setDurationPricing] = useState({});

  useEffect(() => {
    if (!planId) {
      setStatus("error");
      return;
    }
    getPlan(planId)
      .then(async (data) => {
        setPlan(data);
        setStatus("success");

        try {
          const checkoutState = getCheckoutState();
          let countryName = checkoutState.customer?.countryRegion;
          if (!countryName || !SUPPORTED_COUNTRIES[countryName]) {
            countryName = await detectSupportedCountryName();
          }
          const countryInfo = SUPPORTED_COUNTRIES[countryName] || SUPPORTED_COUNTRIES["India"];
          const isoCode = countryInfo.isoCode;

          const pricingResults = {};
          const activeDurations = (data.durations || []).filter((d) => d.active);
          await Promise.all(
            activeDurations.map(async (d) => {
              try {
                const res = await getPricing(d.id, isoCode);
                if (res) {
                  pricingResults[d.id] = res;
                }
              } catch {
                // Ignore individual failure, fall back to duration price
              }
            })
          );
          setDurationPricing(pricingResults);
        } catch {
          // Ignore geo/pricing error, fall back to duration prices
        }
      })
      .catch(() => setStatus("error"));
  }, [planId]);

  function selectDuration(duration) {
    if (flow === "trial") {
      navigate(`/trial/details?planId=${plan.id}&durationId=${duration.id}`);
      return;
    }
    const pricing = durationPricing[duration.id];
    updateCheckoutState({
      planId: plan.id,
      planName: plan.name,
      durationId: duration.id,
      durationLabel: duration.durationLabel,
      price: pricing?.amount != null ? pricing.amount : duration.price,
      currency: pricing?.currency || duration.currency,
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
          {flow === "trial" && ` Your ${plan.trialDurationDays || 7}-day free trial will start on your chosen class date; this is the plan you'll be billed after it ends.`}
        </p>

        <div className="d-flex flex-column gap-3">
          {activeDurations.map((duration) => {
            const pricing = durationPricing[duration.id];
            const displayCurrency = pricing?.symbol || pricing?.currency || duration.currency;
            const displayAmount = pricing?.amount != null ? pricing.amount : duration.price;

            return (
              <button
                key={duration.id}
                type="button"
                className="duration-option-card"
                onClick={() => selectDuration(duration)}
              >
                <span>{duration.durationLabel}</span>
                <strong>
                  {displayCurrency} {displayAmount}
                </strong>
              </button>
            );
          })}
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
