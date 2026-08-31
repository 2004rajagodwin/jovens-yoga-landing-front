// Talks to the Spring Boot backend for pricing plans (GET /api/plans/active).
// Response contract: ApiResponse<PlanResponse[]> — see
// com.jovens.yoga.dto.response.{ApiResponse,PlanResponse,PlanDurationResponse,PlanFeatureResponse}.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const ACTIVE_PLANS_ENDPOINT = "/api/plans/active";

function pickPrimaryDuration(durations) {
  const activeDurations = (durations ?? []).filter((d) => d.active);
  return activeDurations[0] ?? durations?.[0] ?? null;
}

function billingPeriodLabel(duration) {
  if (!duration) return "";
  return duration.durationLabel ?? `Per ${duration.durationUnit?.toLowerCase() ?? ""}`;
}

function defaultButtonText(planType) {
  return planType === "FREE_TRIAL" ? "Try Free For 5 Days" : "Choose Plan";
}

function buttonUrlFor(raw) {
  return raw.planType === "FREE_TRIAL"
    ? `/trial/details?planId=${raw.id}`
    : `/checkout/duration?planId=${raw.id}`;
}

function mapPlan(raw) {
  const primaryDuration = pickPrimaryDuration(raw.durations);

  return {
    id: raw.id,
    name: raw.name,
    price: primaryDuration ? primaryDuration.price : 0,
    currency: raw.currency ?? primaryDuration?.currency ?? "$",
    billingPeriod: billingPeriodLabel(primaryDuration),
    offer: raw.description ?? "",
    features: Array.isArray(raw.features)
      ? raw.features.filter((f) => f.active).map((f) => f.featureText)
      : [],
    buttonText: defaultButtonText(raw.planType),
    buttonUrl: buttonUrlFor(raw),
    badge: raw.badgeText ?? null,
    planType: raw.planType ?? null,
    featured: Boolean(raw.featured),
    active: raw.active ?? true,
    displayOrder: raw.displayOrder ?? 0,
  };
}

export async function fetchActivePlans() {
  const response = await fetch(`${API_BASE_URL}${ACTIVE_PLANS_ENDPOINT}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load pricing plans (status ${response.status})`);
  }

  const body = await response.json();

  if (body.success === false) {
    throw new Error(body.message || "Failed to load pricing plans");
  }

  const list = Array.isArray(body.data) ? body.data : [];

  return list
    .map(mapPlan)
    .filter((plan) => plan.active)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
