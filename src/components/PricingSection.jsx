import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchActivePlans, getPricing } from "../services/pricingApi.js";
import { detectSupportedCountryName, SUPPORTED_COUNTRIES } from "../lib/countryDetection.js";

function StandardCard({ plan }) {
  return (
    <div className="col-lg-4 col-md-6">
      <div data-aos="fade-right" className="one-price-section-left">
        <div className="one-price-card-header">
          <span className="one-price-plan-name">{plan.name}</span>

          <div className="one-price-amount">
            <h3>
              {plan.currency}
              {plan.price}
            </h3>
            <span>{plan.billingPeriod}</span>
          </div>

          <div className="one-price-offer">{plan.offer}</div>
        </div>

        <div className="one-price-features">
          {plan.features.map((feature, i) => (
            <div className="one-price-feature" key={i}>
              <span className="one-price-check"> ✓ </span>
              <p>{feature}</p>
            </div>
          ))}
        </div>

        <div className="one-price-bottom">
          <Link to={plan.buttonUrl} className="one-price-standard-btn">
            {plan.buttonText}
          </Link>
        </div>
      </div>
    </div>
  );
}

function PremiumCard({ plan }) {
  return (
    <div className="col-lg-4 col-md-6">
      <div data-aos="fade-left" className="one-price-section-right">
        <div className="one-price-absol-shape-orange-div">
          <img className="one-price-absol-shape-orange-img" src="/images/price-card.png" alt="" />
        </div>

        <div className="absol-top-right-button-div">
          <Link className="absol-top-right-button" to={plan.buttonUrl}>
            {plan.badge || "Best choice"}
          </Link>
        </div>

        <div className="contend-absolute-main">
          <div className="one-price-card-header one-price-premium-header">
            <span className="one-price-plan-name-w">{plan.name}</span>

            <div className="one-price-amount">
              <h3>
                {plan.currency}
                {plan.price}
              </h3>
              <span>{plan.billingPeriod}</span>
            </div>

            <div className="one-price-offer premium-offer">{plan.offer}</div>
          </div>

          <div className="one-price-features">
            {plan.features.map((feature, i) => (
              <div className="one-price-feature" key={i}>
                <span className="one-price-check premium-check"> ✓ </span>
                <p>{feature}</p>
              </div>
            ))}
          </div>

          <div className="one-price-bottom premium-bottom">
            <Link to={plan.buttonUrl} className="one-price-premium-btn">
              {plan.buttonText}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingSection() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | success

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchActivePlans();
        if (cancelled) return;

        // Same backend country-detection + pricing resolution already used successfully on
        // the Trial Details page — no second detection/FX system, just the same two calls
        // from a different entry point, so the amount shown here always matches what the
        // Trial page later shows for the same plan/duration.
        const countryName = await detectSupportedCountryName();
        if (cancelled) return;
        const isoCode = SUPPORTED_COUNTRIES[countryName]?.isoCode;

        const withResolvedPricing = await Promise.all(
          data.map(async (plan) => {
            if (!plan.durationId) return plan;
            try {
              const pricing = await getPricing(plan.durationId, isoCode);
              return { ...plan, currency: pricing.symbol, price: pricing.amount };
            } catch {
              return plan; // keep the native price/currency if this one resolution fails
            }
          })
        );
        if (cancelled) return;

        setPlans(withResolvedPricing);
        setStatus("success");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="one-price-section">
      <div className="container">
        <div data-aos="fade-up" className="one-price-heading">
          <span>SIMPLE PRICING</span>
          <h2>
            OnePrice.
            <strong>Everything Included.</strong>
          </h2>
          <p>Choose the plan that fits your lifestyle and wellness goals.</p>
        </div>

        {status === "loading" && (
          <div className="one-price-state text-center py-4">
            <p>Loading pricing plans…</p>
          </div>
        )}

        {status === "error" && (
          <div className="one-price-state text-center py-4">
            <p>Pricing is currently unavailable. Please check back shortly.</p>
          </div>
        )}

        {status === "success" && plans.length === 0 && (
          <div className="one-price-state text-center py-4">
            <p>No plans available at the moment.</p>
          </div>
        )}

        {status === "success" && plans.length > 0 && (
          <div className="row justify-content-center g-5">
            {plans.map((plan) =>
              plan.featured ? (
                <PremiumCard key={plan.id} plan={plan} />
              ) : (
                <StandardCard key={plan.id} plan={plan} />
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
