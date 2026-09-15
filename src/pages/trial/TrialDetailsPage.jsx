import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import OtpVerificationModal from "../../components/OtpVerificationModal.jsx";
import { checkTrialEligibility, createTrial, getTrialByToken } from "../../services/trialApi.js";
import { createTrialCheckoutSession, cancelTrialAutoPay } from "../../services/paymentApi.js";
import CancelAutoPayModal from "../../components/CancelAutoPayModal.jsx";
import { getActiveSlots } from "../../services/slotApi.js";
import { getPlan } from "../../services/planApi.js";
import { ApiError } from "../../services/apiClient.js";
import { updateCheckoutState } from "../../services/checkoutState.js";
import { SUPPORTED_COUNTRIES, detectSupportedCountryName } from "../../lib/countryDetection.js";
import { getPricing } from "../../services/pricingApi.js";
import CheckoutLayout from "../../components/checkout/CheckoutLayout.jsx";

// Trial registration only supports these 5 countries/phone codes — a deliberately shorter
// list than the shared COUNTRIES set (used elsewhere, e.g. the paid checkout flow) so that
// list stays untouched. Keeping this list short also keeps the native <select> popup short
// enough that browsers reliably render it downward instead of flipping upward for lack of
// room below — browsers choose that direction themselves based on available viewport space,
// which can't be forced via CSS/HTML without replacing the native control entirely.
// Derived from SUPPORTED_COUNTRIES (the same 5-country map the auto-detection logic uses)
// rather than duplicating the name/phoneCode pairs a second time.
const TRIAL_COUNTRIES = Object.entries(SUPPORTED_COUNTRIES).map(([name, details]) => ({
  name,
  phoneCode: details.phoneCode,
}));

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
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Holds the just-submitted "User Details" values while the OTP modal is open — nothing
  // below (eligibility check, trial creation) runs until OTP verification succeeds.
  const [pendingCustomer, setPendingCustomer] = useState(null);

  // Guards the one-time country auto-detection: true once the user has touched the Country
  // field themselves (or a detection result already landed), so a slow-resolving lookup can
  // never clobber a manual choice, and StrictMode's mount→cleanup→mount replay can never
  // trigger a second network call.
  const countryAutoDetectStartedRef = useRef(false);
  const countryManuallySelectedRef = useRef(false);

  // Backend-resolved price for the currently selected country — the frontend never computes
  // a converted amount itself. Refetched only when the selected duration or country actually
  // changes (not on every render/keystroke).
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    if (!durationId || !customer.countryRegion) return;
    const isoCode = SUPPORTED_COUNTRIES[customer.countryRegion]?.isoCode;
    let cancelled = false;
    getPricing(durationId, isoCode)
      .then((data) => {
        if (!cancelled) setPricing(data);
      })
      .catch(() => {
        // Display-only preview — a failure here just leaves the previous/native price shown
        // (see priceDisplay below), it never blocks the form or checkout.
      });
    return () => {
      cancelled = true;
    };
  }, [durationId, customer.countryRegion]);

  useEffect(() => {
    if (countryAutoDetectStartedRef.current) return;
    countryAutoDetectStartedRef.current = true;
    let cancelled = false;
    detectSupportedCountryName().then((countryName) => {
      if (cancelled || countryManuallySelectedRef.current) return;
      const details = SUPPORTED_COUNTRIES[countryName];
      if (!details) return;
      setCustomer((prev) => ({ ...prev, countryRegion: countryName, countryPhoneCode: details.phoneCode }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Lets ThankYouPage's "Back"/"View My Trial Details" link land straight on this same
  // active-trial view, reusing the trial's own short-lived access token — no need to
  // re-run the User Details form or OTP again for a trial the visitor just created.
  const directToken = searchParams.get("token");

  useEffect(() => {
    if (!directToken) return;
    let cancelled = false;
    getTrialByToken(directToken)
      .then((trial) => {
        if (cancelled || trial.status !== "TRIAL_ACTIVE") return;
        setBlockedTrial(trial);
        setBlockedStatus("TRIAL_ACTIVE");
        setBlockedMessage("Your free trial is already active.");
        setBlockedAccessToken(directToken);
        setBlockedCustomer({ firstName: trial.firstName });
      })
      .catch(() => {
        // Invalid/expired token — silently fall through to the normal entry requirements.
      });
    return () => {
      cancelled = true;
    };
  }, [directToken]);

  async function handleConfirmCancelAutoPay() {
    if (cancelling || !blockedAccessToken) return;
    setCancelling(true);
    setCancelError("");
    try {
      await cancelTrialAutoPay(blockedAccessToken);
      setBlockedTrial((prev) => (prev ? { ...prev, autoPayCancelled: true } : prev));
      setShowCancelModal(false);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Could not cancel AutoPay. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  function handleCloseCancelModal() {
    if (cancelling) return;
    setShowCancelModal(false);
    setCancelError("");
  }

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
    if (name === "countryPhoneCode") {
      countryManuallySelectedRef.current = true;
    }
    setCustomer((prev) => ({ ...prev, [name]: value }));
  }

  function handleCountryChange(e) {
    countryManuallySelectedRef.current = true;
    const details = SUPPORTED_COUNTRIES[e.target.value];
    setCustomer((prev) => ({
      ...prev,
      countryRegion: e.target.value,
      countryPhoneCode: details ? details.phoneCode : prev.countryPhoneCode,
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

  if (blockedMessage && blockedStatus === "TRIAL_ACTIVE") {
    return (
      <CheckoutLayout>
      <div className="container py-5" style={{ maxWidth: 680 }}>
        <div className="alert alert-warning" style={{padding:16}}>
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
              {blockedTrial.autoPayCancelled && (
                <p className="mb-0" style={{ color: "#b45309", fontWeight: 600 }}>
                  AutoPay: CANCELLED
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted">Loading your trial details…</p>
          )}
          <p className="text-muted mt-3 paraksfo">
            You can continue using your trial{blockedTrial ? ` until ${new Date(blockedTrial.trialExpiryDate).toLocaleString()}` : ""}.
            {blockedTrial?.autoPayCancelled
              ? " AutoPay has been cancelled, so no payment will be taken after the trial ends."
              : " The saved payment method will be used for the scheduled subscription charge after the trial ends."}
          </p>

          {cancelError && (
            <div className="alert alert-danger" role="alert" style={{ fontSize: 13 }}>
              {cancelError}
            </div>
          )}

          {blockedTrial && blockedAccessToken && (
            <div className="d-flex flex-wrap gap-2">
              <Link
                to={`/thank-you?type=trial&token=${encodeURIComponent(blockedAccessToken)}`}
                className="btn"
                style={{ background: "#ff6b1b", color: "#fff" }}
              >
                View My Trial Details
              </Link>
              {!blockedTrial.autoPayCancelled && (
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => setShowCancelModal(true)}
                  disabled={cancelling}
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          )}

          <button type="button" className="checkout-back-link mt-3" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left"></i> Back
          </button>
        </div>
      </div>

      {showCancelModal && (
        <CancelAutoPayModal
          onConfirm={handleConfirmCancelAutoPay}
          onCancel={handleCloseCancelModal}
          submitting={cancelling}
          errorMessage={cancelError}
        />
      )}
      </CheckoutLayout>
    );
  }

  if (!planId || !durationId) {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center">
          <p>Missing plan or duration selection. Please start from the pricing section.</p>
          <Link to="/">Back to Home</Link>
        </div>
      </CheckoutLayout>
    );
  }

  if (blockedMessage && blockedStatus === "ACTIVE") {
    return (
      <CheckoutLayout>
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
      </CheckoutLayout>
    );
  }

  if (blockedMessage) {
    return (
      <CheckoutLayout>
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
      </CheckoutLayout>
    );
  }

  const selectedDuration = plan?.durations?.find((d) => d.id === durationId) || null;
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) || null;
  // Prefer the backend-resolved (country-converted) price; fall back to the duration's own
  // native price only while that request hasn't resolved yet, or if it failed — never a
  // frontend-computed conversion.
  const displayPriceText = pricing ? pricing.formattedAmount : (selectedDuration ? formatPrice(selectedDuration.currency, selectedDuration.price) : "");
  // The Plan entity's own trialDurationDays is usually unset for Standard/Premium, in which
  // case the backend falls back to app.trial.default-duration-days (5) — mirrored here only
  // as a display fallback, never sent to the backend, which always computes this itself.
  const trialDays = plan?.trialDurationDays || 5;

  return (
    <CheckoutLayout>
    <div className="container py-5">
      <div className="row g-4 g-md-5">
        {/* LEFT: User details form */}
        <div className="col-md-6">
    <div className="newtkfsl" style={{width:'95%'}} >
      <div className="trial-eyebrow">FREE 5-DAY TRIAL</div>
          <h1 className="mb-2" style={{ fontSize: 30, fontWeight: 700 }}>
            Start your <span style={{ color: "#ff6b1b" }}>free trial</span>
          </h1>
          <p className="text-muted mb-4">
            Fill in your details and pick your slot below. Begin your wellness journey today!
          </p>

          <form id="trial-details-form" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                {/* <label className="form-label">First name</label> */}
                <div className="trial-input-wrap">
                  <i className="bi bi-person trial-input-icon" aria-hidden="true"></i>
                  <input
                    className="form-control trial-input"
                    name="firstName"
                    placeholder="First name"
                    value={customer.firstName}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>
              <div className="col-md-6">
                {/* <label className="form-label">Last name</label> */}
                <div className="trial-input-wrap">
                  <i className="bi bi-person trial-input-icon" aria-hidden="true"></i>
                  <input
                    className="form-control trial-input"
                    name="lastName"
                    placeholder="Last name"
                    value={customer.lastName}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>

              <div className="col-12">
                {/* <label className="form-label">Email address</label> */}
                <div className="trial-input-wrap">
                  <i className="bi bi-envelope trial-input-icon" aria-hidden="true"></i>
                  <input
                    type="email"
                    className="form-control trial-input"
                    name="email"
                    placeholder="Your email address"
                    value={customer.email}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>

              <div className="col-5 col-sm-4">
                {/* <label className="form-label">Country Code</label> */}
                <select
                  className="form-select trial-input"
                  style={{ paddingLeft: 12 }}
                  name="countryPhoneCode"
                  value={customer.countryPhoneCode}
                  onChange={handleCustomerFieldChange}
                  required
                >
                  {TRIAL_COUNTRIES.map((c) => (
                    <option key={c.name} value={c.phoneCode}>
                      {c.phoneCode} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-7 col-sm-8">
                {/* <label className="form-label">Mobile / WhatsApp number</label> */}
                <div className="trial-input-wrap">
                  <i className="bi bi-telephone trial-input-icon" aria-hidden="true"></i>
                  <input
                    className="form-control trial-input"
                    name="mobileNumber"
                    placeholder="98765 43210"
                    value={customer.mobileNumber}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                {/* <label className="form-label">Country</label> */}
                <div className="trial-input-wrap">
                  <i className="bi bi-geo-alt trial-input-icon" aria-hidden="true"></i>
                  <select
                    className="form-select trial-input"
                    name="countryRegion"
                    value={customer.countryRegion}
                    onChange={handleCountryChange}
                    required
                  >
                    {TRIAL_COUNTRIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                {/* <label className="form-label">Select your slot</label> */}
                <div className="trial-input-wrap">
                  <i className="bi bi-calendar3 trial-input-icon" aria-hidden="true"></i>
                  <select
                    className="form-select trial-input"
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
              </div>

              <div className="col-12">
                {/* <label className="form-label">Address</label> */}
                <div className="trial-input-wrap">
                  <i className="bi bi-house trial-input-icon" aria-hidden="true"></i>
                  <input
                    className="form-control trial-input"
                    name="address"
                    placeholder="Your address"
                    value={customer.address}
                    onChange={handleCustomerFieldChange}
                  />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="alert alert-danger mt-3" role="alert">
                {errorMessage}
              </div>
            )}

          </form>

          <button type="button" className="checkout-back-link" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left"></i> Back
          </button>

    </div>
        </div>

        {/* RIGHT: Plan summary card */}
        <div className="col-md-6">
  <div
    style={{
      border: "1px solid #f0d9c8",
      background: "#fff8f2",
      borderRadius: 18,
      padding: 30,
      margin: "0px 20px",
    }}
  >
    <div className="d-flex justify-content-between align-items-start mb-2">
      <div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Your Yoga Plan
        </h2>
      </div>

      <span
        style={{
          background: "#ff6b1b",
          color: "#fff",
          borderRadius: 999,
          padding: "6px 15px",
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {plan?.name || (planStatus === "loading" ? "…" : "Plan")}
      </span>
    </div>

    <hr
      style={{
        borderColor: "#f0d9c8",
        margin: "18px 0",
      }}
    />

    {planStatus === "error" && (
      <p
        className="text-danger"
        style={{
          fontSize: 15,
          marginBottom: 15,
        }}
      >
        Could not load plan details.
      </p>
    )}

    {plan && (
      <>
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 6px",
                lineHeight: 1.4,
              }}
            >
              {plan.name} Plan
            </h3>

            <p
              className="text-muted mb-3"
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                maxWidth: 300,
              }}
            >
              {plan.description}
            </p>

            {selectedSlot && (
              <p
                className="mb-0"
                style={{
                  fontSize: 15,
                  lineHeight: 1.5,
                }}
              >
                <i
                  className="bi bi-clock"
                  style={{
                    color: "#ff6b1b",
                    marginRight: 7,
                  }}
                ></i>

                {formatSlot(selectedSlot)}
              </p>
            )}
          </div>

          {selectedDuration && (
            <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.3 }}>
                {displayPriceText}
              </div>
              <div className="text-muted" style={{ fontSize: 13, lineHeight: 1.4 }}>
                /{formatCadence(selectedDuration.durationLabel)}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            borderTop: "1px dashed #e3c6ab",
            margin: "20px 0",
          }}
        />

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <div
              style={{
                color: "#3a7d33",
                fontWeight: 700,
                fontSize: 16,
                lineHeight: 1.4,
              }}
            >
              {trialDays}-Day Free Trial
            </div>

            <div
              className="text-muted"
              style={{
                fontSize: 14,
                lineHeight: 1.5,
                marginTop: 3,
              }}
            >
              Enjoy your first {trialDays} days at no cost.
            </div>
          </div>

          <span
            style={{
              background: "#e6f4e1",
              color: "#3a7d33",
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Free
          </span>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-6">
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              <i
                className="bi bi-check-circle-fill"
                style={{
                  color: "#ff6b1b",
                  marginRight: 7,
                }}
              ></i>

              After your free trial
            </div>

            <div
              className="text-muted"
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                marginTop: 4,
              }}
            >
              Your membership will auto-renew
              {selectedDuration
                ? ` at ${displayPriceText}/${formatCadence(selectedDuration.durationLabel)}`
                : ""}
              .
            </div>
          </div>

          <div className="col-6">
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              <i
                className="bi bi-check-circle-fill"
                style={{
                  color: "#ff6b1b",
                  marginRight: 7,
                }}
              ></i>

              Secure checkout
            </div>

            <div
              className="text-muted"
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                marginTop: 4,
              }}
            >
              Your payment information is encrypted and
              always safe.
            </div>
          </div>
        </div>
      </>
    )}

    <button
      type="submit"
      form="trial-details-form"
      className="btn w-100 d-inline-flex align-items-center justify-content-center gap-2"
      style={{
        background: "#ff6b1b",
        color: "#fff",
        padding: "14px 0",
        fontWeight: 600,
        fontSize: 16,
        borderRadius: 8,
        border: "none",
      }}
      disabled={submitting || planStatus === "loading"}
    >
      {submitting ? "Please wait…" : (
        <>
          Continue to checkout <i className="bi bi-arrow-right" aria-hidden="true"></i>
        </>
      )}
    </button>

    {selectedDuration && (
      <p
        className="text-center text-muted mt-3 mb-0"
        style={{
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {trialDays} days free · Then{" "}
        {displayPriceText}
        /{formatCadence(selectedDuration.durationLabel)}

        <span style={{ color: "#ff6b1b" }}>
          {" "}
          · Cancel anytime
        </span>
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
    </CheckoutLayout>
  );
}
