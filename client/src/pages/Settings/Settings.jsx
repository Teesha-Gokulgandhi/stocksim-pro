import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRefreshCw,
  FiAlertTriangle,
  FiLock,
  FiCheck,
  FiShield,
  FiMoon,
  FiSun,
  FiBell,
  FiLogOut,
  FiExternalLink,
  FiKey,
  FiEye,
  FiEyeOff
} from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import API from "../../services/api";
import "./Settings.css";

function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user, refreshUser, logout } = useUser();
  const toast = useToast();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState(() => localStorage.getItem("stocksim_alerts_enabled") !== "false");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSubmitting(true);

    try {
      const response = await API.put("/user/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success(response.data.message || "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setShowPasswordForm(false);
    } catch (error) {
      setPwError(error.response?.data?.message || "Something went wrong updating password");
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleResetPortfolio = async () => {
    try {
      setResetting(true);
      const res = await API.post("/user/reset-portfolio");
      await refreshUser();
      toast.success(res.data.message || "Portfolio reset to ₹1,00,000", "Portfolio Reset");
      setShowResetModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset portfolio");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
      </div>

      {/* --- Section 1: Appearance & Notifications --- */}
      <div className="settings-section">
        <div className="settings-section-title">INTERFACE & NOTIFICATIONS</div>
        <div className="settings-card">
          {/* Theme Row */}
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-icon-badge">
                {theme === "light" ? <FiSun /> : <FiMoon />}
              </div>
              <div className="settings-row-info">
                <h4>Interface Theme</h4>
              </div>
            </div>
            <div className="settings-row-right">
              <button
                type="button"
                className={`settings-toggle-switch ${theme === "light" ? "active-light" : "active-dark"}`}
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                role="switch"
                aria-checked={theme === "light"}
              >
                <span className="settings-toggle-thumb">
                  {theme === "light" ? <FiSun className="switch-icon sun" /> : <FiMoon className="switch-icon moon" />}
                </span>
              </button>
            </div>
          </div>

          {/* Price Alerts Row */}
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-icon-badge">
                <FiBell />
              </div>
              <div className="settings-row-info">
                <h4>Price Alerts & Notifications</h4>
              </div>
            </div>
            <div className="settings-row-right">
              <button
                type="button"
                className={`settings-toggle-switch ${priceAlerts ? "active-on" : "active-off"}`}
                onClick={() => {
                  const next = !priceAlerts;
                  setPriceAlerts(next);
                  localStorage.setItem("stocksim_alerts_enabled", String(next));
                  toast.success(next ? "Notifications enabled" : "Notifications muted");
                }}
                aria-label="Toggle Price Alerts"
                role="switch"
                aria-checked={priceAlerts}
              >
                <span className="settings-toggle-thumb" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Section 2: Security & Permissions --- */}
      <div className="settings-section">
        <div className="settings-section-title">SECURITY & ACCESS</div>
        <div className="settings-card">
          {/* Password Row */}
          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-icon-badge">
                <FiLock />
              </div>
              <div className="settings-row-info">
                <h4>Account Password</h4>
              </div>
            </div>
            <div className="settings-row-right">
              <button
                type="button"
                className={`settings-btn-secondary ${showPasswordForm ? "active" : ""}`}
                onClick={() => setShowPasswordForm((p) => !p)}
              >
                <FiKey className="btn-icon" /> {showPasswordForm ? "Cancel" : "Change"}
              </button>
            </div>
          </div>

          {/* Password Form Expansion */}
          {showPasswordForm && (
            <form className="password-form" onSubmit={handlePasswordChange}>
              <div className="password-input-group">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                >
                  {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <div className="password-input-group">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New password (min 8 chars, 1 letter, 1 number)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              {pwError && <p className="pw-error">{pwError}</p>}

              <button type="submit" className="pw-submit-btn" disabled={pwSubmitting}>
                <FiLock /> {pwSubmitting ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {/* Admin Role Row (Only for designated admins) */}
          {isAdmin && (
            <div className="settings-row admin-row">
              <div className="settings-row-left">
                <div className="settings-icon-badge">
                  <FiShield />
                </div>
                <div className="settings-row-info">
                  <div className="settings-row-title-wrap">
                    <h4>Administrator Role</h4>
                    <span className="settings-admin-pill">ADMIN</span>
                  </div>
                </div>
              </div>
              <div className="settings-row-right">
                <button
                  type="button"
                  className="settings-admin-action-btn"
                  onClick={() => navigate("/admin")}
                >
                  <span>Console</span>
                  <FiExternalLink />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Section 3: Portfolio Actions --- */}
      <div className="settings-section">
        <div className="settings-section-title">SIMULATION DATA</div>
        <div className="settings-card">
          <div className="settings-row reset-row">
            <div className="settings-row-left">
              <div className="settings-icon-badge">
                <FiRefreshCw />
              </div>
              <div className="settings-row-info">
                <div className="settings-row-title-wrap">
                  <h4>Reset Practice Portfolio</h4>
                  <span className="settings-caution-pill">DESTRUCTIVE</span>
                </div>
              </div>
            </div>
            <div className="settings-row-right">
              <button
                type="button"
                className="settings-reset-action-btn"
                onClick={() => setShowResetModal(true)}
              >
                <FiRefreshCw className="btn-icon" /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Section 4: Session --- */}
      <div className="settings-logout-wrap">
        <button type="button" className="settings-logout-btn" onClick={handleLogout}>
          <FiLogOut /> Log Out
        </button>
      </div>

      {/* Confirmation Modal for Reset */}
      {showResetModal && (
        <div className="reset-modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="reset-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="reset-modal-icon">
              <FiAlertTriangle />
            </div>
            <h3>Reset Practice Portfolio?</h3>
            <p>
              This will restore your cash balance back to <strong>₹1,00,000</strong> and clear all your current stock holdings. This action cannot be undone.
            </p>
            <div className="reset-modal-actions">
              <button
                type="button"
                className="reset-modal-cancel"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reset-modal-confirm"
                onClick={handleResetPortfolio}
                disabled={resetting}
              >
                <FiCheck /> {resetting ? "Resetting..." : "Yes, Reset Portfolio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;