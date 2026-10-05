import { useEffect, useState } from "react";
import AdminPaginationControls from "./AdminPaginationControls.jsx";
import { ErrorState } from "./PageStates.jsx";
import { getReferralUsersAdmin } from "../../services/adminApi.js";

function renderTrialBadge(status) {
  if (!status) return <span className="jy-cell-muted">—</span>;
  switch (status) {
    case "TRIAL_ACTIVE":
      return (
        <span className="jy-badge success" style={{ whiteSpace: "nowrap" }}>
          <i className="bi bi-check-circle-fill"></i> Active
        </span>
      );
    case "TRIAL_PENDING_PAYMENT":
      return (
        <span className="jy-badge warning" style={{ whiteSpace: "nowrap" }}>
          <i className="bi bi-clock-fill"></i> Pending Payment
        </span>
      );
    case "TRIAL_EXPIRED":
      return (
        <span className="jy-badge neutral" style={{ whiteSpace: "nowrap" }}>
          <i className="bi bi-dash-circle"></i> Expired
        </span>
      );
    case "TRIAL_CANCELLED":
      return (
        <span className="jy-badge danger" style={{ whiteSpace: "nowrap" }}>
          <i className="bi bi-x-circle-fill"></i> Cancelled
        </span>
      );
    default:
      return (
        <span className="jy-badge neutral" style={{ whiteSpace: "nowrap" }}>
          {status}
        </span>
      );
  }
}

function renderPaymentBadge(status) {
  if (!status) {
    return (
      <span className="jy-badge info" style={{ whiteSpace: "nowrap" }}>
        Free Trial
      </span>
    );
  }
  const upper = String(status).toUpperCase();
  if (upper === "PAID" || upper === "ACTIVE" || upper === "COMPLETED") {
    return (
      <span className="jy-badge success" style={{ whiteSpace: "nowrap" }}>
        <i className="bi bi-check2"></i> Paid
      </span>
    );
  }
  if (upper === "FAILED") {
    return (
      <span className="jy-badge danger" style={{ whiteSpace: "nowrap" }}>
        <i className="bi bi-x"></i> Failed
      </span>
    );
  }
  if (upper === "PENDING" || upper === "UNPAID") {
    return (
      <span className="jy-badge warning" style={{ whiteSpace: "nowrap" }}>
        <i className="bi bi-hourglass-split"></i> Pending
      </span>
    );
  }
  return (
    <span className="jy-badge info" style={{ whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

export default function ReferredUsersModal({ referral, onClose }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Prevent background page scrolling & listen for Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Reset page when referral changes
  useEffect(() => {
    setPage(0);
  }, [referral?.id]);

  // Fetch referred users safely without duplicate/stale calls
  useEffect(() => {
    if (!referral?.id) return;
    let isCancelled = false;
    setLoading(true);
    setError(null);

    getReferralUsersAdmin(referral.id, { page, size: 10 })
      .then((res) => {
        if (!isCancelled) {
          setData(res || { content: [], totalElements: 0, totalPages: 0 });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err?.message || "Unable to load referred users.");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [referral?.id, page]);

  if (!referral) return null;

  function handleRetry() {
    setLoading(true);
    setError(null);
    getReferralUsersAdmin(referral.id, { page, size: 10 })
      .then((res) => {
        setData(res || { content: [], totalElements: 0, totalPages: 0 });
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Unable to load referred users.");
        setLoading(false);
      });
  }

  const totalReferrals = data.totalElements ?? referral.referralCount ?? 0;

  return (
    <div
      className="jy-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="referred-users-modal-title"
    >
      <div
        className="jy-modal"
        style={{ maxWidth: 1060 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="jy-modal-header">
          <div style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center gap-2">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#eaefff",
                  color: "var(--jy-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                <i className="bi bi-people-fill"></i>
              </div>
              <h2 id="referred-users-modal-title" className="jy-modal-title">
                Referred Users
              </h2>
            </div>

            <div className="jy-modal-subtitle">
              <span>
                Referral Person:{" "}
                <strong style={{ color: "var(--jy-text)", fontWeight: 600 }}>
                  {referral.referralPersonName}
                </strong>
              </span>
              <span style={{ color: "#c0c6d4" }}>•</span>
              <span>
                Code:{" "}
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    background: "#f0f4ff",
                    color: "var(--jy-primary)",
                    padding: "2px 7px",
                    borderRadius: 5,
                    fontSize: 12.5,
                  }}
                >
                  {referral.referralCode}
                </span>
              </span>
              <span style={{ color: "#c0c6d4" }}>•</span>
              <span>
                Total Referrals:{" "}
                <span
                  className="badge"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    background: totalReferrals > 0 ? "var(--jy-success-bg)" : "#f1f3f7",
                    color: totalReferrals > 0 ? "var(--jy-success)" : "var(--jy-muted)",
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  {totalReferrals}
                </span>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="jy-icon-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--jy-border)",
              background: "#f8f9fc",
              color: "var(--jy-text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="jy-modal-body">
          {/* Loading State */}
          {loading && (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 px-3 text-center">
              <div
                className="spinner-border text-primary mb-3"
                style={{ width: 36, height: 36 }}
                role="status"
              >
                <span className="visually-hidden">Loading...</span>
              </div>
              <p style={{ color: "var(--jy-muted)", fontSize: 13.5, margin: 0 }}>
                Loading referred users for <strong>{referral.referralPersonName}</strong>…
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-4">
              <ErrorState message={error} onRetry={handleRetry} />
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && data.content.length === 0 && (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 px-3 text-center">
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "#f0f4ff",
                  color: "var(--jy-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  marginBottom: 14,
                }}
              >
                <i className="bi bi-people"></i>
              </div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: "0 0 6px",
                  color: "var(--jy-text)",
                }}
              >
                No Referred Users Yet
              </h3>
              <p
                style={{
                  color: "var(--jy-muted)",
                  fontSize: 13.5,
                  maxWidth: 380,
                  margin: "0 auto",
                }}
              >
                No users have completed registration through{" "}
                <strong>{referral.referralPersonName}</strong>'s referral link yet.
              </p>
            </div>
          )}

          {/* Table of Referred Users */}
          {!loading && !error && data.content.length > 0 && (
            <div className="jy-modal-table-wrap">
              <table className="jy-modal-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Country</th>
                    <th>Plan</th>
                    <th>Trial Status</th>
                    <th>Registered Date</th>
                    <th style={{ textAlign: "center" }}>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((u) => {
                    const fullName =
                      [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                    const initial = (u.firstName || u.email || "U").charAt(0).toUpperCase();

                    return (
                      <tr key={u.id || u.userId}>
                        {/* User Name */}
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                background: "#eaefff",
                                color: "var(--jy-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: 12,
                                flexShrink: 0,
                              }}
                            >
                              {initial}
                            </div>
                            <span style={{ fontWeight: 600 }}>{fullName}</span>
                          </div>
                        </td>

                        {/* Email */}
                        <td>
                          <span style={{ color: "var(--jy-text)" }}>{u.email || "—"}</span>
                        </td>

                        {/* Mobile */}
                        <td>
                          {u.mobileNumber ? (
                            <span style={{ fontFamily: "monospace", fontSize: 12.5 }}>
                              {u.countryPhoneCode ? `${u.countryPhoneCode} ` : ""}
                              {u.mobileNumber}
                            </span>
                          ) : (
                            <span className="jy-cell-muted">—</span>
                          )}
                        </td>

                        {/* Country */}
                        <td>
                          {u.countryRegion ? (
                            <span style={{ fontWeight: 500 }}>{u.countryRegion}</span>
                          ) : (
                            <span className="jy-cell-muted">—</span>
                          )}
                        </td>

                        {/* Plan */}
                        <td>
                          {u.planName ? (
                            <span className="jy-badge primary">{u.planName}</span>
                          ) : (
                            <span className="jy-cell-muted">—</span>
                          )}
                        </td>

                        {/* Trial Status */}
                        <td>{renderTrialBadge(u.trialStatus)}</td>

                        {/* Registered Date */}
                        <td className="jy-cell-muted">
                          {u.registeredAt
                            ? new Date(u.registeredAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>

                        {/* Payment Status */}
                        <td style={{ textAlign: "center" }}>
                          {renderPaymentBadge(u.paymentStatus)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="jy-modal-footer">
          <div>
            {!loading && !error && data.totalPages > 1 && (
              <AdminPaginationControls
                page={page}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            )}
            {!loading && !error && data.totalPages <= 1 && data.content.length > 0 && (
              <span className="jy-cell-muted" style={{ fontSize: 12.5 }}>
                Showing {data.content.length} of {totalReferrals} referred user
                {totalReferrals === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <button
            type="button"
            className="jy-btn jy-btn-outline"
            onClick={onClose}
            style={{ minWidth: 90 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
