import { apiRequest } from "./apiClient.js";

export function checkTrialEligibility(email, mobileNumber) {
  return apiRequest("/api/trials/eligibility", {
    method: "POST",
    body: { email, mobileNumber },
  });
}

export function createTrial(planId, planDurationId, slotId, customer, otpToken) {
  return apiRequest("/api/trials", {
    method: "POST",
    body: { planId, planDurationId, slotId, customer, otpToken },
  });
}

// A trial's raw numeric id is never used as a lookup key from the browser — that was a real
// IDOR (sequential ids let anyone enumerate other customers' trial details). Every
// unauthenticated read/cancel goes through a short-lived, cryptographically random access
// token instead, issued by checkTrialEligibility() or embedded in the Stripe redirect URL.
export function getTrialByToken(token) {
  return apiRequest(`/api/trials/access/${encodeURIComponent(token)}`);
}

export function cancelTrialByToken(token) {
  return apiRequest(`/api/trials/access/${encodeURIComponent(token)}/cancel`, { method: "POST" });
}
