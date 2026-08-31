// Persists the in-progress checkout selection across the multi-step flow, including
// the round trip to Stripe Checkout (which fully unloads the React app). sessionStorage
// only — never used as proof of anything; the backend is always re-queried for actual
// order/payment status.

const KEY = "jovens_checkout_state";

export function getCheckoutState() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function updateCheckoutState(patch) {
  const next = { ...getCheckoutState(), ...patch };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — flow still works in-memory per page.
  }
  return next;
}

export function clearCheckoutState() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
