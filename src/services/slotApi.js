import { apiRequest } from "./apiClient.js";

export function getActiveSlots(batchId, from, to) {
  const params = new URLSearchParams();
  if (batchId) params.append("batchId", batchId);
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  const query = params.toString();
  return apiRequest(`/api/slots/active${query ? `?${query}` : ""}`);
}

export function getActiveBatches() {
  return apiRequest("/api/batches/active");
}

export function getBookingWindow() {
  return apiRequest("/api/settings/booking-window");
}
