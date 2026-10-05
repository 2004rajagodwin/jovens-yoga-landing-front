import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import AdminPaginationControls from "../../components/admin/AdminPaginationControls.jsx";
import StatusBadge from "../../components/admin/StatusBadge.jsx";
import { TableSkeleton, EmptyState, ErrorState, KpiSkeleton } from "../../components/admin/PageStates.jsx";
import ShareReferralModal from "../../components/admin/ShareReferralModal.jsx";
import ReferredUsersModal from "../../components/admin/ReferredUsersModal.jsx";
import { showToast } from "../../components/admin/toast.js";
import {
  listReferralsAdmin,
  createReferralAdmin,
  updateReferralStatusAdmin,
  getReferralStatsAdmin,
} from "../../services/adminApi.js";

const EMPTY_FORM = {
  referralPersonName: "",
  email: "",
  mobile: "",
};

export default function AdminReferralsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Create form state
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [justGenerated, setJustGenerated] = useState(null);
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  // Modals state
  const [sharingReferral, setSharingReferral] = useState(null);
  const [viewingUsersReferral, setViewingUsersReferral] = useState(null);

  function loadStats() {
    setStatsLoading(true);
    getReferralStatsAdmin()
      .then((res) => {
        setStats(res);
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  }

  function loadList() {
    setLoading(true);
    setHasError(false);
    listReferralsAdmin({
      search,
      status: statusFilter || undefined,
      page,
      size: 15,
    })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setHasError(true);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadList();
  }, [search, statusFilter, page]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError("");
  }

  async function handleCreateReferral(e) {
    e.preventDefault();
    if (!formData.referralPersonName?.trim()) {
      setFormError("Referral person name is required.");
      return;
    }

    setFormSubmitting(true);
    setFormError("");

    try {
      const created = await createReferralAdmin({
        referralPersonName: formData.referralPersonName.trim(),
        email: formData.email?.trim() || null,
        mobile: formData.mobile?.trim() || null,
      });

      setJustGenerated(created);
      setFormData(EMPTY_FORM);
      showToast(`Referral link generated for ${created.referralPersonName}!`, "success");
      loadStats();
      loadList();
    } catch (err) {
      setFormError(err?.message || "Failed to generate referral link. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleToggleStatus(referral) {
    const newStatus = referral.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      await updateReferralStatusAdmin(referral.id, newStatus);
      showToast(
        `Referral ${referral.referralCode} marked as ${newStatus.toLowerCase()}.`,
        "success"
      );
      loadList();
      loadStats();
    } catch (err) {
      showToast(err?.message || "Could not update status.", "error");
    }
  }

  function copyToClipboard(url, name) {
    navigator.clipboard.writeText(url).then(
      () => showToast(`Referral link copied for ${name}!`, "success"),
      () => showToast("Failed to copy link.", "error")
    );
  }

  return (
    <AdminLayout>
      <div className="jy-page-header">
        <div>
          <h1 className="jy-page-title">Refer a Friend</h1>
          <p className="jy-page-subtitle">
            Generate and manage referral links, share with members, and track customer attributions
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {statsLoading ? (
        <KpiSkeleton count={3} />
      ) : stats ? (
        <div className="jy-kpi-grid mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="jy-card jy-kpi-card">
            <div>
              <p className="jy-kpi-title">Total Referrals Created</p>
              <p className="jy-kpi-value">{stats.totalReferrals}</p>
            </div>
            <div className="jy-kpi-icon blue">
              <i className="bi bi-gift-fill"></i>
            </div>
          </div>

          <div className="jy-card jy-kpi-card">
            <div>
              <p className="jy-kpi-title">Active Referral Codes</p>
              <p className="jy-kpi-value">{stats.activeReferrals}</p>
            </div>
            <div className="jy-kpi-icon green">
              <i className="bi bi-check-circle-fill"></i>
            </div>
          </div>

          <div className="jy-card jy-kpi-card">
            <div>
              <p className="jy-kpi-title">Successful Free Trial Attributions</p>
              <p className="jy-kpi-value">{stats.totalAttributions}</p>
            </div>
            <div className="jy-kpi-icon purple">
              <i className="bi bi-people-fill"></i>
            </div>
          </div>
        </div>
      ) : null}

      {/* Create Referral Form Card */}
      <div className="jy-card jy-card-pad mb-4">
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
          <i className="bi bi-plus-circle me-2 text-primary"></i>
          Create a New Referral
        </h2>

        <form onSubmit={handleCreateReferral}>
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="jy-label" htmlFor="ref-name">
                Referral Person Name <span className="text-danger">*</span>
              </label>
              <input
                id="ref-name"
                name="referralPersonName"
                type="text"
                className="jy-input"
                placeholder="e.g. Godwin"
                value={formData.referralPersonName}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="jy-label" htmlFor="ref-email">
                Email Address <span className="text-muted">(Optional)</span>
              </label>
              <input
                id="ref-email"
                name="email"
                type="email"
                className="jy-input"
                placeholder="e.g. godwin@example.com"
                value={formData.email}
                onChange={handleFormChange}
              />
            </div>

            <div className="col-md-3">
              <label className="jy-label" htmlFor="ref-mobile">
                Mobile Number <span className="text-muted">(Optional)</span>
              </label>
              <input
                id="ref-mobile"
                name="mobile"
                type="tel"
                className="jy-input"
                placeholder="e.g. 9876543210"
                value={formData.mobile}
                onChange={handleFormChange}
              />
            </div>

            <div className="col-md-2">
              <button
                type="submit"
                className="jy-btn jy-btn-primary w-100"
                disabled={formSubmitting}
                style={{ height: 42 }}
              >
                {formSubmitting ? (
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                ) : (
                  <i className="bi bi-link-45deg me-1"></i>
                )}
                Generate Link
              </button>
            </div>
          </div>

          {formError && (
            <div className="alert alert-danger mt-3 mb-0 py-2 px-3" style={{ fontSize: 13.5 }}>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {formError}
            </div>
          )}
        </form>

        {/* Just Generated Banner */}
        {justGenerated && (
          <div
            className="mt-3 p-3 rounded"
            style={{
              background: "#eafaf1",
              border: "1px solid #c2eed5",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: "#166534", fontSize: 14 }}>
                <i className="bi bi-check2-circle me-1"></i> Referral Link Ready for {justGenerated.referralPersonName}!
              </div>
              <div className="mt-1" style={{ fontSize: 13, color: "#14532d" }}>
                Code: <strong style={{ fontFamily: "monospace" }}>{justGenerated.referralCode}</strong> •{" "}
                <span style={{ fontFamily: "monospace" }}>{justGenerated.referralLink}</span>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className={`jy-btn ${copiedGenerated ? "jy-btn-success" : "jy-btn-primary"}`}
                onClick={() => {
                  navigator.clipboard.writeText(justGenerated.referralLink).then(() => {
                    setCopiedGenerated(true);
                    showToast("Referral link copied!", "success");
                    setTimeout(() => setCopiedGenerated(false), 2000);
                  });
                }}
              >
                <i className={`bi ${copiedGenerated ? "bi-check2" : "bi-clipboard"} me-1`}></i>
                {copiedGenerated ? "Copied" : "Copy Link"}
              </button>

              <button
                type="button"
                className="jy-btn jy-btn-outline"
                onClick={() => setSharingReferral(justGenerated)}
              >
                <i className="bi bi-share me-1"></i>
                Share Link
              </button>

              <button
                type="button"
                className="jy-icon-btn"
                onClick={() => setJustGenerated(null)}
                title="Dismiss"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Referral Records Table */}
      <div className="jy-toolbar d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
        <div className="jy-topbar-search" style={{ maxWidth: 360, flex: 1 }}>
          <i className="bi bi-search"></i>
          <input
            className="jy-input"
            style={{ width: "100%", paddingLeft: 38 }}
            placeholder="Search by name, code, email, mobile…"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
          />
        </div>

        <div className="d-flex gap-2 align-items-center">
          <select
            className="jy-select"
            value={statusFilter}
            onChange={(e) => {
              setPage(0);
              setStatusFilter(e.target.value);
            }}
            style={{ minWidth: 140 }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      <div className="jy-card">
        {loading && (
          <div className="jy-card-pad">
            <TableSkeleton rows={6} />
          </div>
        )}

        {hasError && <ErrorState message="Unable to load referrals." onRetry={loadList} />}

        {!loading && !hasError && data.content.length === 0 && (
          <EmptyState
            icon="bi-gift"
            title="No referral links found"
            description="Generate a referral link above to start tracking referrals."
          />
        )}

        {!loading && !hasError && data.content.length > 0 && (
          <>
            <div className="jy-table-wrap">
              <table className="jy-table">
                <thead>
                  <tr>
                    <th>Referral Person</th>
                    <th>Referral Code</th>
                    <th>Referral Count</th>
                    <th>Created Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((r) => {
                    const isRowActive = r.status === "ACTIVE";
                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.referralPersonName}</div>
                          {(r.email || r.mobile) && (
                            <div className="jy-cell-muted" style={{ fontSize: 12 }}>
                              {r.email} {r.email && r.mobile ? "•" : ""} {r.mobile}
                            </div>
                          )}
                        </td>

                        <td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: 13,
                              background: "#f0f4ff",
                              color: "var(--jy-primary)",
                              padding: "4px 8px",
                              borderRadius: 6,
                              display: "inline-block",
                            }}
                          >
                            {r.referralCode}
                          </span>
                        </td>

                        <td>
                          <span
                            className="badge"
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              padding: "5px 10px",
                              borderRadius: 8,
                              background: r.referralCount > 0 ? "var(--jy-success-bg)" : "#f1f3f7",
                              color: r.referralCount > 0 ? "var(--jy-success)" : "var(--jy-muted)",
                            }}
                          >
                            <i className="bi bi-people-fill me-1"></i>
                            {r.referralCount}
                          </span>
                        </td>

                        <td className="jy-cell-muted">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                        </td>

                        <td>
                          <StatusBadge status={r.status} />
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div className="d-inline-flex gap-1">
                            {/* Copy Link */}
                            <button
                              type="button"
                              className="jy-icon-btn"
                              title="Copy Referral Link"
                              onClick={() => copyToClipboard(r.referralLink, r.referralPersonName)}
                            >
                              <i className="bi bi-clipboard"></i>
                            </button>

                            {/* Share Link */}
                            <button
                              type="button"
                              className="jy-icon-btn"
                              title="Share Link"
                              onClick={() => setSharingReferral(r)}
                            >
                              <i className="bi bi-share"></i>
                            </button>

                            {/* View Referred Users */}
                            <button
                              type="button"
                              className="jy-btn jy-btn-outline"
                              style={{ padding: "4px 10px", fontSize: 12.5 }}
                              onClick={() => setViewingUsersReferral(r)}
                              title="View Referred Users"
                            >
                              <i className="bi bi-people me-1"></i>
                              View ({r.referralCount})
                            </button>

                            {/* Enable/Disable status toggle */}
                            <button
                              type="button"
                              className="jy-btn"
                              style={{
                                padding: "4px 10px",
                                fontSize: 12.5,
                                background: isRowActive ? "var(--jy-danger-bg)" : "var(--jy-success-bg)",
                                color: isRowActive ? "var(--jy-danger)" : "var(--jy-success)",
                                border: "none",
                              }}
                              onClick={() => handleToggleStatus(r)}
                              title={isRowActive ? "Disable this referral" : "Enable this referral"}
                            >
                              {isRowActive ? "Disable" : "Enable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-3 pb-3">
              <AdminPaginationControls page={page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Share Referral Modal */}
      {sharingReferral && (
        <ShareReferralModal referral={sharingReferral} onClose={() => setSharingReferral(null)} />
      )}

      {/* View Referred Users Modal */}
      {viewingUsersReferral && (
        <ReferredUsersModal referral={viewingUsersReferral} onClose={() => setViewingUsersReferral(null)} />
      )}
    </AdminLayout>
  );
}
