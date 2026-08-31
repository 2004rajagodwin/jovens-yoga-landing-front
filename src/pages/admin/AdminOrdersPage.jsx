import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminPaginationControls from "../../components/admin/AdminPaginationControls.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import { TableSkeleton, EmptyState, ErrorState } from "../../components/admin/PageStates.jsx";
import { listOrders } from "../../services/adminApi.js";

const STATUSES = ["", "PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"];

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0 });
  const [loadStatus, setLoadStatus] = useState("loading");

  function load() {
    setLoadStatus("loading");
    listOrders({ status: statusFilter || undefined, search, page, size: 20 })
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
          <h1 className="jy-page-title">Orders</h1>
          <p className="jy-page-subtitle">All Standard &amp; Premium purchase orders</p>
        </div>
      </div>

      <div className="jy-toolbar">
        <div className="jy-topbar-search" style={{ maxWidth: 300 }}>
          <i className="bi bi-search"></i>
          <input
            className="jy-input"
            style={{ width: "100%", paddingLeft: 38 }}
            placeholder="Search by order #, name, or email…"
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
        {loadStatus === "error" && <ErrorState message="Unable to load orders." onRetry={load} />}

        {loadStatus === "success" && data.content.length === 0 && (
          <EmptyState icon="bi-cart-x" title="No orders yet" description="Orders will appear here after customers complete a purchase." />
        )}

        {loadStatus === "success" && data.content.length > 0 && (
          <>
            <div className="jy-table-wrap">
              <table className="jy-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Duration</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((order) => (
                    <tr key={order.orderNumber}>
                      <td className="jy-cell-muted" style={{ fontFamily: "monospace" }}>
                        {order.orderNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                        <div className="jy-cell-muted">{order.email}</div>
                      </td>
                      <td>{order.planName}</td>
                      <td>{order.durationLabel}</td>
                      <td style={{ fontWeight: 600 }}>
                        {order.currency} {order.amount}
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="jy-cell-muted">{new Date(order.createdAt).toLocaleString()}</td>
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
