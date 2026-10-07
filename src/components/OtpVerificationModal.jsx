import { useEffect, useRef, useState } from "react";
import { sendOtp, resendOtp, verifyOtp } from "../services/otpApi.js";
import { ApiError } from "../services/apiClient.js";

const CODE_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpVerificationModal({ firstName, email, countryPhoneCode, mobileNumber, onVerified, onCancel }) {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [sending, setSending] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);
  // Guards against React StrictMode's intentional mount→cleanup→mount replay in development
  // (and any other double-fire of this effect). Without this, two concurrent
  // POST /api/auth/otp/send requests race to write otps.otp_hash for the same phone number —
  // the code actually persisted in the database and the code the (harmless-looking) response
  // guard below chooses to display are decided independently, so the displayed code can
  // silently mismatch what the backend will accept. A ref (not state) is required here: it
  // must survive the synchronous cleanup/remount pass StrictMode performs, which happens
  // before any state update from this effect could take effect.
  const otpSendStartedRef = useRef(false);

  useEffect(() => {
    // StrictMode's synchronous mount→cleanup→mount replay would otherwise run this whole
    // block twice back-to-back on first mount. The ref check below stops a second real send
    // outright; deliberately no "cancelled"-on-cleanup guard around the request itself — that
    // pattern ties the fetch's resolution to the specific effect invocation that started it,
    // and StrictMode's synthetic cleanup fires for invocation 1 before its fetch ever
    // resolves, which would permanently discard the one real response and leave the modal
    // stuck on "Sending OTP…". The ref already guarantees only one send is ever in flight, so
    // its result is safe to apply whenever it arrives.
    if (otpSendStartedRef.current) return;
    otpSendStartedRef.current = true;

    setSending(true);
    setErrorMessage("");
    sendOtp({ firstName, email, countryPhoneCode, mobileNumber })
      .then((response) => {
        setDevOtp(response?.devOtp || null);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      })
      .catch((err) => {
        setErrorMessage(err.message || "Could not send OTP. Please try again.");
      })
      .finally(() => {
        setSending(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function handleDigitChange(index, rawValue) {
    const value = rawValue.replace(/[^0-9]/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < CODE_LENGTH; i++) {
        next[i] = pasted[i] || next[i];
      }
      return next;
    });
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      setErrorMessage("Please enter the complete 4-digit code.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      const result = await verifyOtp({ countryPhoneCode, mobileNumber, code, email });
      onVerified(result.verificationToken);
    } catch (err) {
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      setErrorMessage(err instanceof ApiError ? err.message : "Could not verify OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage("");
    try {
      const response = await resendOtp({ countryPhoneCode, mobileNumber });
      setDevOtp(response?.devOtp || null);
      setDigits(Array(CODE_LENGTH).fill(""));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setErrorMessage(err.message || "Could not resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "32px 28px",
          maxWidth: 380,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Enter OTP</h2>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 24px" }}>
          OTP Verification Sent to Your WhatsApp
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 20 }}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={sending || submitting}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                style={{
                  width: 48,
                  height: 56,
                  fontSize: 22,
                  textAlign: "center",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                }}
              />
            ))}
          </div>

          {sending && <p className="text-muted" style={{ fontSize: 13 }}>Sending OTP…</p>}
          {devOtp && (
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
              (Dev/Test mode) OTP: <strong>{devOtp}</strong>
            </p>
          )}
          {errorMessage && (
            <div className="alert alert-danger" role="alert" style={{ fontSize: 13, padding: "8px 12px" }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, background: "#f3f4f6", color: "#111827" }}
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{ flex: 1, background: "#ff6b1b", color: "#fff" }}
              disabled={sending || submitting}
            >
              {submitting ? "Verifying…" : "Submit"}
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending || sending}
          style={{
            marginTop: 18,
            background: "none",
            border: "none",
            color: cooldown > 0 ? "#9ca3af" : "#ff6b1b",
            fontSize: 13,
            cursor: cooldown > 0 ? "default" : "pointer",
          }}
        >
          {resending ? "Resending…" : cooldown > 0 ? `Resend OTP (${cooldown}s)` : "Resend OTP"}
        </button>
      </div>
    </div>
  );
}
