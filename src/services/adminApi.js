import { apiRequest } from "./apiClient.js";
import { getAdminToken } from "./adminAuth.js";

function authedRequest(path, options = {}) {
  return apiRequest(path, { ...options, token: getAdminToken() });
}

export function adminLogin(username, password) {
  return apiRequest("/api/auth/admin/login", { method: "POST", body: { username, password } });
}

export function getDashboard() {
  return authedRequest("/api/admin/dashboard");
}

function toQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// --- Users ---
export function listUsers({ search, page = 0, size = 20 } = {}) {
  return authedRequest(`/api/admin/users${toQuery({ search, page, size })}`);
}
export function getUser(id) {
  return authedRequest(`/api/admin/users/${id}`);
}

// --- Plans ---
export function listPlansAdmin() {
  return authedRequest("/api/admin/plans");
}
export function getPlanAdmin(id) {
  return authedRequest(`/api/admin/plans/${id}`);
}
export function createPlan(payload) {
  return authedRequest("/api/admin/plans", { method: "POST", body: payload });
}
export function updatePlan(id, payload) {
  return authedRequest(`/api/admin/plans/${id}`, { method: "PUT", body: payload });
}
export function setPlanActive(id, active) {
  return authedRequest(`/api/admin/plans/${id}/active`, { method: "PATCH", body: { active } });
}
export function deletePlan(id) {
  return authedRequest(`/api/admin/plans/${id}`, { method: "DELETE" });
}
export function reorderPlans(orderedIds) {
  return authedRequest("/api/admin/plans/reorder", { method: "POST", body: { orderedIds } });
}

// --- Orders ---
export function listOrders({ status, search, page = 0, size = 20 } = {}) {
  return authedRequest(`/api/admin/orders${toQuery({ status, search, page, size })}`);
}
export function getOrder(orderNumber) {
  return authedRequest(`/api/admin/orders/${orderNumber}`);
}

// --- Payments ---
export function listPayments({ status, page = 0, size = 20 } = {}) {
  return authedRequest(`/api/admin/payments${toQuery({ status, page, size })}`);
}
export function getPayment(id) {
  return authedRequest(`/api/admin/payments/${id}`);
}

// --- Trials ---
export function listTrials({ filter, status, search, page = 0, size = 20 } = {}) {
  return authedRequest(`/api/admin/trials${toQuery({ filter, status, search, page, size })}`);
}
export function getTrialAdmin(id) {
  return authedRequest(`/api/admin/trials/${id}`);
}

// --- Slots ---
export function listSlotsAdmin() {
  return authedRequest("/api/admin/slots");
}
export function getSlotAdmin(id) {
  return authedRequest(`/api/admin/slots/${id}`);
}
export function createSlot(payload) {
  return authedRequest("/api/admin/slots", { method: "POST", body: payload });
}
export function updateSlot(id, payload) {
  return authedRequest(`/api/admin/slots/${id}`, { method: "PUT", body: payload });
}
export function setSlotActive(id, active) {
  return authedRequest(`/api/admin/slots/${id}/active`, { method: "PATCH", body: { active } });
}
export function deleteSlot(id) {
  return authedRequest(`/api/admin/slots/${id}`, { method: "DELETE" });
}

// --- Notifications ---
export function listNotifications({ status, channel, page = 0, size = 20 } = {}) {
  return authedRequest(`/api/admin/notifications${toQuery({ status, channel, page, size })}`);
}
export function retryNotification(id) {
  return authedRequest(`/api/admin/notifications/${id}/retry`, { method: "POST" });
}
