// Shared fetch wrapper. All API modules go through this so error handling and the
// backend's ApiResponse envelope are only unwrapped in one place.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // no JSON body (e.g. empty response)
  }

  if (!response.ok || (payload && payload.success === false)) {
    const message = payload?.message || `Request failed (status ${response.status})`;
    const code = payload?.code || "REQUEST_FAILED";
    throw new ApiError(message, code, response.status);
  }

  return payload?.data;
}
