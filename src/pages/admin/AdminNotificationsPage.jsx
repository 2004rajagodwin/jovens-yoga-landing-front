import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminPaginationControls from "../../components/admin/AdminPaginationControls.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import { TableSkeleton, EmptyState, ErrorState } from "../../components/admin/PageStates.jsx";
import { showToast } from "../../components/admin/toast.js";
import { listNotifications, retryNotification } from "../../services/adminApi.js";

const STATUSES = ["", "PENDING", "SENT", "FAILED"];
const CHANNELS = ["", "EMAIL", "WHATSAPP"];

export default function AdminNotificationsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0 });
  const [loadStatus, setLoadStatus] = useState("loading");
  const [retryingId, setRetryingId] = useState(null);

  function load() {
    setLoadStatus("loading");
    listNotifications({ status: statusFilter || undefined, channel: channelFilter || undefined, page, size: 20 })
      .then((res) => {
        setData(res);
        setLoadStatus("success");
      })
      .catch(() => setLoadStatus("error"));
  }

  useEffect(load, [statusFilter, channelFilter, page]);

  async function handleRetry(id) {
    setRetryingId(id);
    try {
      await retryNotification(id);
      showToast("Notification retry attempted.", "success");
      load();
    } catch (err) {
      showToast(err.message || "Retry failed.", "error");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Notifications</h1>
          <p className="jy-page-subtitle">Email &amp; WhatsApp delivery records</p>
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
        <select
          className="jy-select"
          value={channelFilter}
          onChange={(e) => {
            setPage(0);
            setChannelFilter(e.target.value);
          }}
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c || "All channels"}
            </option>
          ))}
        </select>
      </div>

      <div className="jy-card">
        {loadStatus === "loading" && <div className="jy-card-pad"><TableSkeleton rows={8} /></div>}
        {loadStatus === "error" && <ErrorState message="Unable to load notifications." onRetry={load} />}

        {loadStatus === "success" && data.content.length === 0 && (
          <EmptyState icon="bi-bell-slash" title="No notifications yet" description="Trial and payment notification events will appear here." />
        )}

        {loadStatus === "success" && data.content.length > 0 && (
          <>
            <div className="jy-table-wrap">
              <table className="jy-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Failure Reason</th>
                    <th>Sent At</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((n) => (
                    <tr key={n.id}>
                      <td>{n.customerName || <span className="jy-cell-muted">—</span>}</td>
                      <td>{n.type}</td>
                      <td>
                        <span className="jy-badge neutral">{n.channel}</span>
                      </td>
                      <td>
                        <StatusBadge status={n.status} />
                      </td>
                      <td className="jy-cell-muted" style={{ maxWidth: 220 }}>
                        {n.failureReason || "—"}
                      </td>
                      <td className="jy-cell-muted">{n.sentAt ? new Date(n.sentAt).toLocaleString() : "—"}</td>
                      <td>
                        {n.status === "FAILED" && n.channel === "EMAIL" && (
                          <button
                            type="button"
                            className="jy-btn jy-btn-outline jy-btn-sm"
                            disabled={retryingId === n.id}
                            onClick={() => handleRetry(n.id)}
                          >
                            <i className="bi bi-arrow-clockwise"></i>
                            {retryingId === n.id ? "Retrying…" : "Retry"}
                          </button>
                        )}
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
