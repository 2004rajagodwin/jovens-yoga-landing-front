import { apiRequest } from "./apiClient.js";

export function createCheckoutSession(orderNumber) {
  return apiRequest("/api/payments/checkout", {
    method: "POST",
    body: { orderNumber },
  });
}
