import { getGeoCountry } from "../services/geoApi.js";

// Country-level (never precise-location) defaults for the trial registration form's
// Country / Mobile Code fields, and the ISO code the pricing endpoint expects.
export const SUPPORTED_COUNTRIES = {
  India: { isoCode: "IN", phoneCode: "+91", currencyCode: "INR", symbol: "₹" },
  "United States": { isoCode: "US", phoneCode: "+1", currencyCode: "USD", symbol: "$" },
  "United Kingdom": { isoCode: "GB", phoneCode: "+44", currencyCode: "GBP", symbol: "£" },
  Canada: { isoCode: "CA", phoneCode: "+1", currencyCode: "CAD", symbol: "C$" },
  Australia: { isoCode: "AU", phoneCode: "+61", currencyCode: "AUD", symbol: "A$" },
};

const DEFAULT_COUNTRY = "India";

/**
 * Best-effort, country-level-only detection — delegates to our own backend
 * (GET /api/geo/country), which never requests browser GPS/precise location either. Always
 * resolves (never rejects) with one of the 5 supported country names, falling back to India
 * on any error, timeout, or unrecognized country. Callers are expected to invoke this at most
 * once per page load.
 */
export async function detectSupportedCountryName() {
  try {
    const data = await getGeoCountry();
    return (data?.countryName && SUPPORTED_COUNTRIES[data.countryName]) ? data.countryName : DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}
