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
import { SUPPORTED_COUNTRIES, detectSupportedCountryName, getCountryAddressConfig } from "../../lib/countryDetection.js";
import { getPricing } from "../../services/pricingApi.js";
import CheckoutLayout from "../../components/checkout/CheckoutLayout.jsx";
import AutoPaySuccessCard from "../../components/checkout/AutoPaySuccessCard.jsx";
import SlotPickerModal from "../../components/SlotPickerModal.jsx";
import { formatSlotSummary, formatDateWithWeekday, formatSlotTimeRange, formatDateDisplay, calculateTrialEndDate } from "../../lib/slotUtils.js";
import { resolveLocationTimezone } from "../../services/locationApi.js";
import { getStoredReferralCode, setStoredReferralCode, clearStoredReferralCode } from "../../services/referralStorage.js";

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
  state: "",
  city: "",
  postalCode: "",
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

function formatDateTime(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

function formatDateOnly(dateVal) {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatSelectedSlotText(trial) {
  if (!trial) return "";
  const parts = [];
  if (trial.slotLabel) parts.push(trial.slotLabel);
  let datePart = "";
  if (trial.slotDate) {
    datePart = formatDateOnly(trial.slotDate);
    if (trial.slotStartTime) datePart += ` ${trial.slotStartTime}`;
  }
  if (parts.length > 0 && datePart) return `${parts[0]} — ${datePart}`;
  if (parts.length > 0) return parts[0];
  if (datePart) return datePart;
  return "";
}

function calculateTrialUsage(startDateStr, expiryDateStr, isExpiredForce = false) {
  if (isExpiredForce) return 100;
  if (!startDateStr || !expiryDateStr) return 0;
  const start = new Date(startDateStr).getTime();
  const end = new Date(expiryDateStr).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return 0;

  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;

  const elapsed = now - start;
  const total = end - start;
  const pct = (elapsed / total) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export default function TrialDetailsPage() {
  const [searchParams] = useSearchParams();
  const planId = Number(searchParams.get("planId"));
  const durationId = Number(searchParams.get("durationId"));
  const tokenParam = searchParams.get("token");
  const navigate = useNavigate();

  // Persist referral code into storage if navigating directly to /trial or /trial/details with ?ref=
  useEffect(() => {
    try {
      const refParam = searchParams.get("ref");
      if (refParam && refParam.trim()) {
        setStoredReferralCode(refParam.trim().toUpperCase());
      }
    } catch {
      // Ignore
    }
  }, [searchParams]);

  const [plan, setPlan] = useState(null);
  const [planStatus, setPlanStatus] = useState("loading");

  const [slots, setSlots] = useState([]);
  const [slotsStatus, setSlotsStatus] = useState("loading");
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [chosenSlot, setChosenSlot] = useState(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [blockedMessage, setBlockedMessage] = useState("");
  const [blockedCustomer, setBlockedCustomer] = useState(null);
  const [blockedStatus, setBlockedStatus] = useState(null); // "ACTIVE" | "RENEWAL_PENDING" | "PAYMENT_FAILED" | "TRIAL_ACTIVE" | "TRIAL_EXPIRED"
  const [blockedTrial, setBlockedTrial] = useState(null);
  const [blockedAccessToken, setBlockedAccessToken] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Derived trial & renewal state variables — declared before any effects, callbacks, or returns
  const isPaid = blockedTrial?.paymentAmount != null || blockedTrial?.paymentDate != null;
  const isPaidActive = blockedStatus === "ACTIVE" || isPaid;
  const isExpiryPassed = blockedTrial?.trialExpiryDate ? new Date(blockedTrial.trialExpiryDate) <= new Date() : false;
  const isExpired = isExpiryPassed;
  const isAutoPayCancelled = Boolean(blockedTrial?.autoPayCancelled);
  const isAutoPayEnabled = Boolean(blockedTrial && !blockedTrial.autoPayCancelled && blockedTrial.stripeSubscriptionId);
  const isPaymentFailed = blockedStatus === "PAYMENT_FAILED" || blockedTrial?.status === "PAYMENT_FAILED";
  const isRenewalPending = blockedStatus === "RENEWAL_PENDING" || Boolean(isAutoPayEnabled && isExpiryPassed && !isPaidActive && !isPaymentFailed);
  const isTrialActive = blockedStatus === "TRIAL_ACTIVE" && !isExpiryPassed;
  const addressConfig = getCountryAddressConfig(customer.countryRegion);

  const [trialUsagePct, setTrialUsagePct] = useState(() =>
    calculateTrialUsage(blockedTrial?.trialStartDate, blockedTrial?.trialExpiryDate, isExpired)
  );

  useEffect(() => {
    if (!blockedTrial?.trialStartDate || !blockedTrial?.trialExpiryDate) {
      if (isExpired) setTrialUsagePct(100);
      return;
    }

    if (isExpired || new Date(blockedTrial.trialExpiryDate).getTime() <= Date.now()) {
      setTrialUsagePct(100);
      return;
    }

    setTrialUsagePct(
      calculateTrialUsage(blockedTrial.trialStartDate, blockedTrial.trialExpiryDate, false)
    );

    const timer = setInterval(() => {
      const nextUsage = calculateTrialUsage(
        blockedTrial.trialStartDate,
        blockedTrial.trialExpiryDate,
        false
      );
      setTrialUsagePct((prev) => (prev !== nextUsage ? nextUsage : prev));
    }, 30000);

    return () => clearInterval(timer);
  }, [blockedTrial?.trialStartDate, blockedTrial?.trialExpiryDate, isExpired]);

  const [resolvedTimezone, setResolvedTimezone] = useState(null);
  const [timezoneLoading, setTimezoneLoading] = useState(false);
  const [timezoneError, setTimezoneError] = useState("");
  const lastResolvedLocationKeyRef = useRef("");

  useEffect(() => {
    const { countryRegion, state, city, postalCode } = customer;
    if (!countryRegion || !postalCode?.trim() || !city?.trim()) {
      return;
    }

    if (!addressConfig.validatePostal(postalCode)) {
      return;
    }

    const locationKey = `${countryRegion}|${(state || "").trim().toLowerCase()}|${city.trim().toLowerCase()}|${postalCode.trim().toLowerCase()}`;
    if (lastResolvedLocationKeyRef.current === locationKey && resolvedTimezone) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setTimezoneLoading(true);
      setTimezoneError("");
      resolveLocationTimezone(
        countryRegion,
        state,
        city,
        postalCode
      )
        .then((res) => {
          if (cancelled) return;
          lastResolvedLocationKeyRef.current = locationKey;
          setResolvedTimezone(res);
          setTimezoneLoading(false);
          if (res?.timezoneId) {
            getActiveSlots(null, null, null, res.timezoneId)
              .then((data) => {
                if (!cancelled) {
                  setSlots(data || []);
                  setSlotsStatus("success");
                }
              })
              .catch(() => {});
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setTimezoneLoading(false);
          setTimezoneError(err?.message || "We couldn't determine your local timezone. Please verify your location details and try again.");
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customer.countryRegion, customer.state, customer.city, customer.postalCode]);

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
        if (cancelled || !trial) return;
        setBlockedTrial(trial);
        setBlockedAccessToken(directToken);
        setBlockedCustomer({ firstName: trial.firstName, lastName: trial.lastName, email: trial.email });

        const trialExpiryPassed = trial.trialExpiryDate && new Date(trial.trialExpiryDate) <= new Date();
        const trialAutoPayActive = !trial.autoPayCancelled && Boolean(trial.stripeSubscriptionId);

        if (trial.paymentAmount != null || trial.paymentDate != null) {
          setBlockedStatus("ACTIVE");
          setBlockedMessage("Your membership is active and paid.");
        } else if (trial.status === "PAYMENT_FAILED") {
          setBlockedStatus("PAYMENT_FAILED");
          setBlockedMessage("Your automatic renewal payment could not be processed.");
        } else if (trialAutoPayActive && trialExpiryPassed) {
          setBlockedStatus("RENEWAL_PENDING");
          setBlockedMessage("Your free trial has ended and your automatic renewal is being processed.");
        } else if (trial.autoPayCancelled && trialExpiryPassed) {
          setBlockedStatus("TRIAL_EXPIRED");
          setBlockedMessage("Your automatic renewal was cancelled. Please choose a plan to continue.");
        } else if (trial.status === "TRIAL_ACTIVE" && !trialExpiryPassed) {
          setBlockedStatus("TRIAL_ACTIVE");
          setBlockedMessage("Your free trial is already active.");
        } else {
          setBlockedStatus(trial.status || "TRIAL_EXPIRED");
          setBlockedMessage(trial.autoPayCancelled
            ? "Your automatic renewal was cancelled. Please choose a plan to continue."
            : "Your free trial has already been used. Please choose a Standard or Premium plan.");
        }
      })
      .catch(() => {
        // Invalid/expired token — silently fall through to the normal entry requirements.
      });
    return () => {
      cancelled = true;
    };
  }, [directToken]);

  // Polling for renewal status when renewal is pending
  useEffect(() => {
    const tokenToPoll = blockedAccessToken || directToken;
    if (!isRenewalPending || !tokenToPoll) return;

    let pollCount = 0;
    const maxPolls = 24; // ~60 seconds at 2.5s interval
    const interval = setInterval(() => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(interval);
        return;
      }
      getTrialByToken(tokenToPoll)
        .then((trialData) => {
          if (trialData) {
            setBlockedTrial(trialData);
            if (trialData.paymentAmount != null) {
              setBlockedStatus("ACTIVE");
              clearInterval(interval);
            } else if (trialData.status === "PAYMENT_FAILED") {
              setBlockedStatus("PAYMENT_FAILED");
              clearInterval(interval);
            } else if (trialData.status === "TRIAL_EXPIRED" && trialData.autoPayCancelled) {
              setBlockedStatus("TRIAL_EXPIRED");
              clearInterval(interval);
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [isRenewalPending, blockedAccessToken, directToken]);

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
    // Immediately clear validation error when the user edits fields
    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function handleCountryChange(e) {
    countryManuallySelectedRef.current = true;
    const newCountry = e.target.value;
    const details = SUPPORTED_COUNTRIES[newCountry];
    const newAddressConfig = getCountryAddressConfig(newCountry);

    setCustomer((prev) => ({
      ...prev,
      countryRegion: newCountry,
      countryPhoneCode: details ? details.phoneCode : prev.countryPhoneCode,
    }));

    // Clear previous country timezone error and resolved timezone so new country resolves afresh
    setTimezoneError("");
    setResolvedTimezone(null);

    // Dynamic country switch: Clear previous country error immediately and revalidate current postal value
    if (customer.postalCode?.trim()) {
      if (newAddressConfig.validatePostal(customer.postalCode)) {
        // If current postal is valid for the newly selected country (e.g. 10001 for United States), clear error
        setErrorMessage("");
      } else if (errorMessage) {
        // If it was already in an error state and is invalid for the new country, show the new country's message
        setErrorMessage(`Please enter a valid ${newAddressConfig.postalLabel} (${newAddressConfig.postalHelp}).`);
      } else {
        setErrorMessage("");
      }
    } else {
      setErrorMessage("");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const currentAddressConfig = getCountryAddressConfig(customer.countryRegion);
    if (!selectedSlot) {
      setErrorMessage("Please select your slot.");
      return;
    }
    if (!customer.state?.trim()) {
      setErrorMessage(`Please enter your ${currentAddressConfig.stateLabel.toLowerCase()}.`);
      return;
    }
    if (!customer.city?.trim()) {
      setErrorMessage("Please enter your city.");
      return;
    }
    if (!customer.postalCode?.trim()) {
      setErrorMessage(`Please enter your ${currentAddressConfig.postalLabel}.`);
      return;
    }
    if (!currentAddressConfig.validatePostal(customer.postalCode)) {
      setErrorMessage(`Please enter a valid ${currentAddressConfig.postalLabel} (${currentAddressConfig.postalHelp}).`);
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
        if (eligibility.accessToken) {
          getTrialByToken(eligibility.accessToken)
            .then((trialData) => {
              setBlockedTrial(trialData);
              if (trialData.paymentAmount != null) {
                setBlockedStatus("ACTIVE");
              }
            })
            .catch(() => {});
        }
        setSubmitting(false);
        return;
      }

      const referralCode = searchParams.get("ref")?.trim() || getStoredReferralCode() || null;
      const trial = await createTrial(
        planId,
        durationId,
        selectedSlot?.id || selectedSlotId || null,
        values,
        verificationToken,
        selectedSlot?.batchId || null,
        selectedSlot?.slotDate || selectedSlot?.date || null,
        referralCode
      );
      // Attribution is recorded on the backend with the trial. Clear local client storage
      // so any subsequent unrelated trial registration on this device is not accidentally attributed.
      clearStoredReferralCode();
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
      } else if (
        err?.code === "SLOT_INACTIVE" ||
        err?.code === "SLOT_UNAVAILABLE" ||
        err?.message?.toLowerCase().includes("slot is no longer available")
      ) {
        setSelectedSlotId(null);
        getActiveSlots().then((data) => setSlots(data || [])).catch(() => {});
        setErrorMessage("This slot is no longer available. Please select another slot.");
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
    const customerData = blockedCustomer || (blockedTrial ? {
      firstName: blockedTrial.firstName,
      lastName: blockedTrial.lastName,
      email: blockedTrial.email,
      mobileNumber: blockedTrial.mobileNumber,
      countryPhoneCode: blockedTrial.countryPhoneCode,
      countryRegion: blockedTrial.countryRegion,
    } : customer);

    if (customerData) {
      updateCheckoutState({ customer: customerData });
    }
    const targetPlanId = blockedTrial?.planId || planId || 2;
    navigate(`/checkout/duration?planId=${targetPlanId}&flow=paid`);
  }

  // CASE 3: Payment Succeeded / Membership Active
  if (isPaidActive) {
    return (
      <CheckoutLayout>
        <AutoPaySuccessCard
          trial={blockedTrial}
          fallbackName={blockedCustomer?.firstName || customer?.firstName || "Member"}
        />
      </CheckoutLayout>
    );
  }

  // CASE 1: AutoPay Enabled + Renewal Pending at expiry
  if (isRenewalPending) {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center" style={{ maxWidth: 540, margin: "0 auto" }}>
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: "2.75rem", height: "2.75rem" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <h2 className="mb-2" style={{ fontSize: 24, fontWeight: 600 }}>
            Your membership is being activated
          </h2>
          <p className="text-muted mb-4">
            Your free trial has ended and your automatic renewal is being processed. Please check again shortly.
          </p>
          <button
            type="button"
            className="btn btn-outline-primary px-4 py-2"
            onClick={() => {
              if (blockedAccessToken) {
                getTrialByToken(blockedAccessToken).then((data) => {
                  setBlockedTrial(data);
                  if (data.paymentAmount != null) {
                    setBlockedStatus("ACTIVE");
                  }
                });
              }
            }}
          >
            Check Status
          </button>
        </div>
      </CheckoutLayout>
    );
  }

  // CASE 4: Renewal Payment Failed
  if (isPaymentFailed) {
    return (
      <CheckoutLayout>
        <div className="container py-5" style={{ maxWidth: 640 }}>
          <div className="alert alert-danger" style={{ padding: 22 }}>
            <h2 className="mb-2" style={{ fontSize: 20 }}>
              Renewal Payment Failed
            </h2>
            <p className="mb-3">
              {blockedMessage || "Your automatic renewal payment could not be processed with your saved payment method. Please complete payment to continue your membership."}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleContinueToPaidPlans}
            >
              Pay Now
            </button>
          </div>
        </div>
      </CheckoutLayout>
    );
  }

  function renderTrialStatusCard(isActive) {
    const firstName = blockedCustomer?.firstName || blockedTrial?.firstName || "Member";
    const planName = blockedTrial?.planName || plan?.name || "Standard";
    const registrationId = blockedTrial?.id || "";
    const trialStart = blockedTrial?.trialStartDate ? formatDateTime(blockedTrial.trialStartDate) : "";
    const trialExpiry = blockedTrial?.trialExpiryDate ? formatDateTime(blockedTrial.trialExpiryDate) : "";
    const trialStartDateOnly = blockedTrial?.trialStartDate ? formatDateOnly(blockedTrial.trialStartDate) : "";
    const trialEndDateOnly = blockedTrial?.trialExpiryDate ? formatDateOnly(blockedTrial.trialExpiryDate) : "";
    const selectedSlotText = formatSelectedSlotText(blockedTrial);
    const usageDisplayPct = isActive ? trialUsagePct : 100;

    return (
      <CheckoutLayout>
        <div className="trial-status-page-wrapper">
          <div className="trial-status-card">
            {/* LEFT: Orange Yoga visual panel */}
            <div className="trial-status-left-panel">
              {/* Badges: Top-Left Status, Top-Right Plan */}
              <div className="trial-status-badges">
                <span className="trial-badge-status">
                  <span className="trial-badge-status-dot" aria-hidden="true" />
                  {isActive ? "ACTIVE" : "EXPIRED"}
                </span>
                <span className="trial-badge-plan">{planName.toUpperCase()}</span>
              </div>

              {/* Heading & Greeting */}
              <div className="trial-status-left-content">
                <h1 className="trial-status-title">
                  {isActive ? "Your free trial is active" : "Your free trial has expired"}
                </h1>
                <p className="trial-status-greeting">
                  Hi <strong>{firstName}</strong>, your {planName} free trial{" "}
                  {isActive ? "is currently running." : "has expired."}
                </p>
              </div>

              {/* Bottom Visual: Lotus Watermark + Yoga Girl */}
              <div className="trial-status-visual-wrap">
                <svg
                  className="trial-status-lotus-watermark"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M100 20 C100 80, 50 120, 100 170 C150 120, 100 80, 100 20 Z"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="2.5"
                    fill="rgba(255,255,255,0.06)"
                  />
                  <path
                    d="M100 60 C70 90, 30 130, 80 170 C110 130, 100 90, 100 60 Z"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="2.5"
                    fill="rgba(255,255,255,0.06)"
                  />
                  <path
                    d="M100 60 C130 90, 170 130, 120 170 C90 130, 100 90, 100 60 Z"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="2.5"
                    fill="rgba(255,255,255,0.06)"
                  />
                  <path
                    d="M80 90 C40 120, 15 150, 70 180 C95 150, 90 120, 80 90 Z"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="2"
                    fill="rgba(255,255,255,0.04)"
                  />
                  <path
                    d="M120 90 C160 120, 185 150, 130 180 C105 150, 110 120, 120 90 Z"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="2"
                    fill="rgba(255,255,255,0.04)"
                  />
                </svg>
                <img
                  src="/images/form-left-yoga-girl-absol.png"
                  alt="Yoga posture"
                  className="trial-status-yoga-img"
                />
              </div>
            </div>

            {/* RIGHT: White Trial Details panel */}
            <div className="trial-status-right-panel">
              {/* 1. Trial Usage & Dynamic Progress Bar */}
              <div className="trial-usage-section">
                <div className="trial-usage-header">
                  <span className="trial-usage-label">Trial usage</span>
                  <span className="trial-usage-pct">{usageDisplayPct}%</span>
                </div>
                <div className="trial-usage-bar-track">
                  <div
                    className="trial-usage-bar-fill"
                    style={{ width: `${usageDisplayPct}%` }}
                  />
                </div>
                {(trialStartDateOnly || trialEndDateOnly) && (
                  <div className="trial-usage-dates">
                    <span>{trialStartDateOnly}</span>
                    <span>{trialEndDateOnly}</span>
                  </div>
                )}
              </div>

              {/* 2. Trial Details Box */}
              <div className="trial-status-details-table">
                <div className="trial-status-details-row">
                  <span className="trial-status-details-label">Plan</span>
                  <span className="trial-status-details-value">{planName}</span>
                </div>
                {registrationId ? (
                  <div className="trial-status-details-row">
                    <span className="trial-status-details-label">Registration ID</span>
                    <span className="trial-status-details-value">{registrationId}</span>
                  </div>
                ) : null}
                {trialStart ? (
                  <div className="trial-status-details-row">
                    <span className="trial-status-details-label">Trial Started</span>
                    <span className="trial-status-details-value">{trialStart}</span>
                  </div>
                ) : null}
                {trialExpiry ? (
                  <div className="trial-status-details-row">
                    <span className="trial-status-details-label">Trial Ends</span>
                    <span className="trial-status-details-value">{trialExpiry}</span>
                  </div>
                ) : null}
                {selectedSlotText ? (
                  <div className="trial-status-details-row">
                    <span className="trial-status-details-label">Selected Slot</span>
                    <span className="trial-status-details-value">{selectedSlotText}</span>
                  </div>
                ) : null}
                <div className="trial-status-details-row">
                  <span className="trial-status-details-label">Status</span>
                  <span
                    className={`trial-status-details-value ${
                      isActive ? "trial-status-highlight-active" : "trial-status-highlight-expired"
                    }`}
                  >
                    {isActive ? "FREE TRIAL ACTIVE" : "FREE TRIAL EXPIRED"}
                  </span>
                </div>
              </div>

              {/* 3. Notice Box */}
              <div className="trial-status-notice-box">
                <p className="trial-status-notice-text">
                  {isActive ? (
                    <>
                      You can continue using your trial until{" "}
                      <strong>{trialEndDateOnly || trialExpiry}</strong>.{" "}
                      {blockedTrial?.autoPayCancelled
                        ? "AutoPay has been cancelled, so no payment will be taken after the trial ends."
                        : "Your saved payment method will be used for the scheduled subscription charge after the trial ends."}
                    </>
                  ) : (
                    blockedTrial?.autoPayCancelled
                      ? "Your automatic renewal was cancelled. Please choose a plan to continue."
                      : blockedMessage || "Your free trial has already been used. Please choose a Standard or Premium plan."
                  )}
                </p>
                <i className="bi bi-exclamation-triangle trial-status-notice-icon" aria-hidden="true" />
              </div>

              {cancelError && (
                <div className="alert alert-danger py-2 mb-3" role="alert" style={{ fontSize: 13 }}>
                  {cancelError}
                </div>
              )}

              {/* 4. Action Buttons */}
              <div className="trial-status-actions">
                {isActive ? (
                  <>
                    {blockedAccessToken && (
                      <Link
                        to={`/thank-you?type=trial&token=${encodeURIComponent(blockedAccessToken)}`}
                        className="trial-status-btn-view"
                      >
                        View My Trial Details
                      </Link>
                    )}
                    {!blockedTrial?.autoPayCancelled && (
                      <button
                        type="button"
                        className="trial-status-btn-cancel"
                        onClick={() => setShowCancelModal(true)}
                        disabled={cancelling}
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="trial-status-btn-pay"
                      onClick={handleContinueToPaidPlans}
                    >
                      Pay Now
                    </button>
                    {blockedAccessToken && (
                      <Link
                        to={`/thank-you?type=trial&token=${encodeURIComponent(blockedAccessToken)}`}
                        className="trial-status-btn-view"
                        style={{ background: "#374151" }}
                      >
                        View My Trial Details
                      </Link>
                    )}
                  </>
                )}
                <button
                  type="button"
                  className="trial-status-back-link"
                  onClick={() => navigate(-1)}
                >
                  <i className="bi bi-arrow-left" aria-hidden="true"></i> Back
                </button>
              </div>
            </div>
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

  // Existing Active Free Trial
  if (isTrialActive) {
    return renderTrialStatusCard(true);
  }

  // CASE 2: AutoPay Cancelled + Expired (or general expired)
  if (blockedMessage || blockedStatus === "TRIAL_EXPIRED" || (blockedTrial?.autoPayCancelled && isExpiryPassed)) {
    return renderTrialStatusCard(false);
  }

  if ((!planId || !durationId) && !tokenParam) {
    return (
      <CheckoutLayout>
        <div className="container py-5 text-center">
          <p>Missing plan or duration selection. Please start from the pricing section.</p>
          <Link to="/">Back to Home</Link>
        </div>
      </CheckoutLayout>
    );
  }

  const selectedDuration = plan?.durations?.find((d) => d.id === durationId) || null;
  const selectedSlot =
    chosenSlot ||
    (selectedSlotId != null
      ? slots.find((s) => s.id != null && s.id === selectedSlotId) || null
      : null);
  // Prefer the backend-resolved (country-converted) price; fall back to the duration's own
  // native price only while that request hasn't resolved yet, or if it failed — never a
  // frontend-computed conversion.
  const displayPriceText = pricing ? pricing.formattedAmount : (selectedDuration ? formatPrice(selectedDuration.currency, selectedDuration.price) : "");
  // The Plan entity's own trialDurationDays is usually unset for Standard/Premium, in which
  // case the backend falls back to app.trial.default-duration-days (5) — mirrored here only
  const trialDays = plan?.trialDurationDays || 7;

  return (
    <CheckoutLayout>
    <div className="container py-5">
      <div className="row g-4 g-md-5">
        {/* LEFT: User details form */}
        <div className="col-md-6">
    <div className="newtkfsl" style={{width:'95%'}} >
      <div className="trial-eyebrow">FREE {trialDays}-DAY TRIAL</div>
          <h1 className="mb-2" style={{ fontSize: 30, fontWeight: 700 }}>
            Start your <span style={{ color: "#ff6b1b" }}>free trial</span>
          </h1>
          <p className="text-muted mb-4">
            Fill in your details and pick your slot below. Begin your wellness journey today!
          </p>

          <form id="trial-details-form" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="trial-input-wrap">
                  <i className="bi bi-person trial-input-icon" aria-hidden="true"></i>
                  <input
                    id="trial-first-name"
                    className="form-control trial-input"
                    name="firstName"
                    aria-label="First Name"
                    placeholder="First name"
                    value={customer.firstName}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="trial-input-wrap">
                  <i className="bi bi-person trial-input-icon" aria-hidden="true"></i>
                  <input
                    id="trial-last-name"
                    className="form-control trial-input"
                    name="lastName"
                    aria-label="Last Name"
                    placeholder="Last name"
                    value={customer.lastName}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>

              <div className="col-12">
                <div className="trial-input-wrap">
                  <i className="bi bi-envelope trial-input-icon" aria-hidden="true"></i>
                  <input
                    id="trial-email"
                    type="email"
                    className="form-control trial-input"
                    name="email"
                    aria-label="Email Address"
                    placeholder="Your email address"
                    value={customer.email}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>

              <div className="col-5 col-sm-4">
                <select
                  id="trial-country-code"
                  className="form-select trial-input"
                  style={{ paddingLeft: 12 }}
                  name="countryPhoneCode"
                  aria-label="Country Code"
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
                <div className="trial-input-wrap">
                  <i className="bi bi-telephone trial-input-icon" aria-hidden="true"></i>
                  <input
                    id="trial-mobile"
                    className="form-control trial-input"
                    name="mobileNumber"
                    aria-label="Mobile / WhatsApp"
                    placeholder="Enter whatsApp number"
                    value={customer.mobileNumber}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <span id="trial-country-label" className="visually-hidden">Country</span>
                <div className="trial-input-wrap">
                  <i className="bi bi-geo-alt trial-input-icon" aria-hidden="true"></i>
                  <select
                    id="trial-country"
                    className="form-select trial-input"
                    name="countryRegion"
                    aria-label="Country"
                    aria-labelledby="trial-country-label"
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
                <span id="trial-state-label" className="visually-hidden">{addressConfig.stateLabel}</span>
                <div className="trial-input-wrap">
                  <i className="bi bi-map trial-input-icon" aria-hidden="true"></i>
                  <input
                    id="trial-state"
                    className="form-control trial-input"
                    name="state"
                    aria-label={addressConfig.stateLabel}
                    aria-labelledby="trial-state-label"
                    placeholder={addressConfig.statePlaceholder}
                    value={customer.state}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>
              <div className="col-md-6">
                <span id="trial-city-label" className="visually-hidden">{addressConfig.cityLabel}</span>
                <div className="trial-input-wrap">
                  <i className="bi bi-building trial-input-icon" aria-hidden="true"></i>
                  <input
                    id="trial-city"
                    className="form-control trial-input"
                    name="city"
                    aria-label={addressConfig.cityLabel}
                    aria-labelledby="trial-city-label"
                    placeholder={addressConfig.cityPlaceholder}
                    value={customer.city}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>

              <div className="col-md-6">
                <span id="trial-postal-label" className="visually-hidden">{addressConfig.postalLabel}</span>
                <div className="trial-input-wrap">
                  <i className="bi bi-pin-map trial-input-icon" aria-hidden="true"></i>
                  <input
                    id="trial-postal-code"
                    className="form-control trial-input"
                    name="postalCode"
                    aria-label={addressConfig.postalLabel}
                    aria-labelledby="trial-postal-label"
                    placeholder={addressConfig.postalPlaceholder}
                    value={customer.postalCode}
                    onChange={handleCustomerFieldChange}
                    required
                  />
                </div>
              </div>

                 <div className="col-12">
                <label htmlFor="choose-slot-button" id="trial-slot-label" className="form-label mb-1" style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block" }}>
                  Select your slot
                </label>
                <div className="trial-input-wrap">
                  <i className="bi bi-calendar3 trial-input-icon" aria-hidden="true"></i>
                  <button
                    type="button"
                    id="choose-slot-button"
                    className="form-control trial-input text-start d-flex align-items-center justify-content-between"
                    style={{
                      cursor: slotsStatus === "loading" || slots.length === 0 ? "not-allowed" : "pointer",
                      background: "#fff",
                      color: selectedSlot ? "#111827" : "#6c757d",
                      fontWeight: selectedSlot ? 500 : 400,
                      userSelect: "none",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minHeight: 46,
                    }}
                    onClick={() => {
                      if (slotsStatus === "success" && slots.length > 0) {
                        setIsSlotModalOpen(true);
                      }
                    }}
                    disabled={slotsStatus === "loading" || slots.length === 0}
                    aria-label="Choose a slot"
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", marginRight: 8 }}>
                      {slotsStatus === "loading"
                        ? "Loading slots…"
                        : slotsStatus === "error"
                        ? "Could not load slots"
                        : slots.length === 0
                        ? "No slots available"
                        : selectedSlot
                        ? `${formatSlotSummary(selectedSlot)}${resolvedTimezone?.displayOffset ? ` (${resolvedTimezone.displayOffset})` : (selectedSlot.displayOffset ? ` (${selectedSlot.displayOffset})` : "")}`
                        : "Select Your Slot"}
                    </span>
                    <i className="bi bi-chevron-down" style={{ fontSize: 13, color: "#9ca3af", flexShrink: 0 }}></i>
                  </button>
                </div>
              </div>

              {resolvedTimezone && (
                <div className="col-12">
                  <div
                    id="trial-form-timezone-info"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#fff9f5",
                      border: "1px solid #ffd8c2",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "#9a3412",
                      marginTop: 2,
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <div>
                      <i className="bi bi-geo-alt me-1"></i>
                      <span>
                        {resolvedTimezone.city ? `${resolvedTimezone.city}, ` : ""}
                        {resolvedTimezone.state ? `${resolvedTimezone.state}, ` : ""}
                        {resolvedTimezone.country}
                      </span>
                    </div>
                    <div>
                      <i className="bi bi-clock me-1"></i>
                      <strong style={{ color: "#ea580c" }}>{resolvedTimezone.timezoneName}</strong> ({resolvedTimezone.displayOffset})
                    </div>
                  </div>
                </div>
              )}
              {timezoneError && (
                <div className="col-12">
                  <div className="text-danger" style={{ fontSize: 12, marginTop: 2 }}>
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {timezoneError}
                  </div>
                </div>
              )}
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

        {selectedSlot && (
          <div
            id="trial-selected-dates-card"
            className="w-100 my-3 p-3 rounded"
            style={{
              background: "#fff9f5",
              border: "1px solid #ffd8bf",
              borderRadius: 12,
            }}
          >
            <div className="d-flex align-items-center justify-content-between text-start" style={{ gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#9a3412",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Trial Start
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#111827",
                    marginTop: 3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {formatDateDisplay(selectedSlot.slotDate || selectedSlot.date)}
                </div>
              </div>

              <div
                style={{
                  width: 1,
                  height: 32,
                  background: "#ffd8bf",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />

              <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#9a3412",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Trial End
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#111827",
                    marginTop: 3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {formatDateDisplay(calculateTrialEndDate(selectedSlot.slotDate || selectedSlot.date, trialDays))}
                </div>
              </div>
            </div>
          </div>
        )}

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

      {isSlotModalOpen && (
        <SlotPickerModal
          isOpen={isSlotModalOpen}
          onClose={() => setIsSlotModalOpen(false)}
          slots={slots}
          selectedSlot={selectedSlot}
          selectedSlotId={selectedSlotId}
          customerLocation={customer}
          resolvedTimezone={resolvedTimezone}
          onSelectSlot={(slot) => {
            setChosenSlot(slot);
            setSelectedSlotId(slot.id || null);
            setErrorMessage("");
          }}
        />
      )}
    </div>
    </CheckoutLayout>
  );
}
