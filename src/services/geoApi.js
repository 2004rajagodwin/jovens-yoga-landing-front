import { apiRequest } from "./apiClient.js";

// Country-level-only detection, resolved server-side — the frontend never calls a third-party
// geolocation provider directly, and never requests browser GPS/precise location.
export function getGeoCountry() {
  return apiRequest("/api/geo/country");
}
