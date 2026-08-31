import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../services/adminApi.js";
import { setAdminSession } from "../../services/adminAuth.js";
import ToastHost from "../../components/admin/ToastHost.jsx";
import { showToast } from "../../components/admin/toast.js";
import "../../styles/admin/login.css";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const data = await adminLogin(username, password);
      setAdminSession(data.token, { username: data.username, name: data.name, role: data.role });
      navigate("/admin/dashboard");
    } catch (err) {
      const message = err.message || "Invalid username or password.";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="jy-login-page">
      <ToastHost />
      <div className="jy-login-visual">
        <div className="jy-login-shape" style={{ width: 280, height: 280, top: -80, right: -60 }} />
        <div className="jy-login-shape" style={{ width: 180, height: 180, bottom: 40, left: -60 }} />
        <img className="jy-login-bg" src="/images/yoga-girl.png" alt="" aria-hidden="true" />

        <div className="jy-login-brand">
          <img src="/images/jovens-logo.png" alt="Jovens Yoga" />
          <div>
            <div className="jy-login-brand-title">Jovens Yoga</div>
            <div className="jy-login-brand-sub">Admin Portal</div>
          </div>
        </div>

        <div className="jy-login-headline">
          <h1>Welcome Back</h1>
          <p>Manage plans, trials, orders, payments and your entire yoga platform with confidence — all from one place.</p>
        </div>

        <div className="jy-login-foot">© {new Date().getFullYear()} Jovens Yoga. All rights reserved.</div>
      </div>

      <div className="jy-login-panel">
        <form className="jy-login-card jy-fade-in" onSubmit={handleSubmit}>
          <div className="jy-login-card-icon">
            <i className="bi bi-shield-lock-fill"></i>
          </div>
          <h2 className="jy-login-title">Welcome Back!</h2>
          <p className="jy-login-subtitle">Sign in to your admin account</p>

          {errorMessage && (
            <div className="jy-login-error">
              <i className="bi bi-exclamation-circle-fill"></i>
              {errorMessage}
            </div>
          )}

          <div className="jy-login-field">
            <label htmlFor="admin-username">Username</label>
            <div className="jy-login-input-group">
              <i className="bi bi-person-fill jy-field-icon"></i>
              <input
                id="admin-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="jy-login-field">
            <label htmlFor="admin-password">Password</label>
            <div className="jy-login-input-group">
              <i className="bi bi-lock-fill jy-field-icon"></i>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="jy-toggle-visibility"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
              </button>
            </div>
          </div>

          <div className="jy-login-row">
            <label className="jy-login-remember">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Remember Me
            </label>
            <a href="#" className="jy-login-forgot" onClick={(e) => e.preventDefault()} title="Contact your system administrator">
              Forgot Password?
            </a>
          </div>

          <button type="submit" className="jy-login-submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>

          <div className="jy-login-security">
            <i className="bi bi-shield-check"></i>
            Secure Admin Access
          </div>
        </form>
      </div>
    </div>
  );
}
