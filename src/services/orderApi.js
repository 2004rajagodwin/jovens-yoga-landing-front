import { apiRequest } from "./apiClient.js";

export function createOrder(planId, durationId, customer) {
  return apiRequest("/api/orders", {
    method: "POST",
    body: { planId, durationId, customer },
  });
}

export function getOrder(orderNumber) {
  return apiRequest(`/api/orders/${orderNumber}`);
}

export function cancelOrder(orderNumber) {
  return apiRequest(`/api/orders/${orderNumber}/cancel`, { method: "POST" });
}
