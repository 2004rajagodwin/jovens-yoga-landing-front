import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminPaginationControls from "../../components/admin/AdminPaginationControls.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import { TableSkeleton, EmptyState, ErrorState } from "../../components/admin/PageStates.jsx";
import { listUsers } from "../../services/adminApi.js";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0 });
  const [status, setStatus] = useState("loading");

  function load() {
    setStatus("loading");
    listUsers({ search, page, size: 20 })
      .then((res) => {
        setData(res);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(load, [search, page]);

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Users</h1>
          <p className="jy-page-subtitle">Manage registered Jovens Yoga customers</p>
        </div>
      </div>

      <div className="jy-toolbar">
        <div className="jy-topbar-search" style={{ maxWidth: 320 }}>
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
      </div>

      <div className="jy-card">
        {status === "loading" && <div className="jy-card-pad"><TableSkeleton rows={8} /></div>}
        {status === "error" && <ErrorState message="Unable to load users." onRetry={load} />}

        {status === "success" && data.content.length === 0 && (
          <EmptyState icon="bi-people" title="No users found" description="Registered customers will appear here." />
        )}

        {status === "success" && data.content.length > 0 && (
          <>
            <div className="jy-table-wrap">
              <table className="jy-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Trial Status</th>
                    <th>Current Plan</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600 }}>
                        {user.firstName} {user.lastName}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        {user.countryPhoneCode} {user.mobileNumber}
                      </td>
                      <td>{user.trialStatus ? <StatusBadge status={user.trialStatus} /> : <span className="jy-cell-muted">—</span>}</td>
                      <td>{user.currentPlan || <span className="jy-cell-muted">—</span>}</td>
                      <td className="jy-cell-muted">{new Date(user.registeredAt).toLocaleDateString()}</td>
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
