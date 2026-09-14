import { apiRequest } from "./apiClient.js";

export function createCheckoutSession(orderNumber) {
  return apiRequest("/api/payments/checkout", {
    method: "POST",
    body: { orderNumber },
  });
}

// Resolved by the trial's short-lived access token — never its raw database id, which must
// never be an authorization credential in this API.
export function createTrialCheckoutSession(accessToken) {
  return apiRequest(`/api/payments/trials/access/${encodeURIComponent(accessToken)}/checkout`, {
    method: "POST",
  });
}

// Cancels future AutoPay billing on the trial's Stripe subscription (cancel-at-period-end).
// The current free trial access is never affected — resolved by access token only, never a
// raw trial id.
export function cancelTrialAutoPay(accessToken) {
  return apiRequest(`/api/payments/trials/access/${encodeURIComponent(accessToken)}/cancel-autopay`, {
    method: "POST",
  });
}
