import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiUsers,
  FiActivity,
  FiToggleRight,
  FiShield,
  FiBell,
  FiClock,
  FiPackage,
} from "react-icons/fi";

import API from "../../services/api";
import PageLoader from "../../components/common/PageLoader";
import "./Admin.css";

// Tab Panel Components
import InvestorsTab from "./tabs/InvestorsTab";
import ManageStocksTab from "./tabs/ManageStocksTab";
import TradingLeaguesTab from "./tabs/TradingLeaguesTab";
import MarketEngineTab from "./tabs/MarketEngineTab";
import BroadcastsTab from "./tabs/BroadcastsTab";
import AuditTrailTab from "./tabs/AuditTrailTab";

// Modal Components
import UserDetailModal from "./modals/UserDetailModal";
import ResetAccountModal from "./modals/ResetAccountModal";
import AddFundsModal from "./modals/AddFundsModal";

const TAB_KEYS = {
  investors: "INVESTORS",
  stocks: "STOCKS",
  leagues: "LEAGUES",
  market: "MARKET",
  broadcasts: "BROADCASTS",
  audit: "AUDIT",
};

const TAB_SLUGS = {
  INVESTORS: "investors",
  STOCKS: "stocks",
  LEAGUES: "leagues",
  MARKET: "market",
  BROADCASTS: "broadcasts",
  AUDIT: "audit",
};

function Admin() {
  const { tab } = useParams();
  const navigate = useNavigate();

  // ──── Core State ────
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [actionError, setActionError] = useState("");

  // ──── Workspace Navigation ────
  const activeTabFromUrl = tab && TAB_KEYS[tab.toLowerCase()] ? TAB_KEYS[tab.toLowerCase()] : "INVESTORS";
  const [workspaceTab, setWorkspaceTab] = useState(activeTabFromUrl);

  // ──── Market State ────
  const [marketOpen, setMarketOpen] = useState(true);
  const [marketMessage, setMarketMessage] = useState("");
  const [marketOpenIN, setMarketOpenIN] = useState(true);
  const [marketMessageIN, setMarketMessageIN] = useState("");
  const [marketNoticeModeIN, setMarketNoticeModeIN] = useState("SESSION");
  const [marketOverrideHoursIN, setMarketOverrideHoursIN] = useState(1);
  const [marketOverrideUntilIN, setMarketOverrideUntilIN] = useState(null);
  const [marketOpenUS, setMarketOpenUS] = useState(true);
  const [marketMessageUS, setMarketMessageUS] = useState("");
  const [marketNoticeModeUS, setMarketNoticeModeUS] = useState("SESSION");
  const [marketOverrideHoursUS, setMarketOverrideHoursUS] = useState(1);
  const [marketOverrideUntilUS, setMarketOverrideUntilUS] = useState(null);
  const [marketStatusIN, setMarketStatusIN] = useState("ACTIVE");
  const [marketStatusUS, setMarketStatusUS] = useState("ACTIVE");
  const [savingMarket, setSavingMarket] = useState(false);
  const [marketSuccess, setMarketSuccess] = useState("");

  // ──── Users State ────
  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [processingUserId, setProcessingUserId] = useState(null);

  // ──── User Detail Modal ────
  const [detailUser, setDetailUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ──── Reset & Add Funds Modals ────
  const [resetModalUser, setResetModalUser] = useState(null);
  const [addFundsModalUser, setAddFundsModalUser] = useState(null);
  const [addFundsCurrency, setAddFundsCurrency] = useState("INR");
  const [addFundsAmount, setAddFundsAmount] = useState("1000000");

  // ──── Trading Leagues ────
  const [adminLeaderboard, setAdminLeaderboard] = useState({ inrLeague: [], usdLeague: [] });
  const [adminLeagueMode, setAdminLeagueMode] = useState("IN");

  // ──── Stocks ────
  const [stocks, setStocks] = useState([]);

  // ──── Audit Trail ────
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState(null);

  // ──── Broadcast Notifications ────
  const [sentNotifications, setSentNotifications] = useState([]);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState("");

  // ════════════════════════════════════════════════
  // DATA FETCHING
  // ════════════════════════════════════════════════

  const fetchUsers = async (searchTerm = search) => {
    try {
      const { data } = await API.get("/admin/users", {
        params: { page: userPage, limit: 10, search: searchTerm },
      });
      setUsers(data.users);
      setUserPagination(data.pagination);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAuditLog = async () => {
    try {
      const { data } = await API.get("/admin/audit-log", {
        params: { page: auditPage, limit: 10 },
      });
      setAuditLogs(data.logs);
      setAuditPagination(data.pagination);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSentNotifications = async () => {
    try {
      const { data } = await API.get("/admin/notifications", {
        params: { page: 1, limit: 10 },
      });
      setSentNotifications(data.notifications || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStocks = async () => {
    try {
      const { data } = await API.get("/stocks", { params: { page: 1, limit: 100 } });
      setStocks(data.stocks || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAdminLeaderboard = async () => {
    try {
      const { data } = await API.get("/user/leaderboard");
      if (data) {
        setAdminLeaderboard({
          inrLeague: data.inrLeague || [],
          usdLeague: data.usdLeague || [],
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [statsRes, marketRes] = await Promise.all([
        API.get("/admin/stats"),
        API.get("/admin/market-status"),
      ]);
      setStats(statsRes.data.stats);
      setMarketOpen(marketRes.data.marketOpen);
      setMarketMessage(marketRes.data.marketClosedMessage || "");
      setMarketOpenIN(marketRes.data.marketOpenIN ?? true);
      setMarketNoticeModeIN(marketRes.data.marketOpenIN === false ? (marketRes.data.marketPauseReasonIN || "MAINTENANCE") : "SESSION");
      setMarketMessageIN(marketRes.data.marketClosedMessageIN || "");
      setMarketOverrideUntilIN(marketRes.data.marketOverrideUntilIN || null);
      setMarketOpenUS(marketRes.data.marketOpenUS ?? true);
      setMarketNoticeModeUS(marketRes.data.marketOpenUS === false ? (marketRes.data.marketPauseReasonUS || "MAINTENANCE") : "SESSION");
      setMarketMessageUS(marketRes.data.marketClosedMessageUS || "");
      setMarketOverrideUntilUS(marketRes.data.marketOverrideUntilUS || null);
      setMarketStatusIN(marketRes.data.marketStatusIN || "ACTIVE");
      setMarketStatusUS(marketRes.data.marketStatusUS || "ACTIVE");
      await Promise.all([
        fetchUsers(),
        fetchAuditLog(),
        fetchSentNotifications(),
        fetchStocks(),
        fetchAdminLeaderboard(),
      ]);
    } catch (error) {
      if (error.response?.status === 403) {
        setForbidden(true);
        setTimeout(() => navigate("/dashboard"), 1500);
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════
  // EFFECTS & ROUTING
  // ════════════════════════════════════════════════

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab && TAB_KEYS[tab.toLowerCase()]) {
      const matched = TAB_KEYS[tab.toLowerCase()];
      setWorkspaceTab(matched);
      if (matched === "LEAGUES") {
        fetchAdminLeaderboard();
      }
    } else if (!tab) {
      setWorkspaceTab("INVESTORS");
    }
  }, [tab]);

  const handleTabChange = (targetTab) => {
    setWorkspaceTab(targetTab);
    const slug = TAB_SLUGS[targetTab] || "investors";
    navigate(`/admin/${slug}`);
    if (targetTab === "LEAGUES") {
      fetchAdminLeaderboard();
    }
  };

  useEffect(() => {
    if (forbidden) return undefined;
    const refreshExchangeStatus = async () => {
      try {
        const { data } = await API.get("/admin/market-status");
        setMarketOpenIN(data.marketOpenIN ?? true);
        setMarketOpenUS(data.marketOpenUS ?? true);
        setMarketStatusIN(data.marketStatusIN || "ACTIVE");
        setMarketStatusUS(data.marketStatusUS || "ACTIVE");
        setMarketOverrideUntilIN(data.marketOverrideUntilIN || null);
        setMarketOverrideUntilUS(data.marketOverrideUntilUS || null);
      } catch {}
    };
    const intervalId = window.setInterval(refreshExchangeStatus, 30000);
    return () => window.clearInterval(intervalId);
  }, [forbidden]);

  useEffect(() => {
    if (!forbidden) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage]);

  useEffect(() => {
    if (!forbidden) fetchAuditLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditPage]);

  // ════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setUserPage(1);
    fetchUsers(search);
  };

  // ── Market Handlers ──
  const toggleMarket = async () => {
    setSavingMarket(true);
    setActionError("");
    setMarketSuccess("");
    const next = !marketOpen;
    try {
      const { data } = await API.put("/admin/market-status", {
        marketOpen: next,
        marketClosedMessage: marketMessage,
      });
      setMarketOpen(data.marketOpen);
      setMarketSuccess(
        data.marketOpen
          ? "✅ Global Platform Trading is now OPEN."
          : "🛑 Global Platform Trading is now PAUSED across all markets."
      );
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to update market status");
    } finally {
      setSavingMarket(false);
    }
  };

  const saveMarketMessage = async () => {
    setSavingMarket(true);
    setActionError("");
    setMarketSuccess("");
    try {
      await API.put("/admin/market-status", {
        marketClosedMessage: marketMessage,
      });
      setMarketSuccess("✅ Global market closed message saved successfully.");
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to save message");
    } finally {
      setSavingMarket(false);
    }
  };

  const saveMarketMessageIN = async () => {
    setSavingMarket(true);
    setActionError("");
    setMarketSuccess("");
    const isTimedOpen = marketNoticeModeIN === "TIMED_OPEN";
    try {
      const { data } = await API.put("/admin/market-status", {
        marketOpenIN: isTimedOpen ? true : marketNoticeModeIN === "SESSION",
        marketPauseReasonIN: isTimedOpen || marketNoticeModeIN === "SESSION" ? null : marketNoticeModeIN,
        marketOverrideHoursIN: isTimedOpen ? marketOverrideHoursIN : null,
        marketClosedMessageIN: marketMessageIN,
      });
      setMarketOpenIN(data.marketOpenIN ?? true);
      setMarketStatusIN(data.marketStatusIN || "ACTIVE");
      setMarketOverrideUntilIN(data.marketOverrideUntilIN || null);
      setMarketSuccess(
        isTimedOpen
          ? `Indian market temporarily opened for ${marketOverrideHoursIN}h; reverts to the normal schedule automatically after that.`
          : marketNoticeModeIN === "HOLIDAY"
          ? "Indian market holiday applied; it will resume next weekday session."
          : marketNoticeModeIN === "MAINTENANCE"
          ? "Indian market maintenance pause applied; use Resume Market to restore the normal schedule."
          : "Indian market now follows its normal session schedule."
      );
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to save message");
    } finally {
      setSavingMarket(false);
    }
  };

  const saveMarketMessageUS = async () => {
    setSavingMarket(true);
    setActionError("");
    setMarketSuccess("");
    const isTimedOpen = marketNoticeModeUS === "TIMED_OPEN";
    try {
      const { data } = await API.put("/admin/market-status", {
        marketOpenUS: isTimedOpen ? true : marketNoticeModeUS === "SESSION",
        marketPauseReasonUS: isTimedOpen || marketNoticeModeUS === "SESSION" ? null : marketNoticeModeUS,
        marketOverrideHoursUS: isTimedOpen ? marketOverrideHoursUS : null,
        marketClosedMessageUS: marketMessageUS,
      });
      setMarketOpenUS(data.marketOpenUS ?? true);
      setMarketStatusUS(data.marketStatusUS || "ACTIVE");
      setMarketOverrideUntilUS(data.marketOverrideUntilUS || null);
      setMarketSuccess(
        isTimedOpen
          ? `US market temporarily opened for ${marketOverrideHoursUS}h; reverts to the normal schedule automatically after that.`
          : marketNoticeModeUS === "HOLIDAY"
          ? "US market holiday applied; it will resume next weekday session."
          : marketNoticeModeUS === "MAINTENANCE"
          ? "US market maintenance pause applied; use Resume Market to restore the normal schedule."
          : "US market now follows its normal session schedule."
      );
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to save message");
    } finally {
      setSavingMarket(false);
    }
  };

  // ── User Handlers ──
  const toggleUserRole = async (user) => {
    if (processingUserId) return;
    setProcessingUserId(user._id);
    const nextRole = user.role === "admin" ? "user" : "admin";
    setActionError("");
    try {
      await API.put(`/admin/users/${user._id}/role`, { role: nextRole });
      await fetchUsers();
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to update role");
    } finally {
      setTimeout(() => setProcessingUserId(null), 500);
    }
  };

  const toggleUserStatus = async (user) => {
    if (processingUserId) return;
    setProcessingUserId(user._id);
    setActionError("");
    try {
      await API.put(`/admin/users/${user._id}/status`, { isActive: !user.isActive });
      await fetchUsers();
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to update status");
    } finally {
      setTimeout(() => setProcessingUserId(null), 500);
    }
  };

  const handleDeleteUser = async (user) => {
    if (processingUserId) return;
    if (user.email === "admin@stocksim.com") {
      setActionError("Cannot delete the primary System Admin account");
      return;
    }
    if (!window.confirm(`Permanently delete user ${user.name} (${user.email}) and all active trades?`)) {
      return;
    }
    setProcessingUserId(user._id);
    setActionError("");
    try {
      await API.delete(`/admin/users/${user._id}`);
      await fetchUsers();
      fetchAdminLeaderboard();
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to delete user");
    } finally {
      setTimeout(() => setProcessingUserId(null), 500);
    }
  };

  const openUserDetail = async (user) => {
    setDetailLoading(true);
    setActionError("");
    try {
      const { data } = await API.get(`/admin/users/${user._id}`);
      setDetailUser(data);
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to load user details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddFunds = (user) => {
    setAddFundsModalUser(user);
    setAddFundsCurrency("INR");
    setAddFundsAmount("1000000");
    setActionError("");
  };

  const confirmAddFunds = async () => {
    if (!addFundsModalUser || processingUserId) return;
    const amt = Number(addFundsAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      setActionError("Please enter a valid positive number for margin");
      return;
    }

    setProcessingUserId(addFundsModalUser._id);
    setActionError("");
    try {
      const payload = addFundsCurrency === "USD" ? { addBalanceUSD: amt } : { addBalance: amt };
      await API.put(`/admin/users/${addFundsModalUser._id}/balance`, payload);
      await fetchUsers();
      await fetchAdminLeaderboard();
      fetchAuditLog();
      if (detailUser && detailUser.user?._id === addFundsModalUser._id) {
        const { data } = await API.get(`/admin/users/${addFundsModalUser._id}`);
        setDetailUser(data);
      }
      setAddFundsModalUser(null);
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to add funds");
    } finally {
      setTimeout(() => setProcessingUserId(null), 500);
    }
  };

  const handleResetAccount = (user) => {
    setResetModalUser(user);
    setActionError("");
  };

  const confirmResetAccount = async () => {
    if (!resetModalUser || processingUserId) return;
    setProcessingUserId(resetModalUser._id);
    setActionError("");
    try {
      await API.put(`/admin/users/${resetModalUser._id}/balance`, { fullReset: true });
      await fetchUsers();
      await fetchAdminLeaderboard();
      fetchAuditLog();
      if (detailUser && detailUser.user?._id === resetModalUser._id) {
        setDetailUser(null);
      }
      setResetModalUser(null);
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to reset account");
    } finally {
      setTimeout(() => setProcessingUserId(null), 500);
    }
  };

  // ── Notification Handlers ──
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      setActionError("Title and message are both required");
      return;
    }

    setSendingNotif(true);
    setActionError("");
    setNotifSuccess("");
    try {
      await API.post("/admin/notifications", {
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType,
      });
      setNotifTitle("");
      setNotifMessage("");
      setNotifType("info");
      setNotifSuccess("Notification sent to all users.");
      fetchSentNotifications();
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to send notification");
    } finally {
      setSendingNotif(false);
    }
  };

  const handleDeleteNotification = async (notif) => {
    setActionError("");
    try {
      await API.delete(`/admin/notifications/${notif._id}`);
      fetchSentNotifications();
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to delete notification");
    }
  };

  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════

  if (loading) return <PageLoader />;

  if (forbidden) {
    return (
      <div className="admin-forbidden">
        <FiShield size={32} />
        <h2>Admin access required</h2>
        <p>Redirecting you back to the dashboard…</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* -------- Executive Header -------- */}
      <div className="admin-header-bar">
        <div className="admin-header-titles">
          <h1>Operations & Market Control</h1>
          <p>
            Multi-exchange governance for <strong>NSE, BSE, NYSE & NASDAQ</strong> simulated trading.
          </p>
        </div>
      </div>

      {/* -------- Workspace Navigation Tabs -------- */}
      <nav className="admin-workspace-nav">
        <button type="button" className={`workspace-tab-btn ${workspaceTab === "INVESTORS" ? "active" : ""}`} onClick={() => handleTabChange("INVESTORS")}>
          <FiUsers />
          <span>Investors</span>
          <span className="tab-counter">{stats?.totalUsers ?? userPagination?.total ?? users.length}</span>
        </button>

        <button type="button" className={`workspace-tab-btn ${workspaceTab === "STOCKS" ? "active" : ""}`} onClick={() => handleTabChange("STOCKS")}>
          <FiPackage />
          <span>Manage Stocks</span>
          <span className="tab-counter">{stocks.length}</span>
        </button>

        <button type="button" className={`workspace-tab-btn ${workspaceTab === "LEAGUES" ? "active" : ""}`} onClick={() => handleTabChange("LEAGUES")}>
          <FiActivity />
          <span>Trading Leagues</span>
        </button>

        <button type="button" className={`workspace-tab-btn ${workspaceTab === "MARKET" ? "active" : ""}`} onClick={() => handleTabChange("MARKET")}>
          <FiToggleRight />
          <span>Market Engine</span>
          <span className={`tab-indicator-dot ${marketOpen ? "open" : "closed"}`} />
        </button>

        <button type="button" className={`workspace-tab-btn ${workspaceTab === "BROADCASTS" ? "active" : ""}`} onClick={() => handleTabChange("BROADCASTS")}>
          <FiBell />
          <span>Broadcasts</span>
          {sentNotifications.length > 0 && (
            <span className="tab-counter">{sentNotifications.length}</span>
          )}
        </button>

        <button type="button" className={`workspace-tab-btn ${workspaceTab === "AUDIT" ? "active" : ""}`} onClick={() => handleTabChange("AUDIT")}>
          <FiClock />
          <span>Audit Trail</span>
        </button>
      </nav>

      {/* ════════════ TAB PANELS ════════════ */}

      {workspaceTab === "INVESTORS" && (
        <InvestorsTab
          users={users}
          userPage={userPage}
          setUserPage={setUserPage}
          userPagination={userPagination}
          search={search}
          setSearch={setSearch}
          stats={stats}
          actionError={actionError}
          processingUserId={processingUserId}
          handleSearchSubmit={handleSearchSubmit}
          openUserDetail={openUserDetail}
          handleAddFunds={handleAddFunds}
          handleResetAccount={handleResetAccount}
          toggleUserRole={toggleUserRole}
          toggleUserStatus={toggleUserStatus}
          handleDeleteUser={handleDeleteUser}
        />
      )}

      {workspaceTab === "STOCKS" && (
        <ManageStocksTab
          stocks={stocks}
          actionError={actionError}
          setActionError={setActionError}
          fetchStocks={fetchStocks}
          fetchOverview={fetchOverview}
          fetchAuditLog={fetchAuditLog}
        />
      )}

      {workspaceTab === "LEAGUES" && (
        <TradingLeaguesTab
          adminLeaderboard={adminLeaderboard}
          adminLeagueMode={adminLeagueMode}
          setAdminLeagueMode={setAdminLeagueMode}
          users={users}
          openUserDetail={openUserDetail}
        />
      )}

      {workspaceTab === "MARKET" && (
        <MarketEngineTab
          actionError={actionError}
          marketSuccess={marketSuccess}
          marketOpen={marketOpen}
          marketMessage={marketMessage}
          setMarketMessage={setMarketMessage}
          marketOpenIN={marketOpenIN}
          marketMessageIN={marketMessageIN}
          setMarketMessageIN={setMarketMessageIN}
          marketNoticeModeIN={marketNoticeModeIN}
          setMarketNoticeModeIN={setMarketNoticeModeIN}
          marketOverrideHoursIN={marketOverrideHoursIN}
          setMarketOverrideHoursIN={setMarketOverrideHoursIN}
          marketOverrideUntilIN={marketOverrideUntilIN}
          marketOpenUS={marketOpenUS}
          marketMessageUS={marketMessageUS}
          setMarketMessageUS={setMarketMessageUS}
          marketNoticeModeUS={marketNoticeModeUS}
          setMarketNoticeModeUS={setMarketNoticeModeUS}
          marketOverrideHoursUS={marketOverrideHoursUS}
          setMarketOverrideHoursUS={setMarketOverrideHoursUS}
          marketOverrideUntilUS={marketOverrideUntilUS}
          marketStatusIN={marketStatusIN}
          marketStatusUS={marketStatusUS}
          savingMarket={savingMarket}
          toggleMarket={toggleMarket}
          saveMarketMessage={saveMarketMessage}
          saveMarketMessageIN={saveMarketMessageIN}
          saveMarketMessageUS={saveMarketMessageUS}
        />
      )}

      {workspaceTab === "BROADCASTS" && (
        <BroadcastsTab
          actionError={actionError}
          notifSuccess={notifSuccess}
          notifTitle={notifTitle}
          setNotifTitle={setNotifTitle}
          notifMessage={notifMessage}
          setNotifMessage={setNotifMessage}
          notifType={notifType}
          setNotifType={setNotifType}
          sendingNotif={sendingNotif}
          handleSendNotification={handleSendNotification}
          sentNotifications={sentNotifications}
          handleDeleteNotification={handleDeleteNotification}
        />
      )}

      {workspaceTab === "AUDIT" && (
        <AuditTrailTab
          auditLogs={auditLogs}
          auditPage={auditPage}
          setAuditPage={setAuditPage}
          auditPagination={auditPagination}
        />
      )}

      {/* ════════════ MODALS ════════════ */}

      {(detailUser || detailLoading) && (
        <UserDetailModal
          detailUser={detailUser}
          detailLoading={detailLoading}
          setDetailUser={setDetailUser}
          handleAddFunds={handleAddFunds}
          handleResetAccount={handleResetAccount}
        />
      )}

      <ResetAccountModal
        resetModalUser={resetModalUser}
        setResetModalUser={setResetModalUser}
        processingUserId={processingUserId}
        confirmResetAccount={confirmResetAccount}
      />

      <AddFundsModal
        addFundsModalUser={addFundsModalUser}
        setAddFundsModalUser={setAddFundsModalUser}
        addFundsCurrency={addFundsCurrency}
        setAddFundsCurrency={setAddFundsCurrency}
        addFundsAmount={addFundsAmount}
        setAddFundsAmount={setAddFundsAmount}
        processingUserId={processingUserId}
        confirmAddFunds={confirmAddFunds}
      />
    </div>
  );
}

export default Admin;
