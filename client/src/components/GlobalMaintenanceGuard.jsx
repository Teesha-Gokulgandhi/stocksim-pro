import { useCallback, useEffect, useState } from "react";
import { FiLogOut, FiRefreshCw, FiShield } from "react-icons/fi";
import API from "../services/api";
import { useUser } from "../context/UserContext";
import "./GlobalMaintenanceGuard.css";

function GlobalMaintenanceGuard({ children }) {
  const { user, logout } = useUser();
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const { data } = await API.get("/admin/market-status");
      setStatus(data);
    } catch {
      // Keep the last known state during a temporary network interruption.
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const intervalId = window.setInterval(checkStatus, 15000);
    return () => window.clearInterval(intervalId);
  }, [checkStatus]);

  const isAdmin = user?.role === "admin";
  const maintenanceActive = status?.marketOpen === false;

  if (checking && !status) {
    return children;
  }

  if (!isAdmin && maintenanceActive) {
    return (
      <main className="maintenance-page">
        <section className="maintenance-panel" aria-live="polite">
          <div className="maintenance-icon" aria-hidden="true">
            <FiShield />
          </div>
          <p className="maintenance-eyebrow">StockSim Pro</p>
          <h1>Platform maintenance in progress</h1>
          <p className="maintenance-message">
            {status.marketClosedMessage || "Trading is temporarily paused by the administrator. Please check back soon."}
          </p>
          <div className="maintenance-actions">
            <button type="button" className="maintenance-button primary" onClick={checkStatus}>
              <FiRefreshCw /> Check again
            </button>
            <button type="button" className="maintenance-button secondary" onClick={logout}>
              <FiLogOut /> Sign out
            </button>
          </div>
          <span className="maintenance-status">The platform will return automatically when maintenance is complete.</span>
        </section>
      </main>
    );
  }

  return children;
}

export default GlobalMaintenanceGuard;
