import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import ConfirmModal from "../../components/admin/ConfirmModal.jsx";
import { TableSkeleton, EmptyState, ErrorState } from "../../components/admin/PageStates.jsx";
import { showToast } from "../../components/admin/toast.js";
import { listSlotsAdmin, createSlot, updateSlot, setSlotActive, deleteSlot } from "../../services/adminApi.js";

const BLANK_SLOT = {
  slotDate: "",
  startTime: "",
  endTime: "",
  capacity: "",
  label: "",
  active: true,
  displayOrder: 0,
};

function SlotForm({ initialSlot, onSaved, onCancel }) {
  const [slot, setSlot] = useState(initialSlot);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setErrorMessage("");
    try {
      const payload = {
        ...slot,
        endTime: slot.endTime === "" ? null : slot.endTime,
        capacity: slot.capacity === "" || slot.capacity === null || slot.capacity === undefined ? null : Number(slot.capacity),
      };
      if (slot.id) {
        await updateSlot(slot.id, payload);
        showToast("Slot updated successfully.", "success");
      } else {
        await createSlot(payload);
        showToast("Slot created successfully.", "success");
      }
      onSaved();
    } catch (err) {
      setErrorMessage(err.message || "Could not save slot.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="jy-card jy-card-pad jy-fade-in mb-4">
      <h2 style={{ fontSize: 16, fontWeight: 700 }} className="mb-3">{slot.id ? "Edit Slot" : "Create Slot"}</h2>

      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Date</label>
          <input type="date" className="jy-input w-100" value={slot.slotDate}
                 onChange={(e) => setSlot({ ...slot, slotDate: e.target.value })} />
        </div>
        <div className="col-md-2">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Start Time</label>
          <input type="time" className="jy-input w-100" value={slot.startTime}
                 onChange={(e) => setSlot({ ...slot, startTime: e.target.value })} />
        </div>
        <div className="col-md-2">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>End Time</label>
          <input type="time" className="jy-input w-100" value={slot.endTime || ""}
                 onChange={(e) => setSlot({ ...slot, endTime: e.target.value })} />
        </div>
        <div className="col-md-2">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Capacity</label>
          <input type="number" className="jy-input w-100" value={slot.capacity ?? ""}
                 onChange={(e) => setSlot({ ...slot, capacity: e.target.value })} />
        </div>
        <div className="col-md-3">
          <label className="form-label" style={{ fontSize: 13, fontWeight: 600 }}>Label</label>
          <input className="jy-input w-100" placeholder="e.g. Morning Batch" value={slot.label || ""}
                 onChange={(e) => setSlot({ ...slot, label: e.target.value })} />
        </div>
        <div className="col-md-2 form-check pt-4">
          <input type="checkbox" className="form-check-input" checked={slot.active}
                 onChange={(e) => setSlot({ ...slot, active: e.target.checked })} />
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
          {saving ? "Saving…" : "Save Slot"}
        </button>
        <button type="button" className="jy-btn jy-btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState("loading");
  const [editingSlot, setEditingSlot] = useState(null);
  const [confirmSlot, setConfirmSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setStatus("loading");
    listSlotsAdmin()
      .then((data) => {
        setSlots(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(load, []);

  function handleSaved() {
    setEditingSlot(null);
    load();
  }

  async function confirmToggleActive() {
    setBusy(true);
    try {
      await setSlotActive(confirmSlot.id, !confirmSlot.active);
      showToast(`Slot ${confirmSlot.active ? "deactivated" : "activated"}.`, "success");
      setConfirmSlot(null);
      load();
    } catch (err) {
      showToast(err.message || "Could not update slot status.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await deleteSlot(deleteTarget.id);
      showToast("Slot deleted.", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.message || "Could not delete slot.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Class Slots</h1>
          <p className="jy-page-subtitle">Available date/time slots for trial &amp; class bookings</p>
        </div>
        {!editingSlot && (
          <button type="button" className="jy-btn jy-btn-gradient" onClick={() => setEditingSlot({ ...BLANK_SLOT })}>
            <i className="bi bi-plus-lg"></i> Create Slot
          </button>
        )}
      </div>

      {editingSlot && (
        <SlotForm initialSlot={editingSlot} onSaved={handleSaved} onCancel={() => setEditingSlot(null)} />
      )}

      {!editingSlot && (
        <div className="jy-card">
          {status === "loading" && <div className="jy-card-pad"><TableSkeleton rows={4} /></div>}
          {status === "error" && <ErrorState message="Unable to load slots." onRetry={load} />}
          {status === "success" && slots.length === 0 && (
            <EmptyState icon="bi-calendar-week" title="No slots yet" description="Create a slot so customers can pick a class time." />
          )}

          {status === "success" && slots.length > 0 && (
            <div className="jy-table-wrap">
              <table className="jy-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Label</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.id}>
                      <td>{slot.slotDate}</td>
                      <td>{slot.startTime}{slot.endTime ? ` – ${slot.endTime}` : ""}</td>
                      <td style={{ fontWeight: 600 }}>{slot.label || <span className="jy-cell-muted">—</span>}</td>
                      <td>{slot.capacity ?? <span className="jy-cell-muted">—</span>}</td>
                      <td><span className={`jy-badge ${slot.active ? "success" : "neutral"}`}>{slot.active ? "Active" : "Inactive"}</span></td>
                      <td className="d-flex gap-2">
                        <button className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => setEditingSlot(slot)}>
                          <i className="bi bi-pencil"></i> Edit
                        </button>
                        <button className="jy-btn jy-btn-outline jy-btn-sm" onClick={() => setConfirmSlot(slot)}>
                          {slot.active ? "Deactivate" : "Activate"}
                        </button>
                        <button className="jy-btn jy-btn-danger-outline jy-btn-sm" onClick={() => setDeleteTarget(slot)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmSlot)}
        title={confirmSlot?.active ? "Deactivate slot?" : "Activate slot?"}
        message={
          confirmSlot?.active
            ? "This slot will no longer be selectable by customers."
            : "This slot will become selectable by customers."
        }
        confirmLabel={confirmSlot?.active ? "Deactivate" : "Activate"}
        danger={confirmSlot?.active}
        busy={busy}
        onConfirm={confirmToggleActive}
        onCancel={() => setConfirmSlot(null)}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete slot?"
        message="This permanently removes the slot. This cannot be undone."
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
