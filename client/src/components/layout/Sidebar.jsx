import {
  FiTrendingUp,
  FiClock,
  FiPieChart,
  FiFileText,
  FiEye,
  FiUser,
  FiSettings,
  FiLogOut,
  FiX,
  FiShield,
  FiChevronLeft,
  FiChevronRight,
  FiBarChart2,
} from "react-icons/fi";

import { useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useMarket } from "../../context/MarketContext";
import Logo from "../common/Logo";
import "./Sidebar.css";

function Sidebar({ sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { marketView, setMarketView, isIN } = useMarket();
  const isAdmin = user?.role === "admin";

  const isAnalyticsDesk = location.pathname === "/dashboard";
  const isMarketDesk = location.pathname === "/market";
  const isCollapsed = sidebarCollapsed && !sidebarOpen;

  // Global Ctrl+B / Cmd+B keyboard shortcut to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapse]);

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  // Auto-close sidebar drawer on route change (mobile)
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname, setSidebarOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSelectMarketView = (view) => {
    setMarketView(view);
    if (location.pathname !== "/market") {
      navigate("/market");
    }
    closeSidebar();
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        <button className="close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
          <FiX />
        </button>

        <div className="sidebar-top">
          <div className="logo-container-link" title="StockSim Pro">
            <Logo
              size={isCollapsed ? "sm" : "md"}
              collapsed={isCollapsed}
            />
          </div>

          <button
            type="button"
            className="collapse-toggle-btn"
            onClick={toggleCollapse}
            title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {isAnalyticsDesk ? (
            /* ANALYTICS DESK CONTEXTUAL NAVIGATION */
            <>
              {!isCollapsed && (
                <div className="sidebar-context-badge analytics">
                  <FiBarChart2 />
                  <span>PERFORMANCE</span>
                </div>
              )}

              <a
                href="#overview"
                className="active"
                onClick={closeSidebar}
                title="Global Performance Overview"
              >
                <FiBarChart2 />
                {!isCollapsed && <span>Performance Cockpit</span>}
              </a>
            </>
          ) : (
            /* ACTIVE MARKET DESK CONTEXTUAL NAVIGATION (INDIAN OR US) */
            <>
              {!isCollapsed && (
                <div className={`sidebar-context-badge ${isIN ? "inr" : "usd"}`}>
                  <span>{isIN ? "🇮🇳 NSE / BSE MARKET" : "🇺🇸 NYSE / NASDAQ MARKET"}</span>
                </div>
              )}

              <button
                type="button"
                className={`nav-desk-link ${isMarketDesk && marketView === "live" ? "active" : ""}`}
                onClick={() => handleSelectMarketView("live")}
                title="Live Stock Screener & Trading"
              >
                <FiTrendingUp />
                {!isCollapsed && <span>Live Trading</span>}
              </button>

              <button
                type="button"
                className={`nav-desk-link ${isMarketDesk && marketView === "backtest" ? "active" : ""}`}
                onClick={() => handleSelectMarketView("backtest")}
                title="Historical Candlestick Backtesting"
              >
                <FiClock />
                {!isCollapsed && <span>Backtest Studio</span>}
              </button>

              <button
                type="button"
                className={`nav-desk-link ${isMarketDesk && marketView === "portfolio" ? "active" : ""}`}
                onClick={() => handleSelectMarketView("portfolio")}
                title="Holdings & Portfolio"
              >
                <FiPieChart />
                {!isCollapsed && <span>Portfolio</span>}
              </button>

              <button
                type="button"
                className={`nav-desk-link ${isMarketDesk && marketView === "watchlist" ? "active" : ""}`}
                onClick={() => handleSelectMarketView("watchlist")}
                title="Watchlist"
              >
                <FiEye />
                {!isCollapsed && <span>Watchlist</span>}
              </button>

              <button
                type="button"
                className={`nav-desk-link ${isMarketDesk && marketView === "orders" ? "active" : ""}`}
                onClick={() => handleSelectMarketView("orders")}
                title="Order Book"
              >
                <FiFileText />
                {!isCollapsed && <span>Order Book</span>}
              </button>
            </>
          )}

          {!isCollapsed && <div className="nav-group-label">ACCOUNT</div>}

          <NavLink to="/profile" onClick={closeSidebar} title="Profile">
            <FiUser />
            {!isCollapsed && <span>Profile</span>}
          </NavLink>

          <NavLink to="/settings" onClick={closeSidebar} title="Settings & Security">
            <FiSettings />
            {!isCollapsed && <span>Settings</span>}
          </NavLink>

          {isAdmin && (
            <NavLink to="/admin" onClick={closeSidebar} className="nav-admin-link" title="Admin Portal">
              <FiShield />
              {!isCollapsed && <span>Admin Portal</span>}
            </NavLink>
          )}
        </nav>

        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <FiLogOut />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </aside>
    </>
  );
}

export default Sidebar;