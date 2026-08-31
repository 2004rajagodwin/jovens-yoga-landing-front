import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import { KpiSkeleton, TableSkeleton, EmptyState, ErrorState } from "../../components/admin/PageStates.jsx";
import { getDashboard, listOrders, listUsers } from "../../services/adminApi.js";
import { getAdminInfo } from "../../services/adminAuth.js";

const KPI_DEFS = [
  { key: "totalUsers", label: "Total Users", icon: "bi-people-fill", color: "blue" },
  { key: "activeTrials", label: "Active Trials", icon: "bi-hourglass-split", color: "green" },
  { key: "expiredTrials", label: "Expired Trials", icon: "bi-hourglass-bottom", color: "orange" },
  { key: "freeRegistrations", label: "Free Registrations", icon: "bi-person-plus-fill", color: "teal" },
  { key: "paidOrders", label: "Paid Orders", icon: "bi-cart-check-fill", color: "purple" },
  { key: "successfulPayments", label: "Successful Payments", icon: "bi-credit-card-fill", color: "indigo" },
  { key: "pendingPayments", label: "Pending Payments", icon: "bi-clock-fill", color: "orange" },
  { key: "failedPayments", label: "Failed Payments", icon: "bi-x-circle-fill", color: "red" },
];

const QUICK_ACTIONS = [
  { to: "/admin/plans", label: "Manage Plans", icon: "bi-box-seam-fill" },
  { to: "/admin/users", label: "Manage Users", icon: "bi-people-fill" },
  { to: "/admin/orders", label: "View Orders", icon: "bi-cart-check-fill" },
  { to: "/admin/payments", label: "Check Payments", icon: "bi-credit-card-fill" },
  { to: "/admin/trials", label: "Trial List", icon: "bi-hourglass-split" },
  { to: "/admin/notifications", label: "Notifications", icon: "bi-bell-fill" },
];

export default function AdminDashboardPage() {
  const admin = getAdminInfo();
  const [stats, setStats] = useState(null);
  const [statsStatus, setStatsStatus] = useState("loading");

  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState("loading");

  const [recentUsers, setRecentUsers] = useState([]);
  const [usersStatus, setUsersStatus] = useState("loading");

  function loadStats() {
    setStatsStatus("loading");
    getDashboard()
      .then((data) => {
        setStats(data);
        setStatsStatus("success");
      })
      .catch(() => setStatsStatus("error"));
  }

  function loadOrders() {
    setOrdersStatus("loading");
    listOrders({ page: 0, size: 5 })
      .then((res) => {
        setRecentOrders(res.content);
        setOrdersStatus("success");
      })
      .catch(() => setOrdersStatus("error"));
  }

  function loadUsers() {
    setUsersStatus("loading");
    listUsers({ page: 0, size: 5 })
      .then((res) => {
        setRecentUsers(res.content);
        setUsersStatus("success");
      })
      .catch(() => setUsersStatus("error"));
  }

  useEffect(() => {
    loadStats();
    loadOrders();
    loadUsers();
  }, []);

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Dashboard Overview</h1>
          <p className="jy-page-subtitle">Welcome back, {admin?.username || "Admin"}</p>
        </div>
      </div>

      {statsStatus === "loading" && <KpiSkeleton count={8} />}
      {statsStatus === "error" && (
        <div className="jy-card mb-4">
          <ErrorState message="Unable to load dashboard data." onRetry={loadStats} />
        </div>
      )}
      {statsStatus === "success" && (
        <div className="jy-kpi-grid">
          {KPI_DEFS.map((kpi) => (
            <div className="jy-card jy-kpi-card" key={kpi.key}>
              <div>
                <p className="jy-kpi-title">{kpi.label}</p>
                <p className="jy-kpi-value">{stats[kpi.key]}</p>
              </div>
              <div className={`jy-kpi-icon ${kpi.color}`}>
                <i className={`bi ${kpi.icon}`}></i>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 mb-1">
        <div className="col-lg-8">
          <div className="jy-card jy-card-pad mb-3" style={{ minHeight: 260 }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Sales Overview</h2>
            </div>
            <EmptyState
              icon="bi-bar-chart-line"
              title="Analytics coming soon"
              description="Chart data isn't available from the backend yet — this section will populate once a historical analytics API is added."
            />
          </div>

          <div className="jy-card jy-card-pad">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Latest Orders</h2>
              <Link to="/admin/orders" className="jy-cell-muted" style={{ fontWeight: 600 }}>
                View All <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            {ordersStatus === "loading" && <TableSkeleton rows={4} />}
            {ordersStatus === "error" && <ErrorState message="Unable to load recent orders." onRetry={loadOrders} />}
            {ordersStatus === "success" && recentOrders.length === 0 && (
              <EmptyState icon="bi-cart-x" title="No orders yet" description="Orders will appear here after customers complete a purchase." />
            )}
            {ordersStatus === "success" && recentOrders.length > 0 && (
              <div className="jy-table-wrap">
                <table className="jy-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.orderNumber}>
                        <td className="jy-cell-muted" style={{ fontFamily: "monospace" }}>
                          {o.orderNumber.slice(0, 8)}…
                        </td>
                        <td>{o.customerName}</td>
                        <td>
                          {o.planName} · {o.durationLabel}
                        </td>
                        <td>
                          {o.currency} {o.amount}
                        </td>
                        <td>
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="jy-cell-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-4">
          <div className="jy-card jy-card-pad mb-3">
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Quick Actions</h2>
            <div className="jy-quick-actions">
              {QUICK_ACTIONS.map((action) => (
                <Link key={action.to} to={action.to} className="jy-quick-action">
                  <i className={`bi ${action.icon}`}></i>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="jy-card jy-card-pad">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Recent Users</h2>
              <Link to="/admin/users" className="jy-cell-muted" style={{ fontWeight: 600 }}>
                View All
              </Link>
            </div>

            {usersStatus === "loading" && <TableSkeleton rows={4} />}
            {usersStatus === "error" && <ErrorState message="Unable to load recent users." onRetry={loadUsers} />}
            {usersStatus === "success" && recentUsers.length === 0 && (
              <EmptyState icon="bi-person-x" title="No users yet" description="Registered customers will appear here." />
            )}
            {usersStatus === "success" &&
              recentUsers.map((u) => (
                <div key={u.id} className="d-flex align-items-center justify-content-between py-2" style={{ borderBottom: "1px solid var(--jy-border)" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {u.firstName} {u.lastName}
                    </div>
                    <div className="jy-cell-muted">{u.email}</div>
                  </div>
                  {u.trialStatus && <StatusBadge status={u.trialStatus} />}
                </div>
              ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
