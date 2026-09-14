import { useEffect, useRef, useState, useCallback } from "react";
import { FiBell, FiMoon, FiSun, FiMenu, FiCheck, FiBarChart2 } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { useMarket } from "../../context/MarketContext";
import "./Navbar.css";

const POLL_INTERVAL_MS = 45000;

function computeTimeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Navbar({ setSidebarOpen, sidebarCollapsed = false, toggleCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { selectedMarket, setSelectedMarket } = useMarket();

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await API.get("/notifications/unread-count");
      setUnreadCount(data.unreadCount);
    } catch {
      // Ignored for graceful degradation
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await API.get("/notifications", { params: { page: 1, limit: 8 } });
      const items = (data.notifications || []).map((n) => ({
        ...n,
        timeAgo: computeTimeAgo(n.createdAt),
      }));
      setNotifications(items);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);

    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fetchUnreadCount]);

  const handleBellClick = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) fetchNotifications();
  };

  const handleMarkRead = async (notif) => {
    if (notif.read) return;
    try {
      await API.put(`/notifications/${notif._id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignored
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Ignored
    }
  };

  const isMarketPage = location.pathname.startsWith("/market");
  const isAnalyticsPage = location.pathname === "/dashboard";

  const handleSwitchToIndian = () => {
    setSelectedMarket("IN");
    navigate("/market");
  };

  const handleSwitchToUS = () => {
    setSelectedMarket("US");
    navigate("/market");
  };

  const handleSwitchToAnalytics = () => {
    navigate("/dashboard");
  };

  const handleMenuClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen((prev) => !prev);
    } else if (toggleCollapse) {
      toggleCollapse();
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          className="menu-btn"
          onClick={handleMenuClick}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          <FiMenu />
        </button>

        {/* 3 Core Header Desks: Indian Market, US Market, Global Analytics */}
        <div className="header-primary-desks" role="tablist" aria-label="Market and analytics selection">
          {/* 1. Indian Market */}
          <button
            type="button"
            className={`header-desk-pill inr ${isMarketPage && selectedMarket === "IN" ? "active" : ""}`}
            onClick={handleSwitchToIndian}
            title="Indian Stock Market (NSE/BSE)"
            aria-selected={isMarketPage && selectedMarket === "IN"}
          >
            <span className="desk-code-badge inr">IN</span>
            <span className="desk-title">Indian Market</span>
            {isMarketPage && selectedMarket === "IN" && <span className="active-dot inr" />}
          </button>

          {/* 2. US Market */}
          <button
            type="button"
            className={`header-desk-pill usd ${isMarketPage && selectedMarket === "US" ? "active" : ""}`}
            onClick={handleSwitchToUS}
            title="US Stock Market (NYSE/Nasdaq)"
            aria-selected={isMarketPage && selectedMarket === "US"}
          >
            <span className="desk-code-badge usd">US</span>
            <span className="desk-title">US Market</span>
            {isMarketPage && selectedMarket === "US" && <span className="active-dot usd" />}
          </button>

          {/* 3. Global Portfolio Analytics */}
          <button
            type="button"
            className={`header-desk-pill analytics ${isAnalyticsPage ? "active" : ""}`}
            onClick={handleSwitchToAnalytics}
            title="Portfolio Analytics"
            aria-selected={isAnalyticsPage}
          >
            <FiBarChart2 className="analytics-icon" />
            <span className="desk-title">Analytics</span>
            {isAnalyticsPage && <span className="active-dot analytics" />}
          </button>
        </div>
      </div>

      <div className="navbar-right">
        {/* Notifications */}
        <div className="notif-wrapper" ref={notifRef}>
          <button
            className="icon-btn"
            onClick={handleBellClick}
            aria-label="Notifications"
          >
            <FiBell className="icon" />
            {unreadCount > 0 && (
              <span className="notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={handleMarkAllRead}>
                    <FiCheck /> Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="notif-empty">You're all caught up.</p>
              ) : (
                notifications.map((n) => (
                  <div
                    className={`notif-item ${n.read ? "" : "unread"}`}
                    key={n._id}
                    onClick={() => handleMarkRead(n)}
                  >
                    <span className={`notif-badge ${n.type}`}>{n.type}</span>
                    <div>
                      <p>{n.title}</p>
                      <p className="notif-message">{n.message}</p>
                      <span>{n.timeAgo}</span>
                    </div>
                    {!n.read && <span className="notif-unread-dot" />}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="icon-btn theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle dark/light theme"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <FiSun className="icon theme-icon-sun" /> : <FiMoon className="icon theme-icon-moon" />}
        </button>

        {/* User Profile */}
        <div className="profile">
          <div className="avatar">{user?.name?.charAt(0).toUpperCase() || "U"}</div>
          <h2>{user?.name || "User"}</h2>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
