import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminPaginationControls from "../../components/admin/AdminPaginationControls.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import { TableSkeleton, EmptyState, ErrorState } from "../../components/admin/PageStates.jsx";
import { listPayments } from "../../services/adminApi.js";

const STATUSES = ["", "PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"];

export default function AdminPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0 });
  const [loadStatus, setLoadStatus] = useState("loading");

  function load() {
    setLoadStatus("loading");
    listPayments({ status: statusFilter || undefined, page, size: 20 })
      .then((res) => {
        setData(res);
        setLoadStatus("success");
      })
      .catch(() => setLoadStatus("error"));
  }

  useEffect(load, [statusFilter, page]);

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Payments</h1>
          <p className="jy-page-subtitle">Stripe payment records for all orders</p>
        </div>
      </div>

      <div className="jy-toolbar">
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
        {loadStatus === "error" && <ErrorState message="Unable to load payments." onRetry={load} />}

        {loadStatus === "success" && data.content.length === 0 && (
          <EmptyState icon="bi-credit-card" title="No payments yet" description="Payment records appear here once Stripe confirms a transaction." />
        )}

        {loadStatus === "success" && data.content.length > 0 && (
          <>
            <div className="jy-table-wrap">
              <table className="jy-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Source</th>
                    <th>Customer</th>
                    <th>Stripe Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid At</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((payment) => (
                    <tr key={payment.id}>
                      <td className="jy-cell-muted" style={{ fontFamily: "monospace" }}>
                        {payment.orderNumber || `Trial #${payment.trialId}`}
                      </td>
                      <td>
                        <span className={`jy-badge ${payment.source === "TRIAL" ? "info" : "neutral"}`}>
                          {payment.source}
                        </span>
                      </td>
                      <td>{payment.customerName}</td>
                      <td className="jy-cell-muted" style={{ fontFamily: "monospace", fontSize: 11.5 }}>
                        {payment.stripeCheckoutSessionId || payment.stripePaymentIntentId || "—"}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {payment.currency} {payment.amount}
                      </td>
                      <td>
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="jy-cell-muted">{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : "—"}</td>
                      <td className="jy-cell-muted">{new Date(payment.createdAt).toLocaleString()}</td>
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
