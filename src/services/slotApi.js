import { apiRequest } from "./apiClient.js";

export function getActiveSlots(batchId, from, to, timezoneId) {
  const params = new URLSearchParams();
  if (batchId) params.append("batchId", batchId);
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (timezoneId) params.append("timezoneId", timezoneId);
  const query = params.toString();
  return apiRequest(`/api/slots/active${query ? `?${query}` : ""}`);
}

export function getActiveBatches() {
  return apiRequest("/api/batches/active");
}

export function getBookingWindow() {
  return apiRequest("/api/settings/booking-window");
}
