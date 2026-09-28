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

export const COUNTRY_ADDRESS_CONFIG = {
  India: {
    stateLabel: "State",
    statePlaceholder: "State",
    cityLabel: "City",
    cityPlaceholder: "City",
    postalLabel: "PIN Code",
    postalPlaceholder: "Enter PIN Code",
    postalHelp: "6-digit PIN Code (e.g. 600001)",
    validatePostal: (val) => /^[1-9]\d{5}$/.test((val || "").trim()),
  },
  "United States": {
    stateLabel: "State",
    statePlaceholder: "State",
    cityLabel: "City",
    cityPlaceholder: "City",
    postalLabel: "ZIP Code",
    postalPlaceholder: "Enter ZIP Code",
    postalHelp: "5-digit ZIP Code (e.g. 90210)",
    validatePostal: (val) => /^\d{5}(-\d{4})?$/.test((val || "").trim()),
  },
  "United Kingdom": {
    stateLabel: "State / Region",
    statePlaceholder: "State / Region",
    cityLabel: "City",
    cityPlaceholder: "City",
    postalLabel: "Postcode",
    postalPlaceholder: "Enter Postcode",
    postalHelp: "UK Postcode (e.g. SW1A 1AA)",
    validatePostal: (val) => /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test((val || "").trim()),
  },
  Canada: {
    stateLabel: "Province",
    statePlaceholder: "Province",
    cityLabel: "City",
    cityPlaceholder: "City",
    postalLabel: "Postal Code",
    postalPlaceholder: "Enter Postal Code",
    postalHelp: "Canadian Postal Code (e.g. M5V 3A8)",
    validatePostal: (val) => /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test((val || "").trim()),
  },
  Australia: {
    stateLabel: "State",
    statePlaceholder: "State",
    cityLabel: "City",
    cityPlaceholder: "City",
    postalLabel: "Postcode",
    postalPlaceholder: "Enter Postcode",
    postalHelp: "4-digit Postcode (e.g. 2000)",
    validatePostal: (val) => /^\d{4}$/.test((val || "").trim()),
  },
};

export function getCountryAddressConfig(countryName) {
  return COUNTRY_ADDRESS_CONFIG[countryName] || {
    stateLabel: "State",
    statePlaceholder: "State",
    cityLabel: "City",
    cityPlaceholder: "City",
    postalLabel: "Postal Code",
    postalPlaceholder: "Enter Postal Code",
    postalHelp: "Postal Code",
    validatePostal: (val) => (val || "").trim().length > 0,
  };
}
