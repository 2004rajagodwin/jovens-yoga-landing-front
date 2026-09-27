import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminPaginationControls from "../../components/admin/AdminPaginationControls.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import { TableSkeleton, EmptyState, ErrorState } from "../../components/admin/PageStates.jsx";
import { listTrials } from "../../services/adminApi.js";

const FILTER_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "AUTOPAY_ACTIVE", label: "AutoPay Active" },
  { value: "AUTOPAY_CANCELLED", label: "AutoPay Cancelled" },
  { value: "TRIAL_ACTIVE", label: "Trial Active" },
  { value: "TRIAL_EXPIRED", label: "Trial Expired" },
  { value: "PAYMENT_FAILED", label: "Payment Failed" },
  { value: "PAID_ACTIVE", label: "Paid / Active" },
];

export default function AdminTrialsPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0 });
  const [loadStatus, setLoadStatus] = useState("loading");

  function load() {
    setLoadStatus("loading");
    listTrials({ filter: filter === "ALL" ? undefined : filter, search, page, size: 20 })
      .then((res) => {
        setData(res);
        setLoadStatus("success");
      })
      .catch(() => setLoadStatus("error"));
  }

  useEffect(load, [filter, search, page]);

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Trials</h1>
          <p className="jy-page-subtitle">Free trial activations, AutoPay status, and direct payment recovery</p>
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
          value={filter}
          onChange={(e) => {
            setPage(0);
            setFilter(e.target.value);
          }}
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="jy-card">
        {loadStatus === "loading" && <div className="jy-card-pad"><TableSkeleton rows={8} /></div>}
        {loadStatus === "error" && <ErrorState message="Unable to load trials." onRetry={load} />}

        {loadStatus === "success" && data.content.length === 0 && (
          <EmptyState icon="bi-hourglass" title="No trials found" description="No trial records match the selected filter." />
        )}

        {loadStatus === "success" && data.content.length > 0 && (
          <>
            <div className="jy-table-wrap">
              <table className="jy-table">
                <thead>
                  <tr>
                    <th>User ID / Customer</th>
                    <th>Plan & Duration</th>
                    <th>Dates</th>
                    <th>AutoPay Status</th>
                    <th>Trial Status</th>
                    <th>Payment</th>
                    <th>Membership</th>
                    <th>Stripe Subscription</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((trial) => (
                    <tr key={trial.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {trial.customerName}{" "}
                          <span className="jy-cell-muted" style={{ fontWeight: "normal", fontSize: 12 }}>
                            (User #{trial.userId})
                          </span>
                        </div>
                        <div className="jy-cell-muted">{trial.email}</div>
                        {trial.mobileNumber && (
                          <div className="jy-cell-muted" style={{ fontSize: 11.5 }}>
                            {trial.mobileNumber}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{trial.planName}</div>
                        {trial.planDurationLabel && <div className="jy-cell-muted">{trial.planDurationLabel}</div>}
                      </td>
                      <td className="jy-cell-muted" style={{ fontSize: 12 }}>
                        <div>Start: {trial.trialStartDate ? new Date(trial.trialStartDate).toLocaleDateString() : "—"}</div>
                        <div>Expiry: {trial.trialExpiryDate ? new Date(trial.trialExpiryDate).toLocaleDateString() : "—"}</div>
                      </td>
                      <td>
                        {trial.autoPayCancelled ? (
                          <div>
                            <StatusBadge status="CANCELLED" />
                            {trial.autoPayCancelledAt && (
                              <div className="jy-cell-muted" style={{ fontSize: 11, marginTop: 2 }}>
                                {new Date(trial.autoPayCancelledAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <StatusBadge status={trial.autoPayStatus || "NONE"} />
                        )}
                      </td>
                      <td>
                        <StatusBadge status={trial.status} />
                      </td>
                      <td>
                        <StatusBadge status={trial.paymentStatus || "PENDING"} />
                      </td>
                      <td>
                        <StatusBadge status={trial.membershipStatus || "TRIAL"} />
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
