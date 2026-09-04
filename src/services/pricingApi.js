// Talks to the Spring Boot backend for pricing plans (GET /api/plans/active).
// Response contract: ApiResponse<PlanResponse[]> — see
// com.jovens.yoga.dto.response.{ApiResponse,PlanResponse,PlanDurationResponse,PlanFeatureResponse}.

import { apiRequest } from "./apiClient.js";

const ACTIVE_PLANS_ENDPOINT = "/api/plans/active";

function pickPrimaryDuration(durations) {
  const activeDurations = (durations ?? []).filter((d) => d.active);
  return activeDurations[0] ?? durations?.[0] ?? null;
}

function billingPeriodLabel(duration) {
  if (!duration) return "";
  return duration.durationLabel ?? `Per ${duration.durationUnit?.toLowerCase() ?? ""}`;
}

function defaultButtonText() {
  return "Try Free For 5 Days";
}

// Every active plan is Standard or Premium now — both start with a 5-day free trial,
// so the CTA always routes through the duration picker with flow=trial.
function buttonUrlFor(raw) {
  return `/checkout/duration?planId=${raw.id}&flow=trial`;
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
    buttonText: defaultButtonText(),
    buttonUrl: buttonUrlFor(raw),
    badge: raw.badgeText ?? null,
    planType: raw.planType ?? null,
    featured: Boolean(raw.featured),
    active: raw.active ?? true,
    displayOrder: raw.displayOrder ?? 0,
  };
}

export async function fetchActivePlans() {
  const data = await apiRequest(ACTIVE_PLANS_ENDPOINT);
  const list = Array.isArray(data) ? data : [];

  return list
    .map(mapPlan)
    .filter((plan) => plan.active)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
