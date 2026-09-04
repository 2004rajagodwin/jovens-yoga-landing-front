import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminPaginationControls from "../../components/admin/AdminPaginationControls.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import { TableSkeleton, EmptyState, ErrorState } from "../../components/admin/PageStates.jsx";
import { listTrials } from "../../services/adminApi.js";

const STATUSES = ["", "TRIAL_PENDING_PAYMENT", "TRIAL_ACTIVE", "TRIAL_EXPIRED", "PAYMENT_FAILED", "CANCELLED"];

export default function AdminTrialsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0 });
  const [loadStatus, setLoadStatus] = useState("loading");

  function load() {
    setLoadStatus("loading");
    listTrials({ status: statusFilter || undefined, search, page, size: 20 })
      .then((res) => {
        setData(res);
        setLoadStatus("success");
      })
      .catch(() => setLoadStatus("error"));
  }

  useEffect(load, [statusFilter, search, page]);

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Trials</h1>
          <p className="jy-page-subtitle">Free trial activations and their status</p>
        </div>
      </div>

      <div className="jy-toolbar">
        <div className="jy-topbar-search" style={{ maxWidth: 300 }}>
          <i className="bi bi-search"></i>
          <input
            className="jy-input"
            style={{ width: "100%", paddingLeft: 38 }}
            placeholder="Search by name, email, or mobile…"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
          />
        </div>
        <select
          className="jy-select"
          value={statusFilter}
          onChange={(e) => {
            setPage(0);
            setStatusFilter(e.target.value);
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>

      <div className="jy-card">
        {loadStatus === "loading" && <div className="jy-card-pad"><TableSkeleton rows={8} /></div>}
        {loadStatus === "error" && <ErrorState message="Unable to load trials." onRetry={load} />}

        {loadStatus === "success" && data.content.length === 0 && (
          <EmptyState icon="bi-hourglass" title="No trials yet" description="Free trial activations will appear here." />
        )}

        {loadStatus === "success" && data.content.length > 0 && (
          <>
            <div className="jy-table-wrap">
              <table className="jy-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Slot</th>
                    <th>Start</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Last Reminder Day</th>
                    <th>Stripe Customer</th>
                    <th>Stripe Subscription</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((trial) => (
                    <tr key={trial.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{trial.customerName}</div>
                        <div className="jy-cell-muted">{trial.email}</div>
                      </td>
                      <td>
                        {trial.planName}
                        {trial.planDurationLabel && <div className="jy-cell-muted">{trial.planDurationLabel}</div>}
                      </td>
                      <td className="jy-cell-muted">
                        {trial.slotDate ? `${trial.slotLabel ? trial.slotLabel + " — " : ""}${new Date(trial.slotDate).toLocaleDateString()}` : "—"}
                      </td>
                      <td className="jy-cell-muted">{trial.trialStartDate ? new Date(trial.trialStartDate).toLocaleDateString() : "—"}</td>
                      <td className="jy-cell-muted">{trial.trialExpiryDate ? new Date(trial.trialExpiryDate).toLocaleDateString() : "—"}</td>
                      <td>
                        <StatusBadge status={trial.status} />
                      </td>
                      <td className="jy-cell-muted">{trial.lastReminderDayIndex}</td>
                      <td className="jy-cell-muted" style={{ fontFamily: "monospace", fontSize: 11.5 }}>
                        {trial.stripeCustomerId || "—"}
                      </td>
                      <td className="jy-cell-muted" style={{ fontFamily: "monospace", fontSize: 11.5 }}>
                        {trial.stripeSubscriptionId || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 pb-3">
              <AdminPaginationControls page={page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
