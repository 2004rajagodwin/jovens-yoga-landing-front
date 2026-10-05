import { apiRequest } from "./apiClient.js";

/**
 * Validates a referral code against the public endpoint.
 * Returns { valid: boolean, referralCode: string, referralPersonName: string }
 */
export async function validateReferralCode(code) {
  if (!code || !code.trim()) {
    return { valid: false };
  }
  try {
    const res = await apiRequest(`/api/referrals/validate/${encodeURIComponent(code.trim())}`);
    return res || { valid: false };
  } catch (err) {
    // If validation fails or server is unreachable, fail gracefully so normal booking continues
    return { valid: false };
  }
}
