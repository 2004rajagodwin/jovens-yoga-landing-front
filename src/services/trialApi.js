import { apiRequest } from "./apiClient.js";

export function checkTrialEligibility(email, mobileNumber) {
  return apiRequest("/api/trials/eligibility", {
    method: "POST",
    body: { email, mobileNumber },
  });
}

export function createTrial(planId, customer) {
  return apiRequest("/api/trials", {
    method: "POST",
    body: { planId, customer },
  });
}

export function getTrial(trialId) {
  return apiRequest(`/api/trials/${trialId}`);
}
