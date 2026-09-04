import { apiRequest } from "./apiClient.js";

export function getActiveSlots() {
  return apiRequest("/api/slots/active");
}
