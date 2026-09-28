import { useState, useEffect } from "react";
import { listCountryPricingAdmin, updateCountryPricingAdmin } from "../../services/adminApi.js";
import { showToast } from "./toast.js";

const COUNTRIES = [
  { code: "IN", name: "India", currency: "INR", symbol: "₹", flag: "🇮🇳" },
  { code: "US", name: "United States", currency: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "CA", name: "Canada", currency: "CAD", symbol: "C$", flag: "🇨🇦" },
  { code: "AU", name: "Australia", currency: "AUD", symbol: "A$", flag: "🇦🇺" },
];

export default function CountryPricingManager() {
  const [selectedCountryCode, setSelectedCountryCode] = useState("IN");
  const [pricingData, setPricingData] = useState({}); // { [countryCode]: AdminCountryPricingResponse }
  const [formPrices, setFormPrices] = useState({}); // { [durationId]: string price }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];

  useEffect(() => {
    loadAllPricing();
  }, []);

  async function loadAllPricing() {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await listCountryPricingAdmin();
      const allCountries = Array.isArray(res) ? res : [res];
      const map = {};
      allCountries.forEach((item) => {
        if (item && item.countryCode) {
          map[item.countryCode.toUpperCase()] = item;
        }
      });
      setPricingData(map);
      syncFormPrices(selectedCountryCode, map);
    } catch (err) {
      setErrorMessage(err.message || "Could not load country pricing.");
    } finally {
      setLoading(false);
    }
  }

  function syncFormPrices(countryCode, dataMap = pricingData) {
    const countryPricing = dataMap[countryCode.toUpperCase()];
    if (!countryPricing || !countryPricing.prices) return;
    const initialForm = {};
    countryPricing.prices.forEach((p) => {
      initialForm[p.durationId] = p.price != null ? String(p.price) : "";
    });
    setFormPrices(initialForm);
  }

  function handleCountrySelect(countryCode) {
    setSelectedCountryCode(countryCode);
    setErrorMessage("");
    syncFormPrices(countryCode);
  }

  function handlePriceChange(durationId, value) {
    setFormPrices((prev) => ({ ...prev, [durationId]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setErrorMessage("");

    const currentCountryPricing = pricingData[selectedCountryCode];
    if (!currentCountryPricing || !currentCountryPricing.prices) {
      setSaving(false);
      return;
    }

    const payloadPrices = [];
    for (const p of currentCountryPricing.prices) {
      const val = formPrices[p.durationId];
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) {
        setErrorMessage(`Please enter a valid price greater than zero for ${p.planName} (${p.durationLabel}).`);
        setSaving(false);
        return;
      }
      payloadPrices.push({
        planDurationId: p.durationId,
        price: num,
      });
    }

    try {
      const updated = await updateCountryPricingAdmin(selectedCountryCode, {
        countryCode: selectedCountryCode,
        prices: payloadPrices,
      });

      setPricingData((prev) => ({
        ...prev,
        [selectedCountryCode]: updated,
      }));
      syncFormPrices(selectedCountryCode, { ...pricingData, [selectedCountryCode]: updated });
      showToast(`${activeCountry.name} prices saved successfully.`, "success");
    } catch (err) {
      setErrorMessage(err.message || `Could not save prices for ${activeCountry.name}.`);
    } finally {
      setSaving(false);
    }
  }

  const currentCountryPricing = pricingData[selectedCountryCode];
  const pricesList = currentCountryPricing?.prices || [];

  // Group by plan name (Standard, Premium)
  const plansGrouped = {};
  pricesList.forEach((p) => {
    const key = p.planName || "Standard";
    if (!plansGrouped[key]) plansGrouped[key] = [];
    plansGrouped[key].push(p);
  });

  return (
    <div className="jy-card jy-card-pad mb-4" style={{ borderRadius: 14 }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 pb-3 border-bottom">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>
            <i className="bi bi-globe me-2" style={{ color: "#ff6b1b" }}></i>
            Country Pricing (Manual Admin Source of Truth)
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
            Admin manually sets prices for each supported country. No automatic FX conversion.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
          <span className="badge" style={{ background: "#f3f4f6", color: "#374151", fontSize: 12, padding: "6px 12px", border: "1px solid #e5e7eb" }}>
            Fixed Currency: <strong>{activeCountry.currency} ({activeCountry.symbol})</strong>
          </span>
        </div>
      </div>

      {/* Country Selector Tabs */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {COUNTRIES.map((c) => {
          const isSelected = selectedCountryCode === c.code;
          return (
            <button
              key={c.code}
              type="button"
              className="btn btn-sm"
              onClick={() => handleCountrySelect(c.code)}
              style={{
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                border: isSelected ? "2px solid #ff6b1b" : "1px solid #e5e7eb",
                background: isSelected ? "#fff5ee" : "#fff",
                color: isSelected ? "#ff6b1b" : "#374151",
                boxShadow: isSelected ? "0 2px 6px rgba(255, 107, 27, 0.15)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              <span>{c.flag}</span>
              <span>{c.name}</span>
              <span style={{ fontSize: 11, color: isSelected ? "#ff6b1b" : "#9ca3af", marginLeft: 2 }}>
                ({c.currency})
              </span>
            </button>
          );
        })}
      </div>

      {/* Pricing Form for Selected Country */}
      {loading ? (
        <div className="text-center py-4 text-muted" style={{ fontSize: 14 }}>
          <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
          Loading country prices…
        </div>
      ) : Object.keys(plansGrouped).length === 0 ? (
        <div className="alert alert-warning" style={{ fontSize: 13 }}>
          No active plan durations configured. Please ensure plans have active durations.
        </div>
      ) : (
        <div className="row g-3">
          {Object.entries(plansGrouped).map(([planName, durations]) => (
            <div key={planName} className="col-12 col-md-6">
              <div
                style={{
                  background: "#faf8f5",
                  border: "1px solid #ece5da",
                  borderRadius: 12,
                  padding: 18,
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#1f2937" }}>
                    {planName} Plan
                  </h3>
                  <span className="badge" style={{ background: "#ff6b1b", color: "#fff", fontSize: 11 }}>
                    {activeCountry.code} · {activeCountry.currency}
                  </span>
                </div>

                <div className="d-flex flex-column gap-3">
                  {durations.map((d) => (
                    <div key={d.durationId} className="d-flex align-items-center justify-content-between">
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", margin: 0 }}>
                        {d.durationLabel || `${d.durationValue} ${d.durationUnit}`}
                      </label>
                      <div className="input-group" style={{ maxWidth: 170 }}>
                        <span className="input-group-text" style={{ background: "#fff", fontSize: 13, fontWeight: 600, border: "1px solid #d1d5db" }}>
                          {activeCountry.symbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-control"
                          style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}
                          placeholder="Price"
                          value={formPrices[d.durationId] ?? ""}
                          onChange={(e) => handlePriceChange(d.durationId, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger mt-3" style={{ fontSize: 13, padding: "10px 14px" }} role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMessage}
        </div>
      )}

      {/* Save Button for Current Country */}
      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Country: <strong>{activeCountry.name}</strong> · Currency: <strong>{activeCountry.currency}</strong> (Fixed)
        </div>
        <button
          type="button"
          className="btn"
          disabled={saving || loading}
          onClick={handleSave}
          style={{
            background: "#ff6b1b",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            padding: "9px 24px",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(255, 107, 27, 0.25)",
          }}
        >
          {saving ? "Saving…" : `Save ${activeCountry.name} Prices`}
        </button>
      </div>
    </div>
  );
}
