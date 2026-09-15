import { apiRequest } from "./apiClient.js";

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", GBP: "£", INR: "₹", CAD: "C$", AUD: "A$" };

// Reconstructed — the original fetchActivePlans() was accidentally overwritten and could not
// be recovered (no VCS, no editor history). Transforms the raw /api/plans/active response
// into the flat shape PricingSection.jsx (Home page) renders: headline price/currency come
// from each plan's first active duration (by displayOrder), features are flattened to plain
// strings, and the trial-flow link/copy matches the product's actual entry point. Please
// double-check this against the live Home page and correct anything that doesn't match.
export async function fetchActivePlans() {
  const plans = await apiRequest("/api/plans/active");
  return (plans || []).map((plan) => {
    const activeDurations = (plan.durations || [])
      .filter((d) => d.active)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const headlineDuration = activeDurations[0] || null;

    const activeFeatures = (plan.features || [])
      .filter((f) => f.active)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((f) => f.featureText);

    return {
      id: plan.id,
      name: plan.name,
      currency: CURRENCY_SYMBOLS[headlineDuration?.currency] || headlineDuration?.currency || plan.currency,
      price: headlineDuration?.price,
      billingPeriod: headlineDuration?.durationLabel || "",
      offer: plan.trialDurationDays ? `${plan.trialDurationDays}-Day Free Trial` : "",
      features: activeFeatures,
      buttonUrl: headlineDuration ? `/trial/details?planId=${plan.id}&durationId=${headlineDuration.id}` : "/",
      buttonText: "Start Free Trial",
      featured: plan.featured,
      badge: plan.badgeText,
    };
  });
}

// Display-only price preview for the registration page's plan summary — the backend
// resolves country/currency/amount itself; this is never sent back as checkout input. The
// actual checkout endpoint independently re-resolves the same values from the trial's own
// submitted customer details.
export function getPricing(planDurationId, countryIsoCode) {
  const query = new URLSearchParams({ planDurationId: String(planDurationId) });
  if (countryIsoCode) query.set("country", countryIsoCode);
  return apiRequest(`/api/pricing?${query.toString()}`);
}
