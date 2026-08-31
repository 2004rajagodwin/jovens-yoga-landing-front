import { apiRequest } from "./apiClient.js";

export function getPlan(planId) {
  return apiRequest(`/api/plans/${planId}`);
}
