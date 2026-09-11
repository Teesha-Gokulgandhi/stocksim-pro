import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiRefreshCw, FiAlertTriangle, FiLock, FiCheck, FiShield } from "react-icons/fi";
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
        <p>Manage your simulation preferences and account security.</p>
      </div>

      <div className="settings-card">
        <div className="settings-row">
          <div>
            <h4>Interface Theme</h4>
            <p>Switch between dark and light appearance.</p>
          </div>
          <button
            type="button"
            className="theme-switch"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
          >
            <span className={`theme-thumb ${theme === "light" ? "light" : ""}`} />
          </button>
        </div>

        <div className="settings-row password-row">
          <div>
            <h4>Account Password</h4>
            <p>Update your login credentials.</p>
          </div>
          <button
            type="button"
            className="change-pw-btn"
            onClick={() => setShowPasswordForm((p) => !p)}
          >
            {showPasswordForm ? "Cancel" : "Change"}
          </button>
        </div>

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
                {showCurrentPassword ? "Hide" : "Show"}
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
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>

            {pwError && <p className="pw-error">{pwError}</p>}

            <button type="submit" className="pw-submit-btn" disabled={pwSubmitting}>
              <FiLock /> {pwSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        {/* -------- Admin Section (Only for designated admins) -------- */}
        {isAdmin && (
          <div className="settings-row admin-console-row">
            <div>
              <h4>
                <FiShield /> Administrator Role
              </h4>
              <p>👑 You have full access to the Admin Simulation Control Center.</p>
            </div>
            <button
              type="button"
              className="admin-go-btn"
              onClick={() => navigate("/admin")}
            >
              Open Admin Console
            </button>
          </div>
        )}

        {/* -------- Reset Virtual Portfolio Section -------- */}
        <div className="settings-row reset-row">
          <div>
            <h4>Reset Practice Portfolio</h4>
            <p>Reset balance back to ₹1,00,000 virtual cash and clear all active positions.</p>
          </div>
          <button
            type="button"
            className="reset-portfolio-trigger"
            onClick={() => setShowResetModal(true)}
          >
            <FiRefreshCw /> Reset
          </button>
        </div>

        <div className="settings-row">
          <div>
            <h4>Price Alerts & Notifications</h4>
            <p>Receive push alerts and real-time trade execution notifications.</p>
          </div>
          <label className="theme-toggle">
            <input
              type="checkbox"
              checked={priceAlerts}
              onChange={() => {
                const next = !priceAlerts;
                setPriceAlerts(next);
                localStorage.setItem("stocksim_alerts_enabled", String(next));
                toast.success(next ? "Notifications enabled" : "Notifications muted");
              }}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <button type="button" className="logout-card-btn" onClick={handleLogout}>
        Log Out
      </button>

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