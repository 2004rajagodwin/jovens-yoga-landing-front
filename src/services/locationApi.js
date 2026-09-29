import { apiRequest } from "./apiClient.js";

/**
 * Resolves customer geographic coordinates and date-aware timezone from location details.
 *
 * @param {string} country
 * @param {string} state
 * @param {string} city
 * @param {string} postalCode
 * @param {string} [date] YYYY-MM-DD
 * @param {string} [time] HH:mm
 * @returns {Promise<{
 *   timezoneId: string,
 *   timezoneName: string,
 *   displayOffset: string,
 *   utcOffset: string,
 *   utcOffsetMinutes: number,
 *   latitude: number,
 *   longitude: number,
 *   city: string,
 *   state: string,
 *   country: string
 * }>}
 */
export function resolveLocationTimezone(country, state, city, postalCode, date, time) {
  const params = new URLSearchParams();
  if (country) params.append("country", country);
  if (state) params.append("state", state);
  if (city) params.append("city", city);
  if (postalCode) params.append("postalCode", postalCode);
  if (date) params.append("date", date);
  if (time) params.append("time", time);

  return apiRequest(`/api/location/timezone?${params.toString()}`);
}
