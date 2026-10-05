// Safe storage for referral attribution across page refresh and route navigation.
// Persists in sessionStorage (and falls back to localStorage) so attribution survives
// route changes, multi-step checkout, and refreshes.

const STORAGE_KEY = "jovens_referral_code";
const INFO_KEY = "jovens_referral_info";

export function getStoredReferralCode() {
  try {
    const sessionVal = sessionStorage.getItem(STORAGE_KEY);
    if (sessionVal) return sessionVal;
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredReferralCode(code, personName = null) {
  if (!code) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, code.trim());
    localStorage.setItem(STORAGE_KEY, code.trim());
    if (personName) {
      const info = JSON.stringify({ code: code.trim(), personName });
      sessionStorage.setItem(INFO_KEY, info);
      localStorage.setItem(INFO_KEY, info);
    }
  } catch {
    // ignore quota/private browsing issues
  }
}

export function getStoredReferralInfo() {
  try {
    const raw = sessionStorage.getItem(INFO_KEY) || localStorage.getItem(INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(INFO_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(INFO_KEY);
  } catch {
    // ignore
  }
}
