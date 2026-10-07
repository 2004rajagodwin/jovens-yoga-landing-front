import { apiRequest } from "./apiClient.js";

export function sendOtp({ firstName, email, countryPhoneCode, mobileNumber }) {
  return apiRequest("/api/auth/otp/send", {
    method: "POST",
    body: { firstName, email, countryPhoneCode, mobileNumber },
  });
}

export function resendOtp({ countryPhoneCode, mobileNumber }) {
  return apiRequest("/api/auth/otp/resend", {
    method: "POST",
    body: { countryPhoneCode, mobileNumber },
  });
}

export function verifyOtp({ countryPhoneCode, mobileNumber, code, email }) {
  return apiRequest("/api/auth/otp/verify", {
    method: "POST",
    body: { countryPhoneCode, mobileNumber, code, email },
  });
}
