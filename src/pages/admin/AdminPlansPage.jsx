import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import ConfirmModal from "../../components/admin/ConfirmModal.jsx";
import { TableSkeleton, EmptyState, ErrorState } from "../../components/admin/PageStates.jsx";
import { showToast } from "../../components/admin/toast.js";
import { listPlansAdmin, createPlan, updatePlan, setPlanActive, reorderPlans } from "../../services/adminApi.js";
import CountryPricingManager from "../../components/admin/CountryPricingManager.jsx";

const PLAN_TYPES = ["STANDARD", "PREMIUM"];
const DURATION_UNITS = ["DAY", "MONTH", "YEAR"];

const BLANK_PLAN = {
  name: "",
  description: "",
  imageUrl: "",
  planType: "STANDARD",
  currency: "USD",
  trialDurationDays: null,
  featured: false,
  badgeText: "",
  active: true,
  displayOrder: 0,
  durations: [],
  features: [],
};

function DurationRow({ duration, onChange, onRemove }) {
  return (
    <div className="row g-2 align-items-center mb-2">
      <div className="col-3">
        <input className="jy-input w-100" placeholder="Label (e.g. Per Month)"
               value={duration.durationLabel} onChange={(e) => onChange({ ...duration, durationLabel: e.target.value })} />
      </div>
      <div className="col-2">
        <input type="number" className="jy-input w-100" placeholder="Value"
               value={duration.durationValue} onChange={(e) => onChange({ ...duration, durationValue: Number(e.target.value) })} />
      </div>
      <div className="col-2">
        <select className="jy-select w-100" value={duration.durationUnit}
                onChange={(e) => onChange({ ...duration, durationUnit: e.target.value })}>
          {DURATION_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div className="col-2">
        <input type="number" step="0.01" className="jy-input w-100" placeholder="Price"
               value={duration.price} onChange={(e) => onChange({ ...duration, price: e.target.value })} />
      </div>
      <div className="col-1">
        <input className="jy-input w-100" placeholder="USD"
               value={duration.currency} onChange={(e) => onChange({ ...duration, currency: e.target.value })} />
      </div>
      <div className="col-1 form-check">
        <input type="checkbox" className="form-check-input" checked={duration.active}
               onChange={(e) => onChange({ ...duration, active: e.target.checked })} title="Active" />
      </div>
      <div className="col-1">
        <button type="button" className="jy-btn jy-btn-danger-outline jy-btn-sm" onClick={onRemove} title="Remove">
          <i className="bi bi-trash"></i>
        </button>
      </div>
    </div>
  );
}

function FeatureRow({ feature, onChange, onRemove }) {
  return (
    <div className="row g-2 align-items-center mb-2">
      <div className="col-9">
        <input className="jy-input w-100" placeholder="Feature text"
               value={feature.featureText} onChange={(e) => onChange({ ...feature, featureText: e.target.value })} />
      </div>
      <div className="col-2 form-check">
        <input type="checkbox" className="form-check-input" checked={feature.active}
               onChange={(e) => onChange({ ...feature, active: e.target.checked })} title="Active" />
      </div>
      <div className="col-1">
        <button type="button" className="jy-btn jy-btn-danger-outline jy-btn-sm" onClick={onRemove} title="Remove">
          <i className="bi bi-trash"></i>
        </button>
      </div>
    </div>
  );
}

function PlanForm({ initialPlan, onSaved, onCancel }) {
  const [plan, setPlan] = useState(initialPlan);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateDuration(index, next) {
    const durations = [...plan.durations];
    durations[index] = next;
    setPlan({ ...plan, durations });
  }
  function addDuration() {
    setPlan({ ...plan, durations: [...plan.durations, { durationLabel: "", durationValue: 1, durationUnit: "MONTH", price: "0.00", currency: plan.currency, displayOrder: plan.durations.length, active: true }] });
  }
  function removeDuration(index) {
    setPlan({ ...plan, durations: plan.durations.filter((_, i) => i !== index) });
  }

  function updateFeature(index, next) {
    const features = [...plan.features];
    features[index] = next;
    setPlan({ ...plan, features });
  }
  function addFeature() {
    setPlan({ ...plan, features: [...plan.features, { featureText: "", displayOrder: plan.features.length, active: true }] });
  }
  function removeFeature(index) {
    setPlan({ ...plan, features: plan.features.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    setSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        ...plan,
        trialDurationDays: plan.trialDurationDays === "" ? null : plan.trialDurationDays,
        durations: plan.durations.map((d, i) => ({ ...d, price: Number(d.price), displayOrder: i })),
        features: plan.features.map((f, i) => ({ ...f, displayOrder: i })),
      };
      if (plan.id) {
        await updatePlan(plan.id, payload);
        showToast("Plan updated successfully.", "success");
      } else {
        await createPlan(payload);
        showToast("Plan created successfully.", "success");
      }
      onSaved();
    } catch (err) {
      setErrorMessage(err.message || "Could not save plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="jy-card jy-card-pad jy-fade-in mb-4">
      <h2 style={{ fontSize: 16, fontWeight: 700 }} className="mb-3">{plan.id ? "Edit Plan" : "Create Plan"}</h2>

      <div className="row g-3 mb-3">
        <div className="col-md-4">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Name</label>
          <input className="jy-input w-100" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
        </div>
        <div className="col-md-3">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Plan Type</label>
          <select className="jy-select w-100" value={plan.planType} onChange={(e) => setPlan({ ...plan, planType: e.target.value })}>
            {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Currency</label>
          <input className="jy-input w-100" value={plan.currency} onChange={(e) => setPlan({ ...plan, currency: e.target.value })} />
        </div>
        <div className="col-md-3">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Trial Duration (days)</label>
          <input type="number" className="jy-input w-100" value={plan.trialDurationDays ?? ""}
                 onChange={(e) => setPlan({ ...plan, trialDurationDays: e.target.value === "" ? "" : Number(e.target.value) })} />
        </div>
        <div className="col-12">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Description</label>
          <textarea className="jy-input w-100" rows={2} value={plan.description} onChange={(e) => setPlan({ ...plan, description: e.target.value })} />
        </div>
        <div className="col-md-3">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Badge Text</label>
          <input className="jy-input w-100" value={plan.badgeText || ""} onChange={(e) => setPlan({ ...plan, badgeText: e.target.value })} />
        </div>
        <div className="col-md-2 form-check pt-4">
          <input type="checkbox" className="form-check-input" checked={plan.featured} onChange={(e) => setPlan({ ...plan, featured: e.target.checked })} />
          <label className="form-check-label" style={{ fontSize: 13 }}>Featured</label>
        </div>
        <div className="col-md-2 form-check pt-4">
          <input type="checkbox" className="form-check-input" checked={plan.active} onChange={(e) => setPlan({ ...plan, active: e.target.checked })} />
          <label className="form-check-label" style={{ fontSize: 13 }}>Active</label>
        </div>
      </div>

      <h3 style={{ fontSize: 13.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--jy-muted)" }} className="mb-2">Durations</h3>
      {plan.durations.map((d, i) => (
        <DurationRow key={i} duration={d} onChange={(next) => updateDuration(i, next)} onRemove={() => removeDuration(i)} />
      ))}
      <button type="button" className="jy-btn jy-btn-outline jy-btn-sm mb-4" onClick={addDuration}>
        <i className="bi bi-plus-lg"></i> Add Duration
      </button>

      <h3 style={{ fontSize: 13.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--jy-muted)" }} className="mb-2">Features</h3>
      {plan.features.map((f, i) => (
        <FeatureRow key={i} feature={f} onChange={(next) => updateFeature(i, next)} onRemove={() => removeFeature(i)} />
      ))}
      <button type="button" className="jy-btn jy-btn-outline jy-btn-sm mb-4 d-block" onClick={addFeature}>
        <i className="bi bi-plus-lg"></i> Add Feature
      </button>

      {errorMessage && (
        <div className="jy-login-error mb-3">
          <i className="bi bi-exclamation-circle-fill"></i>
          {errorMessage}
        </div>
      )}

      <div className="d-flex gap-2">
        <button type="button" className="jy-btn jy-btn-gradient" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Plan"}
        </button>
        <button type="button" className="jy-btn jy-btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState("loading");
  const [editingPlan, setEditingPlan] = useState(null);
  const [confirmPlan, setConfirmPlan] = useState(null);
  const [togglingBusy, setTogglingBusy] = useState(false);

  function load() {
    setStatus("loading");
    listPlansAdmin()
      .then((data) => {
        setPlans(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(load, []);

  function handleSaved() {
    setEditingPlan(null);
    load();
  }

  async function confirmToggleActive() {
    setTogglingBusy(true);
    try {
      await setPlanActive(confirmPlan.id, !confirmPlan.active);
      showToast(`Plan ${confirmPlan.active ? "deactivated" : "activated"}.`, "success");
      setConfirmPlan(null);
      load();
    } catch (err) {
      showToast(err.message || "Could not update plan status.", "error");
    } finally {
      setTogglingBusy(false);
    }
  }

  async function moveOrder(index, direction) {
    const next = [...plans];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    try {
      await reorderPlans(next.map((p) => p.id));
      load();
    } catch (err) {
      showToast(err.message || "Could not reorder plans.", "error");
    }
  }

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Plans</h1>
          <p className="jy-page-subtitle">Standard &amp; Premium — durations and features</p>
        </div>
        {!editingPlan && (
          <button type="button" className="jy-btn jy-btn-gradient"
                  onClick={() => setEditingPlan({ ...BLANK_PLAN, displayOrder: plans.length })}>
            <i className="bi bi-plus-lg"></i> Create Plan
          </button>
        )}
      </div>

      {editingPlan && (
        <PlanForm initialPlan={editingPlan} onSaved={handleSaved} onCancel={() => setEditingPlan(null)} />
      )}

      {!editingPlan && (
        <>
          <CountryPricingManager />
          <div className="jy-card">
          {status === "loading" && <div className="jy-card-pad"><TableSkeleton rows={4} /></div>}
          {status === "error" && <ErrorState message="Unable to load plans." onRetry={load} />}
          {status === "success" && plans.length === 0 && (
            <EmptyState icon="bi-box-seam" title="No plans yet" description="Create your first plan to show it on the landing page." />
          )}

          {status === "success" && plans.length > 0 && (
            <div className="jy-table-wrap">
              <table className="jy-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Featured</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan, i) => (
                    <tr key={plan.id}>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => moveOrder(i, -1)} disabled={i === 0} title="Move up">
                            <i className="bi bi-arrow-up"></i>
                          </button>
                          <button className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => moveOrder(i, 1)} disabled={i === plans.length - 1} title="Move down">
                            <i className="bi bi-arrow-down"></i>
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{plan.name}</td>
                      <td><span className="jy-badge primary">{plan.planType}</span></td>
                      <td>{plan.featured ? <span className="jy-badge info">Featured</span> : <span className="jy-cell-muted">—</span>}</td>
                      <td><span className={`jy-badge ${plan.active ? "success" : "neutral"}`}>{plan.active ? "Active" : "Inactive"}</span></td>
                      <td className="d-flex gap-2">
                        <button className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => setEditingPlan(plan)}>
                          <i className="bi bi-pencil"></i> Edit
                        </button>
                        <button className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => setConfirmPlan(plan)}>
                          {plan.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      <ConfirmModal
        open={Boolean(confirmPlan)}
        title={confirmPlan?.active ? "Deactivate plan?" : "Activate plan?"}
        message={
          confirmPlan?.active
            ? `"${confirmPlan?.name}" will be hidden from the public pricing page immediately.`
            : `"${confirmPlan?.name}" will become visible on the public pricing page.`
        }
        confirmLabel={confirmPlan?.active ? "Deactivate" : "Activate"}
        danger={confirmPlan?.active}
        busy={togglingBusy}
        onConfirm={confirmToggleActive}
        onCancel={() => setConfirmPlan(null)}
      />
    </AdminLayout>
  );
}
