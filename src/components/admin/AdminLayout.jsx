import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { clearAdminSession, getAdminInfo } from "../../services/adminAuth.js";
import ToastHost from "./ToastHost.jsx";
import "../../styles/admin/admin.css";

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [{ to: "/admin/dashboard", label: "Dashboard", icon: "bi-speedometer2" }],
  },
  {
    title: "Management",
    items: [
      { to: "/admin/users", label: "Users", icon: "bi-people-fill" },
      { to: "/admin/referrals", label: "Refer a Friend", icon: "bi-gift-fill" },
      { to: "/admin/trials", label: "Trials", icon: "bi-hourglass-split" },
      { to: "/admin/plans", label: "Plans", icon: "bi-box-seam-fill" },
      { to: "/admin/slots", label: "Slots", icon: "bi-calendar-week" },
      { to: "/admin/orders", label: "Orders", icon: "bi-cart-check-fill" },
      { to: "/admin/payments", label: "Payments", icon: "bi-credit-card-fill" },
      { to: "/admin/notifications", label: "Notifications", icon: "bi-bell-fill" },
    ],
  },
];

function initialsFrom(name) {
  if (!name) return "A";
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = getAdminInfo();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    clearAdminSession();
    navigate("/admin/login");
  }

  return (
    <div className="jy-admin">
      <ToastHost />
      <div className="jy-shell">
        <div className={`jy-sidebar-overlay ${mobileOpen ? "jy-visible" : ""}`} onClick={() => setMobileOpen(false)} />

        <aside className={`jy-sidebar ${collapsed ? "jy-collapsed" : ""} ${mobileOpen ? "jy-mobile-open" : ""}`}>
          <div className="jy-brand">
            <img src="/images/jovens-logo.png" alt="Jovens Yoga" />
            <div className="jy-brand-text">
              <div className="jy-brand-title">Jovens Yoga</div>
              <div className="jy-brand-sub">Admin</div>
            </div>
          </div>

          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="jy-nav-group-title">{group.title}</div>
              <nav className="jy-nav">
                {group.items.map((item) => {
                  const active = location.pathname.startsWith(item.to);
                  return (
                    <Link key={item.to} to={item.to} className={`jy-nav-item ${active ? "active" : ""}`} title={item.label}>
                      <i className={`bi ${item.icon}`}></i>
                      <span className="jy-nav-label">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}

          <div className="jy-sidebar-footer">
            <button type="button" className="jy-logout-btn" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i>
              Logout
            </button>
          </div>
        </aside>

        <div className="jy-main">
          <header className="jy-topbar">
            <button
              type="button"
              className="jy-topbar-toggle"
              onClick={() => {
                if (window.innerWidth <= 991) {
                  setMobileOpen((v) => !v);
                } else {
                  setCollapsed((v) => !v);
                }
              }}
              aria-label="Toggle navigation"
              title="Toggle navigation"
            >
              <i className="bi bi-list" style={{ fontSize: 20 }}></i>
            </button>

            <div className="jy-topbar-search d-none d-md-block">
              <i className="bi bi-search"></i>
              <input type="text" placeholder="Search anything…" />
            </div>

            <div className="jy-topbar-right">
              <Link to="/admin/notifications" className="jy-icon-btn" title="Notifications">
                <i className="bi bi-bell"></i>
              </Link>

              <div className="jy-profile-menu" ref={profileRef} onClick={() => setProfileOpen((v) => !v)}>
                <div className="jy-avatar">{initialsFrom(admin?.username)}</div>
                <div className="d-none d-sm-block">
                  <div className="jy-profile-name">{admin?.username || "Admin"}</div>
                  <div className="jy-profile-role">{admin?.role === "ADMIN" ? "Administrator" : admin?.role || ""}</div>
                </div>
                <i className="bi bi-chevron-down" style={{ fontSize: 12, color: "var(--jy-muted)" }}></i>

                {profileOpen && (
                  <div className="jy-profile-dropdown jy-fade-in">
                    <button type="button" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right"></i>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="jy-content jy-fade-in">{children}</main>
        </div>
      </div>
    </div>
  );
}
