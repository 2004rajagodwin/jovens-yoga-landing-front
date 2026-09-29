import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import ConfirmModal from "../../components/admin/ConfirmModal.jsx";
import { TableSkeleton } from "../../components/admin/PageStates.jsx";
import { showToast } from "../../components/admin/toast.js";
import {
  listBatchesAdmin,
  createBatchAdmin,
  updateBatchAdmin,
  setBatchActiveAdmin,
  deleteBatchAdmin,
  getBookingWindowAdmin,
  updateBookingWindowAdmin,
} from "../../services/adminApi.js";

function formatTime12(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

const BLANK_BATCH = {
  name: "",
  startTime: "",
  endTime: "",
  active: true,
  displayOrder: 0,
};

function BookingWindowCard() {
  const [weeks, setWeeks] = useState(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBookingWindowAdmin()
      .then((data) => {
        if (data && data.bookingWindowWeeks) {
          setWeeks(data.bookingWindowWeeks);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateBookingWindowAdmin(Number(weeks));
      setWeeks(updated.bookingWindowWeeks);
      showToast(`Booking window updated to ${updated.bookingWindowWeeks} weeks.`, "success");
    } catch (err) {
      showToast(err.message || "Failed to update booking window.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="jy-card jy-card-pad mb-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>CLASS BOOKING WINDOW</h2>
          <p className="jy-page-subtitle" style={{ margin: "4px 0 0" }}>
            Customers can select class dates from today up to the configured booking window.
          </p>
        </div>
      </div>
      <div className="d-flex align-items-center gap-3 mt-3 flex-wrap">
        <div style={{ minWidth: 200 }}>
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Booking Window</label>
          <select
            className="jy-input w-100"
            value={weeks}
            disabled={loading || saving}
            onChange={(e) => setWeeks(Number(e.target.value))}
          >
            <option value={1}>1 Week</option>
            <option value={2}>2 Weeks (Default)</option>
            <option value={3}>3 Weeks</option>
            <option value={4}>4 Weeks</option>
          </select>
        </div>
        <div className="pt-4">
          <button
            type="button"
            className="jy-btn jy-btn-gradient"
            disabled={loading || saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save Booking Window"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BatchModal({ initialBatch, onSaved, onCancel }) {
  const [batch, setBatch] = useState(initialBatch);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    if (!batch.name.trim()) {
      setErrorMessage("Batch name is required.");
      return;
    }
    if (!batch.startTime || !batch.endTime) {
      setErrorMessage("Start time and end time are required.");
      return;
    }
    setSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        name: batch.name.trim(),
        startTime: batch.startTime.length === 5 ? `${batch.startTime}:00` : batch.startTime,
        endTime: batch.endTime.length === 5 ? `${batch.endTime}:00` : batch.endTime,
        active: batch.active,
        displayOrder: Number(batch.displayOrder || 0),
      };
      if (batch.id) {
        await updateBatchAdmin(batch.id, payload);
        showToast("Batch updated successfully.", "success");
      } else {
        await createBatchAdmin(payload);
        showToast("Batch created successfully.", "success");
      }
      onSaved();
    } catch (err) {
      setErrorMessage(err.message || "Could not save batch.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="jy-card jy-card-pad jy-fade-in mb-4">
      <h2 style={{ fontSize: 16, fontWeight: 700 }} className="mb-3">
        {batch.id ? "Edit Batch" : "Add Batch"}
      </h2>
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Batch Name</label>
          <input
            className="jy-input w-100"
            placeholder="e.g. Morning Batch"
            value={batch.name}
            onChange={(e) => setBatch({ ...batch, name: e.target.value })}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Start Time</label>
          <input
            type="time"
            className="jy-input w-100"
            value={batch.startTime ? batch.startTime.substring(0, 5) : ""}
            onChange={(e) => setBatch({ ...batch, startTime: e.target.value })}
          />
        </div>
        <div className="col-md-3">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>End Time</label>
          <input
            type="time"
            className="jy-input w-100"
            value={batch.endTime ? batch.endTime.substring(0, 5) : ""}
            onChange={(e) => setBatch({ ...batch, endTime: e.target.value })}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Display Order</label>
          <input
            type="number"
            className="jy-input w-100"
            value={batch.displayOrder ?? 0}
            onChange={(e) => setBatch({ ...batch, displayOrder: e.target.value })}
          />
        </div>
        <div className="col-md-1 form-check pt-4">
          <input
            type="checkbox"
            className="form-check-input"
            checked={batch.active}
            onChange={(e) => setBatch({ ...batch, active: e.target.checked })}
          />
          <label className="form-check-label" style={{ fontSize: 13 }}>Active</label>
        </div>
      </div>

      {errorMessage && (
        <div className="jy-login-error mb-3">
          <i className="bi bi-exclamation-circle-fill"></i>
          {errorMessage}
        </div>
      )}

      <div className="d-flex gap-2">
        <button type="button" className="jy-btn jy-btn-gradient" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Batch"}
        </button>
        <button type="button" className="jy-btn jy-btn-outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminSlotsPage() {
  const [batches, setBatches] = useState([]);
  const [status, setStatus] = useState("loading");
  const [editingBatch, setEditingBatch] = useState(null);
  const [confirmBatch, setConfirmBatch] = useState(null);
  const [deleteBatchTarget, setDeleteBatchTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  function loadBatches() {
    setStatus("loading");
    listBatchesAdmin()
      .then((batchesData) => {
        setBatches(batchesData || []);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(loadBatches, []);

  function handleBatchSaved() {
    setEditingBatch(null);
    loadBatches();
  }

  async function confirmToggleBatchActive() {
    setBusy(true);
    try {
      await setBatchActiveAdmin(confirmBatch.id, !confirmBatch.active);
      showToast(`Batch ${confirmBatch.active ? "deactivated" : "activated"}.`, "success");
      setConfirmBatch(null);
      loadBatches();
    } catch (err) {
      showToast(err.message || "Could not update batch status.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteBatch() {
    setBusy(true);
    try {
      await deleteBatchAdmin(deleteBatchTarget.id);
      showToast("Batch deleted.", "success");
      setDeleteBatchTarget(null);
      loadBatches();
    } catch (err) {
      showToast(err.message || "Could not delete batch.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Class Batches &amp; Booking Window</h1>
          <p className="jy-page-subtitle">Configure recurring daily class batches and customer booking window</p>
        </div>
      </div>

      {/* 1. ADMIN BOOKING WINDOW SETTING */}
      <BookingWindowCard />

      {/* 2. ADMIN RECURRING BATCHES SECTION */}
      <div className="jy-card mb-4">
        <div className="jy-card-pad d-flex align-items-center justify-content-between border-bottom">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>RECURRING DAILY BATCHES</h2>
            <p className="jy-page-subtitle" style={{ margin: "4px 0 0" }}>
              Batch times are shown in the customer's local timezone based on their location. Active batches automatically apply to every date across the booking window.
            </p>
          </div>
          {!editingBatch && (
            <button
              type="button"
              className="jy-btn jy-btn-gradient"
              onClick={() => setEditingBatch({ ...BLANK_BATCH })}
            >
              <i className="bi bi-plus-lg"></i> Add Batch
            </button>
          )}
        </div>

        {editingBatch && (
          <div className="jy-card-pad">
            <BatchModal
              initialBatch={editingBatch}
              onSaved={handleBatchSaved}
              onCancel={() => setEditingBatch(null)}
            />
          </div>
        )}

        <div className="jy-table-wrap">
          {status === "loading" && <div className="p-3"><TableSkeleton rows={3} /></div>}
          {status === "success" && (
            <table className="jy-table">
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Time Window (Customer Local Time)</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">
                      No batches configured yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {formatTime12(b.startTime)} – {formatTime12(b.endTime)}
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Customer Local Time</div>
                      </td>
                      <td>{b.displayOrder ?? 0}</td>
                      <td>
                        <span className={`jy-badge ${b.active ? "success" : "neutral"}`}>
                          {b.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="d-inline-flex gap-2">
                          <button
                            className="jy-btn jy-btn-outline jy-btn-sm"
                            onClick={() => setEditingBatch(b)}
                          >
                            <i className="bi bi-pencil"></i> Edit
                          </button>
                          <button
                            className="jy-btn jy-btn-outline jy-btn-sm"
                            onClick={() => setConfirmBatch(b)}
                          >
                            {b.active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            className="jy-btn jy-btn-danger-outline jy-btn-sm"
                            onClick={() => setDeleteBatchTarget(b)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirmBatch)}
        title={confirmBatch?.active ? "Deactivate batch?" : "Activate batch?"}
        message={
          confirmBatch?.active
            ? "This batch will no longer appear in the customer slot picker."
            : "This batch will appear in the customer slot picker across all booking window dates."
        }
        confirmLabel={confirmBatch?.active ? "Deactivate" : "Activate"}
        danger={confirmBatch?.active}
        busy={busy}
        onConfirm={confirmToggleBatchActive}
        onCancel={() => setConfirmBatch(null)}
      />

      <ConfirmModal
        open={Boolean(deleteBatchTarget)}
        title="Delete batch?"
        message="This permanently removes the batch configuration. This cannot be undone."
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDeleteBatch}
        onCancel={() => setDeleteBatchTarget(null)}
      />
    </AdminLayout>
  );
}
