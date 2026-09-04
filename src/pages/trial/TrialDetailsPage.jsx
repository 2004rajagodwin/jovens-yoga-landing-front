import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import OtpVerificationModal from "../../components/OtpVerificationModal.jsx";
import { checkTrialEligibility, createTrial, getTrialByToken } from "../../services/trialApi.js";
import { createTrialCheckoutSession } from "../../services/paymentApi.js";
import { getActiveSlots } from "../../services/slotApi.js";
import { getPlan } from "../../services/planApi.js";
import { ApiError } from "../../services/apiClient.js";
import { updateCheckoutState } from "../../services/checkoutState.js";
import { COUNTRIES } from "../../lib/countries.js";

const PHONE_CODES = [...new Set(COUNTRIES.map((c) => c.phoneCode))];
const EMPTY_CUSTOMER = {
  firstName: "",
  lastName: "",
  email: "",
  countryRegion: "India",
  countryPhoneCode: "+91",
  mobileNumber: "",
  address: "",
};

// Display-only formatting — the underlying currency/duration values always come straight
// from the backend's PlanDuration record, never altered or invented here.
const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", GBP: "£", INR: "₹" };
function formatPrice(currency, price) {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${price}`;
}
function formatCadence(durationLabel) {
  return (durationLabel || "").replace(/^Per\s+/i, "").toLowerCase();
}

function formatSlot(slot) {
  const date = slot.slotDate ? new Date(slot.slotDate).toLocaleDateString() : "";
  const time = slot.slotStartTime ?? slot.startTime ?? "";
  const label = slot.label ? `${slot.label} — ` : "";
  return `${label}${date} ${time}`.trim();
}

export default function TrialDetailsPage() {
  const [searchParams] = useSearchParams();
  const planId = Number(searchParams.get("planId"));
  const durationId = Number(searchParams.get("durationId"));
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [planStatus, setPlanStatus] = useState("loading");

  const [slots, setSlots] = useState([]);
  const [slotsStatus, setSlotsStatus] = useState("loading");
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [blockedMessage, setBlockedMessage] = useState("");
  const [blockedCustomer, setBlockedCustomer] = useState(null);
  const [blockedStatus, setBlockedStatus] = useState(null); // "TRIAL_ACTIVE" | "TRIAL_EXPIRED"
  const [blockedTrial, setBlockedTrial] = useState(null);
  const [blockedAccessToken, setBlockedAccessToken] = useState(null);

  // Holds the just-submitted "User Details" values while the OTP modal is open — nothing
  // below (eligibility check, trial creation) runs until OTP verification succeeds.
  const [pendingCustomer, setPendingCustomer] = useState(null);

  useEffect(() => {
    getActiveSlots()
      .then((data) => {
        setSlots(data || []);
        setSlotsStatus("success");
      })
      .catch(() => setSlotsStatus("error"));
  }, []);

  useEffect(() => {
    if (!planId) return;
    getPlan(planId)
      .then((data) => {
        setPlan(data);
        setPlanStatus("success");
      })
      .catch(() => setPlanStatus("error"));
  }, [planId]);

  function handleCustomerFieldChange(e) {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  }

  function handleCountryChange(e) {
    const country = COUNTRIES.find((c) => c.name === e.target.value);
    setCustomer((prev) => ({
      ...prev,
      countryRegion: e.target.value,
      countryPhoneCode: country ? country.phoneCode : prev.countryPhoneCode,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSlotId) {
      setErrorMessage("Please select a class slot before continuing.");
      return;
    }
    setErrorMessage("");
    setPendingCustomer(customer);
  }

  async function handleOtpVerified(verificationToken) {
    const values = pendingCustomer;
    setPendingCustomer(null);
    setSubmitting(true);
    setErrorMessage("");
    setBlockedMessage("");
    setBlockedStatus(null);
    setBlockedTrial(null);
    setBlockedAccessToken(null);

    try {
      const eligibility = await checkTrialEligibility(values.email, values.mobileNumber);

      if (!eligibility.eligible) {
        setBlockedCustomer(values);
        setBlockedMessage(eligibility.message);
        setBlockedStatus(eligibility.status || "TRIAL_EXPIRED");
        setBlockedAccessToken(eligibility.accessToken || null);
        if (eligibility.status === "TRIAL_ACTIVE" && eligibility.accessToken) {
          getTrialByToken(eligibility.accessToken)
            .then(setBlockedTrial)
            .catch(() => {});
        }
        setSubmitting(false);
        return;
      }

      const trial = await createTrial(planId, durationId, selectedSlotId, values, verificationToken);
      if (!trial?.accessToken) {
        setErrorMessage("Could not start checkout. Please try again.");
        setSubmitting(false);
        return;
      }
      // The freshly issued access token — never the trial's raw id — is the only credential
      // used from here on (checkout-session creation, and later the Stripe redirect).
      const checkout = await createTrialCheckoutSession(trial.accessToken);
      if (!checkout?.checkoutUrl) {
        setErrorMessage("Could not start checkout. Please try again.");
        setSubmitting(false);
        return;
      }
      window.location.href = checkout.checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError && err.code === "TRIAL_ALREADY_USED") {
        setBlockedCustomer(values);
        setBlockedMessage(err.message);
        // The exception path has no status/trialId — fall back to the expired-user
        // treatment (offers a way forward) rather than leaving the user stuck.
        setBlockedStatus("TRIAL_EXPIRED");
      } else {
        setErrorMessage(err.message || "Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  // The user already used their free trial — send them into the existing PAID flow for
  // this same plan (never the trial/subscription checkout), carrying planId forward and
  // prefilling whatever details they already typed so they don't re-enter them.
  function handleContinueToPaidPlans() {
    if (blockedCustomer) {
      updateCheckoutState({ customer: blockedCustomer });
    }
    navigate(`/checkout/duration?planId=${planId}&flow=paid`);
  }

  if (!planId || !durationId) {
    return (
      <div className="container py-5 text-center">
        <p>Missing plan or duration selection. Please start from the pricing section.</p>
        <Link to="/">Back to Home</Link>
      </div>
    );
  }

  if (blockedMessage && blockedStatus === "TRIAL_ACTIVE") {
    return (
      <div className="container py-5" style={{ maxWidth: 640 }}>
        <div className="alert alert-warning">
          <h2 className="mb-2" style={{ fontSize: 20 }}>
            🎉 Your Free Trial is Already Active
          </h2>
          <p className="mb-3">
            Hi {blockedCustomer?.firstName}, your {blockedTrial?.planName || "trial"} free trial is currently
            active.
          </p>
          {blockedTrial ? (
            <div className="text-start" style={{ border: "1px solid #eee", borderRadius: 10, padding: 20, background: "#fff" }}>
              <p>
                <strong>Plan:</strong> {blockedTrial.planName}
              </p>
              <p>
                <strong>Trial Started:</strong> {new Date(blockedTrial.trialStartDate).toLocaleString()}
              </p>
              <p>
                <strong>Trial Ends:</strong> {new Date(blockedTrial.trialExpiryDate).toLocaleString()}
              </p>
              {blockedTrial.slotDate && (
                <p>
                  <strong>Selected Slot:</strong> {blockedTrial.slotLabel ? `${blockedTrial.slotLabel} — ` : ""}
                  {new Date(blockedTrial.slotDate).toLocaleDateString()} {blockedTrial.slotStartTime ?? ""}
                </p>
              )}
              <p className="mb-0">
                <strong>Status:</strong> FREE TRIAL ACTIVE
              </p>
            </div>
          ) : (
            <p className="text-muted">Loading your trial details…</p>
          )}
          <p className="text-muted mt-3">
            You can continue using your trial{blockedTrial ? ` until ${new Date(blockedTrial.trialExpiryDate).toLocaleString()}` : ""}.
            The saved payment method will be used for the scheduled subscription charge after the trial ends.
          </p>
          {blockedTrial && blockedAccessToken && (
            <Link
              to={`/thank-you?type=trial&token=${encodeURIComponent(blockedAccessToken)}`}
              className="btn"
              style={{ background: "#ff6b1b", color: "#fff" }}
            >
              View My Trial Details
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (blockedMessage && blockedStatus === "ACTIVE") {
    return (
      <div className="container py-5" style={{ maxWidth: 640 }}>
        <div className="alert alert-success">
          <h2 className="mb-2" style={{ fontSize: 20 }}>
            🎉 Your Membership is Already Active
          </h2>
          <p className="mb-0">
            {blockedMessage} No further payment is needed — your subscription continues automatically.
          </p>
        </div>
      </div>
    );
  }

  if (blockedMessage) {
    return (
      <div className="container py-5" style={{ maxWidth: 640 }}>
        <div className="alert alert-warning">
          <h2 className="mb-2" style={{ fontSize: 20 }}>
            Your Free Trial Has Expired
          </h2>
          <p className="mb-3">{blockedMessage}</p>
          <button
            type="button"
            className="btn"
            style={{ background: "#ff6b1b", color: "#fff" }}
            onClick={handleContinueToPaidPlans}
          >
            Pay Now
          </button>
        </div>
      </div>
    );
  }

  const selectedDuration = plan?.durations?.find((d) => d.id === durationId) || null;
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) || null;
  // The Plan entity's own trialDurationDays is usually unset for Standard/Premium, in which
  // case the backend falls back to app.trial.default-duration-days (5) — mirrored here only
  // as a display fallback, never sent to the backend, which always computes this itself.
  const trialDays = plan?.trialDurationDays || 5;

  return (
    <div className="container py-5">
      <div className="row g-4 g-md-5">
        {/* LEFT: User details form */}
        <div className="col-md-6">
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#ff6b1b", marginBottom: 8 }}>
            FREE 5-DAY TRIAL
          </div>
          <h1 className="mb-2" style={{ fontSize: 30, fontWeight: 700 }}>
            Start your <span style={{ color: "#ff6b1b" }}>free trial</span>
          </h1>
          <p className="text-muted mb-4">Fill in your details and pick your slot below.</p>

          <form id="trial-details-form" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">First name</label>
                <input
                  className="form-control"
                  name="firstName"
                  placeholder="First name"
                  value={customer.firstName}
                  onChange={handleCustomerFieldChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Last name</label>
                <input
                  className="form-control"
                  name="lastName"
                  placeholder="Last name"
                  value={customer.lastName}
                  onChange={handleCustomerFieldChange}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  placeholder="Your email"
                  value={customer.email}
                  onChange={handleCustomerFieldChange}
                  required
                />
              </div>

              <div className="col-4 col-sm-3">
                <label className="form-label">Code</label>
                <select
                  className="form-select"
                  name="countryPhoneCode"
                  value={customer.countryPhoneCode}
                  onChange={handleCustomerFieldChange}
                  required
                >
                  {PHONE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-8 col-sm-9">
                <label className="form-label">Mobile / WhatsApp number</label>
                <input
                  className="form-control"
                  name="mobileNumber"
                  placeholder="(555) 000-0000"
                  value={customer.mobileNumber}
                  onChange={handleCustomerFieldChange}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Country</label>
                <select
                  className="form-select"
                  name="countryRegion"
                  value={customer.countryRegion}
                  onChange={handleCountryChange}
                  required
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Select your slot</label>
                <select
                  className="form-select"
                  value={selectedSlotId ?? ""}
                  onChange={(e) => setSelectedSlotId(Number(e.target.value))}
                  disabled={slotsStatus !== "success" || slots.length === 0}
                  required
                >
                  <option value="" disabled>
                    {slotsStatus === "loading"
                      ? "Loading slots…"
                      : slotsStatus === "error"
                      ? "Could not load slots"
                      : slots.length === 0
                      ? "No slots available"
                      : "Choose a slot"}
                  </option>
                  {slots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatSlot(slot)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Address</label>
                <input
                  className="form-control"
                  name="address"
                  placeholder="Your address"
                  value={customer.address}
                  onChange={handleCustomerFieldChange}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="alert alert-danger mt-3" role="alert">
                {errorMessage}
              </div>
            )}

          </form>
        </div>

        {/* RIGHT: Plan summary card */}
        <div className="col-md-6">
          <div
            style={{
              border: "1px solid #f0d9c8",
              background: "#fff8f2",
              borderRadius: 18,
              padding: 28,
            }}
          >
            <div className="d-flex justify-content-between align-items-start mb-1">
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Your Yoga Plan</h2>
                <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                  Simple. Peaceful. Just for you.
                </p>
              </div>
              <span
                style={{
                  background: "#ff6b1b",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "5px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {plan?.name || (planStatus === "loading" ? "…" : "Plan")}
              </span>
            </div>

            <hr style={{ borderColor: "#f0d9c8", margin: "16px 0" }} />

            {planStatus === "error" && <p className="text-danger">Could not load plan details.</p>}
            {plan && (
              <>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{plan.name} Plan</h3>
                    <p className="text-muted mb-2" style={{ fontSize: 13.5, maxWidth: 260 }}>
                      {plan.description}
                    </p>
                    {selectedSlot && (
                      <p className="mb-0" style={{ fontSize: 13.5 }}>
                        <i className="bi bi-clock" style={{ color: "#ff6b1b", marginRight: 6 }}></i>
                        {formatSlot(selectedSlot)}
                      </p>
                    )}
                  </div>
                  {selectedDuration && (
                    <div style={{ fontSize: 24, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {formatPrice(selectedDuration.currency, selectedDuration.price)}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderTop: "1px dashed #e3c6ab",
                    margin: "18px 0",
                  }}
                />

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <div style={{ color: "#3a7d33", fontWeight: 700, fontSize: 14.5 }}>{trialDays}-Day Free Trial</div>
                    <div className="text-muted" style={{ fontSize: 12.5 }}>
                      Enjoy your first {trialDays} days at no cost.
                    </div>
                  </div>
                  <span
                    style={{
                      background: "#e6f4e1",
                      color: "#3a7d33",
                      borderRadius: 999,
                      padding: "4px 12px",
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    Free
                  </span>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-6">
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      <i className="bi bi-check-circle-fill" style={{ color: "#ff6b1b", marginRight: 6 }}></i>
                      After your free trial
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      Your membership will auto-renew{selectedDuration ? ` at ${formatPrice(selectedDuration.currency, selectedDuration.price)}/${formatCadence(selectedDuration.durationLabel)}` : ""}.
                    </div>
                  </div>
                  <div className="col-6">
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      <i className="bi bi-check-circle-fill" style={{ color: "#ff6b1b", marginRight: 6 }}></i>
                      Secure checkout
                    </div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      Your payment information is encrypted and always safe.
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* type="submit" + form="…" ties this button (visually in the plan card, matching the
                reference layout) back to the actual <form> on the left, so native required-field
                validation still runs exactly as it would for an in-form submit button. */}
            <button
              type="submit"
              form="trial-details-form"
              className="btn w-100"
              style={{ background: "#ff6b1b", color: "#fff", padding: "12px 0", fontWeight: 600, fontSize: 15 }}
              disabled={submitting || planStatus === "loading"}
            >
              {submitting ? "Please wait…" : "Continue to checkout"}
            </button>
            {selectedDuration && (
              <p className="text-center text-muted mt-2 mb-0" style={{ fontSize: 12 }}>
                {trialDays} days free · Then {formatPrice(selectedDuration.currency, selectedDuration.price)}/{formatCadence(selectedDuration.durationLabel)}
                <span style={{ color: "#ff6b1b" }}> · Cancel anytime</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {pendingCustomer && (
        <OtpVerificationModal
          firstName={pendingCustomer.firstName}
          email={pendingCustomer.email}
          countryPhoneCode={pendingCustomer.countryPhoneCode}
          mobileNumber={pendingCustomer.mobileNumber}
          onVerified={handleOtpVerified}
          onCancel={() => setPendingCustomer(null)}
        />
      )}
    </div>
  );
}
