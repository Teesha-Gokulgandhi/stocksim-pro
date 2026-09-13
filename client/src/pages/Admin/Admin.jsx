import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiToggleLeft,
  FiToggleRight,
  FiUsers,
  FiActivity,
  FiTrendingUp,
  FiBarChart2,
  FiShield,
  FiSearch,
  FiX,
  FiClock,
  FiSend,
  FiTrash2,
  FiBell,
  FiPlus,
  FiEdit2,
  FiPackage,
  FiAlertTriangle,
  FiExternalLink,
  FiCheckCircle,
  FiEye,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiGlobe,
  FiLayers,
  FiSliders,
  FiCheck,
  FiPlusCircle,
  FiZap,
} from "react-icons/fi";

import API from "../../services/api";
import PageLoader from "../../components/common/PageLoader";
import "./Admin.css";

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatUSD(amount) {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const EXCHANGES = [
  {
    id: "NSE",
    label: "NSE",
    name: "National Stock Exchange",
    country: "IN",
    currency: "INR",
    flag: "🇮🇳",
    badge: "NSE India",
    suffix: ".NS",
    note: "Appends .NS for live Yahoo quotes",
    placeholder: "e.g. RELIANCE, TCS, INFY",
  },
  {
    id: "BSE",
    label: "BSE",
    name: "Bombay Stock Exchange",
    country: "IN",
    currency: "INR",
    flag: "🇮🇳",
    badge: "BSE India",
    suffix: ".BO",
    note: "Appends .BO for live Yahoo quotes",
    placeholder: "e.g. 500325, TCS, INFY",
  },
  {
    id: "NYSE",
    label: "NYSE",
    name: "New York Stock Exchange",
    country: "US",
    currency: "USD",
    flag: "🇺🇸",
    badge: "NYSE Wall St",
    suffix: "",
    note: "Standard US Ticker format",
    placeholder: "e.g. IBM, DIS, KO, JNJ",
  },
  {
    id: "NASDAQ",
    label: "NASDAQ",
    name: "NASDAQ Global Market",
    country: "US",
    currency: "USD",
    flag: "🇺🇸",
    badge: "NASDAQ Tech",
    suffix: "",
    note: "Standard US Ticker format",
    placeholder: "e.g. AAPL, MSFT, GOOGL, NVDA",
  },
];

const SECTOR_PRESETS = [
  "Information Technology",
  "Banking & Financial Services",
  "Automotive & Mobility",
  "Energy & Petrochemicals",
  "Pharmaceuticals & Healthcare",
  "Consumer Goods & FMCG",
  "Telecommunications",
  "Metals & Mining",
  "Semiconductors & AI",
  "Industrial & Infrastructure",
  "Media & Entertainment",
  "Consumer Discretionary & Retail",
];

function getFormattedSymbol(rawSymbol, exchange) {
  if (!rawSymbol) return "";
  const s = rawSymbol.trim().toUpperCase();
  if (exchange === "NSE") {
    return s.endsWith(".NS") ? s : `${s}.NS`;
  }
  if (exchange === "BSE") {
    return s.endsWith(".BO") ? s : `${s}.BO`;
  }
  return s;
}

function Admin() {
  const navigate = useNavigate();

  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
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

  // Primary Workspace Navigation
  const [workspaceTab, setWorkspaceTab] = useState("INVESTORS"); // "INVESTORS" | "STOCKS" | "LEAGUES" | "MARKET" | "BROADCASTS" | "AUDIT"

  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");

  const [detailUser, setDetailUser] = useState(null); // { user, holdings, recentTransactions } | null
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalMarketTab, setModalMarketTab] = useState("IN"); // "IN" | "US"
  const [userSectionTab, setUserSectionTab] = useState("USERS"); // "USERS" | "LEADERBOARD"
  const [adminLeaderboard, setAdminLeaderboard] = useState({ inrLeague: [], usdLeague: [] });
  const [adminLeagueMode, setAdminLeagueMode] = useState("IN"); // "IN" | "US"

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState(null);

  const [sentNotifications, setSentNotifications] = useState([]);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState("");

  // Stocks Management State
  const [stocks, setStocks] = useState([]);
  const [stockExchangeFilter, setStockExchangeFilter] = useState("ALL");
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [verifyingSymbol, setVerifyingSymbol] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [isCustomSector, setIsCustomSector] = useState(false);
  const [customSectorInput, setCustomSectorInput] = useState("");

  const [stockForm, setStockForm] = useState({
    symbol: "",
    companyName: "",
    sector: SECTOR_PRESETS[0],
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    logo: "",
  });
  const [editingStockId, setEditingStockId] = useState(null);
  const [savingStock, setSavingStock] = useState(false);
  const [stockSuccess, setStockSuccess] = useState("");
  const [processingUserId, setProcessingUserId] = useState(null);

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

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSelectExchange = (exchId) => {
    const isIN = exchId === "NSE" || exchId === "BSE";
    setStockForm((prev) => ({
      ...prev,
      exchange: exchId,
      country: isIN ? "IN" : "US",
      currency: isIN ? "INR" : "USD",
    }));
    setVerifyResult(null);
  };

  const handleVerifySymbol = async () => {
    const rawInput = stockForm.symbol.trim();
    if (!rawInput) {
      setActionError("Enter a symbol or company name first to verify with Yahoo Finance");
      return;
    }
    setVerifyingSymbol(true);
    setVerifyResult(null);
    setActionError("");
    try {
      const { data } = await API.get(`/admin/stocks/verify/${encodeURIComponent(rawInput)}`, {
        params: { exchange: stockForm.exchange },
      });
      setVerifyResult(data);
      if (data.success) {
        const bestSymbol = data.cleanSymbol || data.symbol;
        setStockForm((prev) => ({
          ...prev,
          symbol: bestSymbol,
          companyName: data.shortName || prev.companyName,
        }));
      }
    } catch (err) {
      setVerifyResult({
        success: false,
        message: err.response?.data?.message || "Failed to verify ticker on Yahoo Finance",
      });
    } finally {
      setVerifyingSymbol(false);
    }
  };

  const resetStockForm = () => {
    setStockForm({
      symbol: "",
      companyName: "",
      sector: SECTOR_PRESETS[0],
      exchange: "NSE",
      country: "IN",
      currency: "INR",
      logo: "",
    });
    setIsCustomSector(false);
    setCustomSectorInput("");
    setEditingStockId(null);
    setVerifyResult(null);
  };

  const startEditStock = (stock) => {
    setEditingStockId(stock._id);
    const isCustom = !SECTOR_PRESETS.includes(stock.sector);
    setIsCustomSector(isCustom);
    setCustomSectorInput(isCustom ? stock.sector : "");
    setStockForm({
      symbol: stock.symbol,
      companyName: stock.companyName,
      sector: isCustom ? "CUSTOM" : stock.sector,
      exchange: stock.exchange || "NSE",
      country: stock.country || (stock.exchange === "NSE" || stock.exchange === "BSE" ? "IN" : "US"),
      currency: stock.currency || (stock.country === "IN" ? "INR" : "USD"),
      logo: stock.logo || "",
    });
    setVerifyResult(null);
    setStockSuccess("");
    setActionError("");
    setWorkspaceTab("STOCKS");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    const finalSymbol = editingStockId
      ? stockForm.symbol
      : getFormattedSymbol(stockForm.symbol, stockForm.exchange);
    const finalSector = isCustomSector ? customSectorInput.trim() : stockForm.sector;

    if (!finalSymbol || !stockForm.companyName.trim() || !finalSector) {
      setActionError("Symbol, company name, and sector are required");
      return;
    }

    setSavingStock(true);
    setActionError("");
    setStockSuccess("");
    try {
      const payload = {
        symbol: finalSymbol,
        companyName: stockForm.companyName.trim(),
        sector: finalSector,
        exchange: stockForm.exchange,
        country: stockForm.country,
        currency: stockForm.currency,
        logo: stockForm.logo.trim(),
      };

      if (editingStockId) {
        await API.put(`/admin/stocks/${editingStockId}`, payload);
        setStockSuccess(`${finalSymbol} successfully updated.`);
      } else {
        await API.post("/admin/stocks", payload);
        setStockSuccess(`${finalSymbol} successfully listed on ${stockForm.exchange}.`);
      }
      resetStockForm();
      fetchStocks();
      fetchOverview();
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to save stock");
    } finally {
      setSavingStock(false);
    }
  };

  const handleDeleteStock = async (stock) => {
    setActionError("");
    try {
      await API.delete(`/admin/stocks/${stock._id}`);
      fetchStocks();
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to delete stock");
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setUserPage(1);
    fetchUsers(search);
  };

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

  const handleAddFunds = async (user) => {
    if (processingUserId) return;
    const choice = window.prompt(
      `ADD VIRTUAL FUNDS / MARGIN for ${user.name || user.email}\n` +
      `Current: ${formatINR(user.balance || 0)} INR • ${formatUSD(user.balanceUSD ?? 10000)} USD\n\n` +
      `Enter amount to ADD to margin:\n` +
      `• For INR: Enter amount (e.g. 1000000) or 'INR <amount>'\n` +
      `• For USD: Type 'USD <amount>' (e.g. USD 10000)\n\n` +
      `Note: Existing stock positions and trade history will NOT be affected.`,
      "1000000"
    );
    if (choice === null) return;
    const trimmed = choice.trim();
    if (!trimmed) return;

    let payload;
    if (trimmed.toUpperCase().startsWith("USD")) {
      const amt = Number(trimmed.slice(3).trim());
      if (Number.isNaN(amt) || amt <= 0) {
        setActionError("Enter a valid positive number for USD funds");
        return;
      }
      payload = { addBalanceUSD: amt };
    } else {
      const cleanStr = trimmed.toUpperCase().startsWith("INR") ? trimmed.slice(3).trim() : trimmed;
      const amt = Number(cleanStr);
      if (Number.isNaN(amt) || amt <= 0) {
        setActionError("Enter a valid positive number for INR funds");
        return;
      }
      payload = { addBalance: amt };
    }

    setProcessingUserId(user._id);
    setActionError("");
    try {
      await API.put(`/admin/users/${user._id}/balance`, payload);
      await fetchUsers();
      await fetchAdminLeaderboard();
      fetchAuditLog();
      if (detailUser && detailUser.user?._id === user._id) {
        const { data } = await API.get(`/admin/users/${user._id}`);
        setDetailUser(data);
      }
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to add funds");
    } finally {
      setTimeout(() => setProcessingUserId(null), 500);
    }
  };

  const handleResetAtoZ = async (user) => {
    if (processingUserId) return;
    const confirmed = window.confirm(
      `⚠️ FULL A-TO-Z ACCOUNT RESET for ${user.name || user.email} (${user.email})\n\n` +
      `This will completely wipe and reset their trading account:\n` +
      `1. Clear all active stock holdings (invested becomes ₹0 / $0)\n` +
      `2. Clear all trade execution & transaction history\n` +
      `3. Cancel all pending Take-Profit & Stop-Loss orders\n` +
      `4. Restore starting cash balance to ₹1,00,000 INR & $10,000 USD\n` +
      `5. Reset competition P&L and ROI to 0.00%\n\n` +
      `Are you sure you want to proceed with full Reset A to Z?`
    );
    if (!confirmed) return;

    setProcessingUserId(user._id);
    setActionError("");
    try {
      await API.put(`/admin/users/${user._id}/balance`, { fullReset: true });
      await fetchUsers();
      await fetchAdminLeaderboard();
      fetchAuditLog();
      if (detailUser && detailUser.user?._id === user._id) {
        setDetailUser(null);
      }
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to reset account");
    } finally {
      setTimeout(() => setProcessingUserId(null), 500);
    }
  };

  const resetBalance = handleAddFunds;

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

  const nseCount = stocks.filter((s) => s.exchange === "NSE").length;
  const bseCount = stocks.filter((s) => s.exchange === "BSE").length;
  const nyseCount = stocks.filter((s) => s.exchange === "NYSE").length;
  const nasdaqCount = stocks.filter((s) => s.exchange === "NASDAQ").length;

  const filteredStocks = stocks.filter((s) => {
    if (stockExchangeFilter !== "ALL" && s.exchange !== stockExchangeFilter) {
      return false;
    }
    if (!stockSearchQuery.trim()) return true;
    const q = stockSearchQuery.toLowerCase().trim();
    return (
      s.symbol.toLowerCase().includes(q) ||
      s.companyName.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q) ||
      (s.exchange && s.exchange.toLowerCase().includes(q))
    );
  });

  const activeExchangeConfig =
    EXCHANGES.find((e) => e.id === stockForm.exchange) || EXCHANGES[0];
  const liveFormattedPreview = getFormattedSymbol(stockForm.symbol, stockForm.exchange);
  const effectiveMarketOpenIN =
    marketStatusIN === "ACTIVE" || marketStatusIN === "TIMED_OPEN";
  const effectiveMarketOpenUS =
    marketStatusUS === "ACTIVE" || marketStatusUS === "TIMED_OPEN";

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
        <button
          type="button"
          className={`workspace-tab-btn ${workspaceTab === "INVESTORS" ? "active" : ""}`}
          onClick={() => setWorkspaceTab("INVESTORS")}
        >
          <FiUsers />
          <span>Investors</span>
          <span className="tab-counter">{stats?.totalUsers ?? userPagination?.total ?? users.length}</span>
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${workspaceTab === "STOCKS" ? "active" : ""}`}
          onClick={() => setWorkspaceTab("STOCKS")}
        >
          <FiPackage />
          <span>Manage Stocks</span>
          <span className="tab-counter">{stocks.length}</span>
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${workspaceTab === "LEAGUES" ? "active" : ""}`}
          onClick={() => {
            setWorkspaceTab("LEAGUES");
            fetchAdminLeaderboard();
          }}
        >
          <FiActivity />
          <span>Trading Leagues</span>
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${workspaceTab === "MARKET" ? "active" : ""}`}
          onClick={() => setWorkspaceTab("MARKET")}
        >
          <FiToggleRight />
          <span>Market Engine</span>
          <span className={`tab-indicator-dot ${marketOpen ? "open" : "closed"}`} />
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${workspaceTab === "BROADCASTS" ? "active" : ""}`}
          onClick={() => setWorkspaceTab("BROADCASTS")}
        >
          <FiBell />
          <span>Broadcasts</span>
          {sentNotifications.length > 0 && (
            <span className="tab-counter">{sentNotifications.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${workspaceTab === "AUDIT" ? "active" : ""}`}
          onClick={() => setWorkspaceTab("AUDIT")}
        >
          <FiClock />
          <span>Audit Trail</span>
        </button>
      </nav>

      {/* ================= WORKSPACE PANEL 1: INVESTORS ================= */}
      {workspaceTab === "INVESTORS" && (
        <section className="admin-card">
          {actionError && <div className="admin-alert">{actionError}</div>}
          <div className="admin-card-top">
            <div>
              <div className="section-title-row">
                <h2>Investor Accounts Directory</h2>
                <span className="directory-page-pill">
                  Showing {users.length} of {userPagination?.total ?? stats?.totalUsers ?? users.length} investors (Page {userPage} of {userPagination?.totalPages || 1})
                </span>
              </div>
              <p className="admin-subtext">
                Manage accounts, inspect portfolios, adjust margin allowances, and administer roles.
              </p>
            </div>

            <form className="admin-search" onSubmit={handleSearchSubmit}>
              <FiSearch />
              <input
                type="text"
                placeholder="Search investor by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table admin-users-table">
              <thead>
                <tr>
                  <th>Investor Account</th>
                  <th>Total Portfolio (₹1L / $10k)</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td className="user-acc-cell">
                      <strong className="user-name-text" title={u.name}>{u.name}</strong>
                      <div className="user-email-cell" title={u.email}>{u.email}</div>
                    </td>
                    <td>
                      <div className="user-portfolio-cell">
                        <div className="port-stat-row">
                          <span className="cur-tag inr">IN</span>
                          <span className="port-val">{formatINR(u.portfolioStats?.inr?.netWorth || u.balance || 100000)}</span>
                          <span className={`roi-tag ${(u.portfolioStats?.inr?.roi ?? 0) >= 0 ? "profit" : "loss"}`}>
                            {(u.portfolioStats?.inr?.roi ?? 0) >= 0 ? "+" : ""}{(u.portfolioStats?.inr?.roi ?? 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="port-stat-row">
                          <span className="cur-tag usd">US</span>
                          <span className="port-val">{formatUSD(u.portfolioStats?.usd?.netWorth || (u.balanceUSD ?? 10000))}</span>
                          <span className={`roi-tag ${(u.portfolioStats?.usd?.roi ?? 0) >= 0 ? "profit" : "loss"}`}>
                            {(u.portfolioStats?.usd?.roi ?? 0) >= 0 ? "+" : ""}{(u.portfolioStats?.usd?.roi ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-pill ${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${u.isActive ? "active" : "suspended"}`}>
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="user-date-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="admin-actions-cell">
                      <div className="admin-actions-grid">
                        <div className="admin-actions-row">
                          <button
                            type="button"
                            className="action-btn view"
                            onClick={() => openUserDetail(u)}
                            disabled={processingUserId === u._id}
                            title="View Full Portfolio & Transactions"
                          >
                            <FiEye /> View
                          </button>
                          <button
                            type="button"
                            className="action-btn add-funds"
                            onClick={() => handleAddFunds(u)}
                            disabled={processingUserId === u._id}
                            title="Add Funds / Virtual Margin"
                          >
                            <FiPlusCircle /> +Funds
                          </button>
                          <button
                            type="button"
                            className="action-btn reset-atoz"
                            onClick={() => handleResetAtoZ(u)}
                            disabled={processingUserId === u._id}
                            title="Full Reset A-to-Z"
                          >
                            <FiRefreshCw /> Reset
                          </button>
                        </div>
                        <div className="admin-actions-row">
                          <button
                            type="button"
                            className={`action-btn role ${u.role === "admin" ? "demote" : "promote"}`}
                            onClick={() => toggleUserRole(u)}
                            disabled={processingUserId === u._id}
                            title={u.role === "admin" ? "Demote Admin" : "Make Admin"}
                          >
                            <FiShield /> {processingUserId === u._id ? "..." : (u.role === "admin" ? "Demote" : "Admin")}
                          </button>
                          <button
                            type="button"
                            className={`action-btn ${u.isActive ? "suspend" : "reactivate"}`}
                            onClick={() => toggleUserStatus(u)}
                            disabled={processingUserId === u._id}
                            title={u.isActive ? "Suspend Access" : "Reactivate Access"}
                          >
                            {u.isActive ? <FiAlertTriangle /> : <FiCheckCircle />}
                            {u.isActive ? "Suspend" : "Active"}
                          </button>
                          {u.email !== "admin@stocksim.com" && (
                            <button
                              type="button"
                              className="action-btn delete icon-only"
                              onClick={() => handleDeleteUser(u)}
                              disabled={processingUserId === u._id}
                              title="Delete User Permanently"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-empty">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {userPagination && userPagination.totalPages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="pagination-btn"
                disabled={userPage <= 1}
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
              >
                <FiChevronLeft /> Previous
              </button>
              <span className="pagination-text">
                Page <strong>{userPagination.page}</strong> of <strong>{userPagination.totalPages}</strong>
              </span>
              <button
                type="button"
                className="pagination-btn"
                disabled={userPage >= userPagination.totalPages}
                onClick={() => setUserPage((p) => p + 1)}
              >
                Next <FiChevronRight />
              </button>
            </div>
          )}

          {stats?.mostTradedSymbols?.length > 0 && (
            <div className="admin-card-footer-strip">
              <span className="footer-strip-label">🔥 Most Traded Across Platform:</span>
              <div className="most-traded-list">
                {stats.mostTradedSymbols.map((s) => (
                  <span key={s.symbol} className="most-traded-pill">
                    {s.symbol} <strong>{s.trades} trades</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ================= WORKSPACE PANEL 2: MULTI-EXCHANGE STOCKS ================= */}
      {workspaceTab === "STOCKS" && (
        <section className="admin-card new-stock-listing-card">
          {actionError && <div className="admin-alert">{actionError}</div>}
          {/* Header Bar */}
          <div className="listing-console-header">
            <div className="listing-title-group">
              <h2>{editingStockId ? "Edit Listed Equity" : "List New Stock on Exchange"}</h2>
            </div>

            <div className="listing-header-aside">
              <div className="live-engine-status-chip">
                <span className="pulse-dot green" />
                <div className="engine-status-text">
                  <span className="engine-status-sub">Data Feed Engine</span>
                  <strong>Yahoo Finance Live</strong>
                </div>
              </div>
              {editingStockId && (
                <button type="button" className="studio-cancel-edit-btn" onClick={resetStockForm}>
                  Cancel Editing
                </button>
              )}
            </div>
          </div>

          {stockSuccess && <div className="admin-success">{stockSuccess}</div>}

          {/* Unified Provisioning Form */}
          <form className="listing-workbench-form" onSubmit={handleStockSubmit}>
            {/* Step 1: Market & Exchange Selection */}
            <div className="listing-step-block">
              <div className="listing-step-heading">
                <span className="step-num">01</span>
                <div>
                  <h3>Select Target Market & Exchange</h3>
                  <p>Choose the target jurisdiction and underlying exchange for this asset.</p>
                </div>
              </div>

              <div className="market-choice-grid">
                {/* Indian Market Choice Card */}
                <div
                  className={`market-choice-card ${stockForm.country === "IN" ? "active" : ""}`}
                  onClick={() => handleSelectExchange("NSE")}
                >
                  <div className="market-choice-top">
                    <div className="market-flag-title">
                      <span className="choice-flag">🇮🇳</span>
                      <div>
                        <strong>Indian Equities</strong>
                        <span className="choice-sub">NSE & BSE • INR (₹)</span>
                      </div>
                    </div>
                    {stockForm.country === "IN" && <span className="choice-active-check"><FiCheckCircle /></span>}
                  </div>

                  <div className="choice-exchange-pills">
                    <button
                      type="button"
                      className={`exchange-sub-pill ${stockForm.exchange === "NSE" ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectExchange("NSE");
                      }}
                    >
                      <strong>NSE</strong>
                      <span>National Stock Exchange (.NS)</span>
                    </button>
                    <button
                      type="button"
                      className={`exchange-sub-pill ${stockForm.exchange === "BSE" ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectExchange("BSE");
                      }}
                    >
                      <strong>BSE</strong>
                      <span>Bombay Stock Exchange (.BO)</span>
                    </button>
                  </div>
                </div>

                {/* US Market Choice Card */}
                <div
                  className={`market-choice-card ${stockForm.country === "US" ? "active" : ""}`}
                  onClick={() => handleSelectExchange("NASDAQ")}
                >
                  <div className="market-choice-top">
                    <div className="market-flag-title">
                      <span className="choice-flag">🇺🇸</span>
                      <div>
                        <strong>US Equities</strong>
                        <span className="choice-sub">NASDAQ & NYSE • USD ($)</span>
                      </div>
                    </div>
                    {stockForm.country === "US" && <span className="choice-active-check"><FiCheckCircle /></span>}
                  </div>

                  <div className="choice-exchange-pills">
                    <button
                      type="button"
                      className={`exchange-sub-pill ${stockForm.exchange === "NASDAQ" ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectExchange("NASDAQ");
                      }}
                    >
                      <strong>NASDAQ</strong>
                      <span>Global Tech Market</span>
                    </button>
                    <button
                      type="button"
                      className={`exchange-sub-pill ${stockForm.exchange === "NYSE" ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectExchange("NYSE");
                      }}
                    >
                      <strong>NYSE</strong>
                      <span>New York Stock Exchange</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Ticker Lookup & 1-Click Yahoo Auto-Fetch */}
            <div className="listing-step-block">
              <div className="listing-step-heading">
                <span className="step-num">02</span>
                <div>
                  <h3>Lookup Ticker & Auto-Fetch Live Data</h3>
                  <p>Enter the company symbol. Live prices, day high/low, and company name are verified instantly.</p>
                </div>
              </div>

              <div className="ticker-lookup-workbench">
                <div className="ticker-search-field">
                  <label className="field-micro-label">
                    Stock Symbol or Company Name:
                    <span className="field-suffix-note">
                      {stockForm.exchange === "NSE"
                        ? "Enter ticker (TATAPOWER) or name (Tata Power) • .NS auto-appended"
                        : stockForm.exchange === "BSE"
                        ? "Enter ticker or name • .BO auto-appended"
                        : "Enter ticker (SNOW, AAPL) or company name (Snowflake, Apple)"}
                    </span>
                  </label>
                  <div className="ticker-input-row">
                    <div className="ticker-input-box">
                      <FiSearch className="ticker-search-icon" />
                      <input
                        type="text"
                        className="symbol-text-input"
                        placeholder={activeExchangeConfig.placeholder}
                        value={stockForm.symbol}
                        onChange={(e) => {
                          setStockForm({ ...stockForm, symbol: e.target.value });
                          setVerifyResult(null);
                        }}
                        maxLength={40}
                        disabled={!!editingStockId}
                      />
                      {stockForm.symbol.trim() && (
                        <div className="ticker-live-pill">
                          <span>Ticker:</span>
                          <strong>{liveFormattedPreview}</strong>
                          <span className="tag-cur">{stockForm.currency}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="auto-fetch-cta-btn"
                      onClick={handleVerifySymbol}
                      disabled={verifyingSymbol || !stockForm.symbol.trim()}
                    >
                      <FiRefreshCw className={verifyingSymbol ? "spin-icon" : ""} />
                      {verifyingSymbol ? "Verifying..." : "⚡ Auto-Fetch Details"}
                    </button>
                  </div>
                </div>

                {/* Live Verified Card Preview */}
                {verifyResult && (
                  <div className={`live-quote-card ${verifyResult.success ? "success" : "error"}`}>
                    {verifyResult.success ? (
                      <>
                        <div className="live-quote-top">
                          <div className="quote-status-badge">
                            <span className="pulse-dot green" />
                            <strong>Verified Live on Yahoo Finance</strong>
                          </div>
                          <span className="quote-currency-pill">{verifyResult.currency}</span>
                        </div>

                        {verifyResult.autoResolved && (
                          <div
                            className="quote-autoresolve-badge"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 12px",
                              background: "rgba(99, 102, 241, 0.12)",
                              border: "1px solid rgba(99, 102, 241, 0.28)",
                              borderRadius: "8px",
                              fontSize: "0.83rem",
                              color: "#818cf8",
                              margin: "8px 0 12px 0",
                            }}
                          >
                            <FiCheckCircle size={16} />
                            <span>
                              Auto-matched company <strong>"{verifyResult.originalInput}"</strong> &rarr; Resolved ticker to{" "}
                              <strong>{verifyResult.cleanSymbol || verifyResult.symbol}</strong>
                            </span>
                          </div>
                        )}

                        <div className="live-quote-main">
                          <div>
                            <h4 className="quote-company-name">
                              {verifyResult.shortName || stockForm.companyName || liveFormattedPreview}
                            </h4>
                            <span className="quote-symbol-code">{verifyResult.symbol} • {stockForm.exchange}</span>
                          </div>
                          <div className="quote-price-wrap">
                            <span className="quote-live-price">
                              {verifyResult.currency === "INR" ? "₹" : "$"}{verifyResult.price?.toFixed(2)}
                            </span>
                            <span className={`quote-change ${(verifyResult.changePercent || 0) >= 0 ? "positive" : "negative"}`}>
                              {(verifyResult.changePercent || 0) >= 0 ? "+" : ""}{verifyResult.change?.toFixed(2)} (
                              {(verifyResult.changePercent || 0) >= 0 ? "+" : ""}{verifyResult.changePercent?.toFixed(2)}%)
                            </span>
                          </div>
                        </div>

                        <div className="live-quote-metrics-strip">
                          <div className="metric-chip">
                            <span className="metric-lbl">Day High</span>
                            <strong>{verifyResult.high ? (verifyResult.currency === "INR" ? "₹" : "$") + verifyResult.high.toFixed(2) : "—"}</strong>
                          </div>
                          <div className="metric-chip">
                            <span className="metric-lbl">Day Low</span>
                            <strong>{verifyResult.low ? (verifyResult.currency === "INR" ? "₹" : "$") + verifyResult.low.toFixed(2) : "—"}</strong>
                          </div>
                          <div className="metric-chip">
                            <span className="metric-lbl">Prev Close</span>
                            <strong>{verifyResult.previousClose ? (verifyResult.currency === "INR" ? "₹" : "$") + verifyResult.previousClose.toFixed(2) : "—"}</strong>
                          </div>
                          <div className="metric-chip">
                            <span className="metric-lbl">Volume</span>
                            <strong>{verifyResult.volume ? verifyResult.volume.toLocaleString() : "—"}</strong>
                          </div>
                          <div className="metric-chip">
                            <span className="metric-lbl">Market Cap</span>
                            <strong>{verifyResult.marketCap ? (verifyResult.currency === "INR" ? "₹" : "$") + (verifyResult.marketCap / 1e9).toFixed(2) + "B" : "—"}</strong>
                          </div>
                        </div>

                        {verifyResult.suggestions && verifyResult.suggestions.length > 1 && (
                          <div
                            className="quote-suggestions-strip"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              flexWrap: "wrap",
                              marginTop: "12px",
                              paddingTop: "10px",
                              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            }}
                          >
                            <span style={{ fontSize: "0.78rem", opacity: 0.75 }}>Other matches:</span>
                            {verifyResult.suggestions.slice(1).map((sug) => (
                              <button
                                key={sug.symbol}
                                type="button"
                                style={{
                                  background: "rgba(255, 255, 255, 0.06)",
                                  border: "1px solid rgba(255, 255, 255, 0.15)",
                                  borderRadius: "14px",
                                  padding: "3px 10px",
                                  fontSize: "0.75rem",
                                  color: "inherit",
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  setStockForm((prev) => ({
                                    ...prev,
                                    symbol: sug.symbol.replace(/\.(NS|BO)$/, ""),
                                    companyName: sug.name,
                                  }));
                                }}
                              >
                                <strong>{sug.symbol}</strong> • {sug.name}
                              </button>
                            ))}
                          </div>
                        )}

                        <p className="quote-ready-note">
                          ✅ Live quote verified. Company name has been auto-filled below. Click <strong>"List Stock on Trading Terminal"</strong> to make it active.
                        </p>
                      </>
                    ) : (
                      <div className="quote-error-box">
                        <FiAlertTriangle className="verify-icon" />
                        <div>
                          <strong>Yahoo Finance Verification Notice:</strong>
                          <p>{verifyResult.message}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Asset Profile & Specifications */}
            <div className="listing-step-block">
              <div className="listing-step-heading">
                <span className="step-num">03</span>
                <div>
                  <h3>Asset Profile & Metadata</h3>
                  <p>Confirm the company name, sector classification, and optional branding asset.</p>
                </div>
              </div>

              <div className="asset-profile-grid">
                {/* Company Name */}
                <div className="profile-field-item">
                  <label className="field-micro-label">Company Name:</label>
                  <input
                    type="text"
                    className="profile-input"
                    placeholder="Auto-filled from Yahoo Finance (or edit manually)"
                    value={stockForm.companyName}
                    onChange={(e) => setStockForm({ ...stockForm, companyName: e.target.value })}
                    maxLength={150}
                  />
                </div>

                {/* Industry Sector */}
                <div className="profile-field-item">
                  <label className="field-micro-label">Industry Sector:</label>
                  <select
                    className="profile-select"
                    value={isCustomSector ? "CUSTOM" : stockForm.sector}
                    onChange={(e) => {
                      if (e.target.value === "CUSTOM") {
                        setIsCustomSector(true);
                      } else {
                        setIsCustomSector(false);
                        setStockForm({ ...stockForm, sector: e.target.value });
                      }
                    }}
                  >
                    {SECTOR_PRESETS.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                    <option value="CUSTOM">➕ Custom Industry Sector...</option>
                  </select>

                  {isCustomSector && (
                    <input
                      type="text"
                      className="profile-input custom-sector-input"
                      placeholder="Enter custom sector (e.g. Clean Energy, Fintech)"
                      value={customSectorInput}
                      onChange={(e) => setCustomSectorInput(e.target.value)}
                      maxLength={80}
                    />
                  )}
                </div>

                {/* Logo URL */}
                <div className="profile-field-item">
                  <label className="field-micro-label">Logo URL (Optional):</label>
                  <input
                    type="text"
                    className="profile-input"
                    placeholder="https://example.com/logo.png"
                    value={stockForm.logo}
                    onChange={(e) => setStockForm({ ...stockForm, logo: e.target.value })}
                    maxLength={500}
                  />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="listing-actions-bar">
              <div className="actions-left">
                <button type="submit" className="primary-list-stock-btn" disabled={savingStock}>
                  {editingStockId ? <FiEdit2 /> : <FiZap />}
                  {savingStock ? "Listing Stock..." : editingStockId ? "Save Stock Updates" : "List Stock on Trading Terminal →"}
                </button>
                {editingStockId && (
                  <button type="button" className="studio-cancel-btn" onClick={resetStockForm}>
                    Cancel
                  </button>
                )}
              </div>

              <div className="actions-hint">
                <span className="instant-trading-indicator">
                  <span className="pulse-dot blue" />
                  Instant Availability: Tradable immediately upon listing
                </span>
              </div>
            </div>
          </form>

          {/* Integrated Ticker Conventions & Live Data Notice Strip */}
          <div className="listing-rules-footer-strip">
            <span className="rules-strip-badge">💡 Suffix Guide</span>
            <div className="rules-strip-items">
              <span><strong>NSE:</strong> Append <code>.NS</code> (e.g. <code>RELIANCE.NS</code>)</span>
              <span className="dot-sep">•</span>
              <span><strong>BSE:</strong> Append <code>.BO</code> (e.g. <code>500325.BO</code>)</span>
              <span className="dot-sep">•</span>
              <span><strong>US:</strong> Standard ticker (e.g. <code>AAPL</code>, <code>NVDA</code>)</span>
              <span className="dot-sep">•</span>
              <span><strong>100% Real-time:</strong> Quotes, intraday charts, and volume stream live from Yahoo Finance.</span>
            </div>
          </div>

          {/* Tradable Universe Directory */}
          <div className="stocks-directory-header">
            <div>
              <h3>Tradable Universe Directory ({stocks.length})</h3>
              <p className="admin-subtext">Filter and search all active stocks currently listed across all markets.</p>
            </div>

            <div className="stocks-search-box">
              <FiSearch />
              <input
                type="text"
                placeholder="Filter by symbol, company, or sector..."
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
              />
              {stockSearchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setStockSearchQuery("")}
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>

          {/* Exchange Filter Tabs */}
          <div className="stock-exchange-filter-bar">
            <button
              type="button"
              className={`exch-filter-btn ${stockExchangeFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStockExchangeFilter("ALL")}
            >
              All Listed ({stocks.length})
            </button>
            <button
              type="button"
              className={`exch-filter-btn ${stockExchangeFilter === "NSE" ? "active" : ""}`}
              onClick={() => setStockExchangeFilter("NSE")}
            >
              🇮🇳 NSE ({nseCount})
            </button>
            <button
              type="button"
              className={`exch-filter-btn ${stockExchangeFilter === "BSE" ? "active" : ""}`}
              onClick={() => setStockExchangeFilter("BSE")}
            >
              🇮🇳 BSE ({bseCount})
            </button>
            <button
              type="button"
              className={`exch-filter-btn ${stockExchangeFilter === "NYSE" ? "active" : ""}`}
              onClick={() => setStockExchangeFilter("NYSE")}
            >
              🇺🇸 NYSE ({nyseCount})
            </button>
            <button
              type="button"
              className={`exch-filter-btn ${stockExchangeFilter === "NASDAQ" ? "active" : ""}`}
              onClick={() => setStockExchangeFilter("NASDAQ")}
            >
              🇺🇸 NASDAQ ({nasdaqCount})
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company</th>
                  <th>Exchange</th>
                  <th>Market & Currency</th>
                  <th>Sector</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((s) => {
                  const isIN = s.country === "IN" || s.exchange === "NSE" || s.exchange === "BSE";
                  return (
                    <tr key={s._id}>
                      <td>
                        <div className="stock-symbol-cell">
                          <strong className="stock-symbol-code">{s.symbol}</strong>
                          <span className={`market-flag-tag ${isIN ? "in" : "us"}`}>
                            {isIN ? "🇮🇳 IN" : "🇺🇸 US"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="stock-company-cell">
                          {s.logo ? (
                            <img
                              src={s.logo}
                              alt={s.symbol}
                              className="stock-thumb-logo"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="stock-initials-badge">
                              {s.symbol.slice(0, 2)}
                            </span>
                          )}
                          <span className="stock-company-title">{s.companyName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`exchange-pill ${s.exchange?.toLowerCase()}`}>
                          {s.exchange || (isIN ? "NSE" : "NASDAQ")}
                        </span>
                      </td>
                      <td>
                        <div className="market-currency-cell">
                          <span className={`cur-tag ${isIN ? "inr" : "usd"}`}>
                            {isIN ? "INR (₹)" : "USD ($)"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="sector-pill">{s.sector}</span>
                      </td>
                      <td className="admin-actions">
                        <a
                          href={`/market/${encodeURIComponent(s.symbol)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn test-trade"
                          title="Open live trading terminal for this stock"
                        >
                          <FiExternalLink /> Test Trade
                        </a>
                        <button
                          type="button"
                          className="action-btn edit"
                          onClick={() => startEditStock(s)}
                          title="Edit Stock Details"
                        >
                          <FiEdit2 /> Edit
                        </button>
                        <button
                          type="button"
                          className="action-btn delete"
                          onClick={() => handleDeleteStock(s)}
                          title="Delist Stock from Market"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredStocks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-empty">
                      {stockSearchQuery
                        ? `No stocks match "${stockSearchQuery}" under this filter.`
                        : "No stocks listed for this exchange."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= WORKSPACE PANEL 3: COMPETITION LEAGUES ================= */}
      {workspaceTab === "LEAGUES" && (
        <section className="admin-card">
          <div className="admin-card-top">
            <div>
              <h2>Market Competition League</h2>
              <p className="admin-subtext">
                Live investor performance, portfolio net worth, and tournament standings.
              </p>
            </div>

            <div className="admin-league-toggle">
              <button
                type="button"
                className={`league-toggle-btn ${adminLeagueMode === "IN" ? "active" : ""}`}
                onClick={() => setAdminLeagueMode("IN")}
              >
                🇮🇳 ₹1 Lakh INR Championship
              </button>
              <button
                type="button"
                className={`league-toggle-btn ${adminLeagueMode === "US" ? "active" : ""}`}
                onClick={() => setAdminLeagueMode("US")}
              >
                🇺🇸 $10k USD Global League
              </button>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table admin-competition-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Investor</th>
                  <th>Portfolio Net Worth</th>
                  <th>Invested</th>
                  <th>Cash Margin</th>
                  <th>Capital Utilization</th>
                  <th>Overall P&L</th>
                  <th>ROI</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const leagueList =
                    adminLeagueMode === "IN"
                      ? adminLeaderboard.inrLeague
                      : adminLeaderboard.usdLeague;
                  const fmt = adminLeagueMode === "IN" ? formatINR : formatUSD;

                  if (!leagueList || leagueList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={9} className="admin-empty">
                          No competitor data available.
                        </td>
                      </tr>
                    );
                  }

                  return leagueList.map((item) => (
                    <tr key={item.userId}>
                      <td>
                        <span
                          className={`admin-rank-badge ${
                            item.rank === 1
                              ? "rank-1"
                              : item.rank === 2
                              ? "rank-2"
                              : item.rank === 3
                              ? "rank-3"
                              : "rank-other"
                          }`}
                        >
                          {item.rank === 1
                            ? "🥇"
                            : item.rank === 2
                            ? "🥈"
                            : item.rank === 3
                            ? "🥉"
                            : `#${item.rank}`}
                        </span>
                      </td>
                      <td>
                        <strong>{item.name}</strong>
                        <div className="user-email-cell">{item.email}</div>
                      </td>
                      <td>
                        <strong style={{ fontSize: "14px", fontFamily: "var(--font-mono, monospace)" }}>
                          {fmt(item.netWorth ?? item.totalNetWorth ?? 0)}
                        </strong>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono, monospace)" }}>
                        {fmt(item.invested ?? 0)}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono, monospace)" }}>
                        {fmt(item.cash ?? 0)}
                      </td>
                      <td>
                        <div className="cap-util-bar-wrap">
                          <div className="cap-util-bar-track">
                            <div
                              className="cap-util-bar-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0, item.capitalUtilization ?? item.utilization ?? 0))}%`,
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: "12px" }}>
                            {(item.capitalUtilization ?? item.utilization ?? 0).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const pnl = item.overallPL ?? item.profit ?? 0;
                          return (
                            <span
                              className={pnl >= 0 ? "profit-text" : "loss-text"}
                              style={{ fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}
                            >
                              {pnl >= 0 ? "+" : "-"}
                              {fmt(Math.abs(pnl))}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <span
                          className={`roi-tag ${(item.roi ?? 0) >= 0 ? "profit" : "loss"}`}
                          style={{ fontSize: "12px", padding: "3px 8px" }}
                        >
                          {(item.roi ?? 0) >= 0 ? "+" : ""}
                          {(item.roi ?? 0).toFixed(2)}%
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="action-btn view"
                          onClick={() => {
                            const found = users.find((u) => u._id === item.userId);
                            if (found) openUserDetail(found);
                            else openUserDetail({ _id: item.userId, name: item.name, email: item.email });
                          }}
                        >
                          <FiEye /> Inspect
                        </button>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= WORKSPACE PANEL 4: MARKET ENGINE ================= */}
      {workspaceTab === "MARKET" && (
        <section className="admin-card market-card">
          {actionError && <div className="admin-alert">{actionError}</div>}
          {marketSuccess && <div className="admin-success">{marketSuccess}</div>}
          <div className="market-card-top">
            <div>
              <div className="market-title-row">
                <h2>Market Simulation Engine Control</h2>
                <span className={`market-status-pill ${marketOpen && effectiveMarketOpenIN && effectiveMarketOpenUS ? "open" : "closed"}`}>
                  {marketOpen && effectiveMarketOpenIN && effectiveMarketOpenUS
                    ? "🟢 BOTH MARKETS ACTIVE"
                    : !marketOpen
                    ? "🔴 PLATFORM OVERRIDE PAUSED"
                    : "🟡 REGIONAL CONTROLS ENGAGED"}
                </span>
              </div>
            </div>
          </div>

          {/* Regional Market Control Cards */}
          <div className="market-desks-control-grid">
            {/* 🇮🇳 Indian Market Desk */}
            <div className="market-desk-box in">
              <div className="market-desk-box-header">
                <div className="market-desk-title-group">
                  <span className="desk-flag-icon">🇮🇳</span>
                  <div>
                    <h3>Indian Market (NSE / BSE)</h3>
                    <p>Trading in INR (₹) • 9:15 AM – 3:30 PM IST</p>
                  </div>
                </div>

                <div className="market-control-actions">
                  <span className={`market-status-pill ${effectiveMarketOpenIN ? "open" : "closed"}`}>
                    {effectiveMarketOpenIN ? "OPEN" : "CLOSED"}
                  </span>
                </div>
              </div>

              {marketStatusIN === "TIMED_OPEN" && marketOverrideUntilIN && (
                <p className="market-override-note">
                  ⏱️ Temporary override active until{" "}
                  {new Date(marketOverrideUntilIN).toLocaleString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  . Reverts to the normal schedule automatically.
                </p>
              )}

              <div className="market-message-row">
                <label>Indian market message</label>
                <div className="market-message-input">
                  <input
                    type="text"
                    value={marketMessageIN}
                    onChange={(e) => setMarketMessageIN(e.target.value)}
                    maxLength={300}
                    placeholder="Indian Market (NSE/BSE) trading is currently paused by admin..."
                  />
                  <button type="button" onClick={saveMarketMessageIN} disabled={savingMarket}>
                    {savingMarket ? "Applying..." : "Apply"}
                  </button>
                </div>
              </div>

              <div className="market-presets-row">
                <span className="preset-label">Quick Presets:</span>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => {
                    setMarketNoticeModeIN("SESSION");
                    setMarketMessageIN("✅ NSE/BSE maintenance complete. Normal market schedule restored.");
                  }}
                >
                  Resume Market
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => {
                    setMarketNoticeModeIN("HOLIDAY");
                    setMarketMessageIN("🪔 Market Holiday: NSE & BSE are closed today. Resuming next business day.");
                  }}
                >
                  Indian Holiday
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => {
                    setMarketNoticeModeIN("MAINTENANCE");
                    setMarketMessageIN("🛠️ NSE/BSE Maintenance: Upgrading live settlement engine.");
                  }}
                >
                  Maintenance
                </button>
                <button
                  type="button"
                  className={`preset-btn ${marketNoticeModeIN === "TIMED_OPEN" ? "active" : ""}`}
                  onClick={() => {
                    setMarketNoticeModeIN("TIMED_OPEN");
                    setMarketMessageIN(`⏱️ Temporary Open: NSE/BSE trading enabled for ${marketOverrideHoursIN}h outside normal hours.`);
                  }}
                >
                  Temporary Open
                </button>
              </div>

              {marketNoticeModeIN === "TIMED_OPEN" && (
                <div className="market-presets-row">
                  <span className="preset-label">Open for:</span>
                  {[1, 4, 8, 24].map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`preset-btn ${marketOverrideHoursIN === h ? "active" : ""}`}
                      onClick={() => {
                        setMarketOverrideHoursIN(h);
                        setMarketMessageIN(`⏱️ Temporary Open: NSE/BSE trading enabled for ${h}h outside normal hours.`);
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 🇺🇸 US Market Desk */}
            <div className="market-desk-box us">
              <div className="market-desk-box-header">
                <div className="market-desk-title-group">
                  <span className="desk-flag-icon">🇺🇸</span>
                  <div>
                    <h3>US Market (NYSE / NASDAQ)</h3>
                    <p>Trading in USD ($) • 9:30 AM – 4:00 PM EST</p>
                  </div>
                </div>

                <div className="market-control-actions">
                  <span className={`market-status-pill ${effectiveMarketOpenUS ? "open" : "closed"}`}>
                    {effectiveMarketOpenUS ? "OPEN" : "CLOSED"}
                  </span>
                </div>
              </div>

              {marketStatusUS === "TIMED_OPEN" && marketOverrideUntilUS && (
                <p className="market-override-note">
                  ⏱️ Temporary override active until{" "}
                  {new Date(marketOverrideUntilUS).toLocaleString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  . Reverts to the normal schedule automatically.
                </p>
              )}

              <div className="market-message-row">
                <label>US market message</label>
                <div className="market-message-input">
                  <input
                    type="text"
                    value={marketMessageUS}
                    onChange={(e) => setMarketMessageUS(e.target.value)}
                    maxLength={300}
                    placeholder="US Market (NYSE/Nasdaq) trading is currently paused by admin..."
                  />
                  <button type="button" onClick={saveMarketMessageUS} disabled={savingMarket}>
                    {savingMarket ? "Applying..." : "Apply"}
                  </button>
                </div>
              </div>

              <div className="market-presets-row">
                <span className="preset-label">Quick Presets:</span>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => {
                    setMarketNoticeModeUS("SESSION");
                    setMarketMessageUS("✅ US market maintenance complete. Normal market schedule restored.");
                  }}
                >
                  Resume Market
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => {
                    setMarketNoticeModeUS("HOLIDAY");
                    setMarketMessageUS("🇺🇸 US Bank Holiday: NYSE & NASDAQ are closed today.");
                  }}
                >
                  US Holiday
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => {
                    setMarketNoticeModeUS("MAINTENANCE");
                    setMarketMessageUS("🛠️ US Market Feed Maintenance: Updating live data stream.");
                  }}
                >
                  Maintenance
                </button>
                <button
                  type="button"
                  className={`preset-btn ${marketNoticeModeUS === "TIMED_OPEN" ? "active" : ""}`}
                  onClick={() => {
                    setMarketNoticeModeUS("TIMED_OPEN");
                    setMarketMessageUS(`⏱️ Temporary Open: US market trading enabled for ${marketOverrideHoursUS}h outside normal hours.`);
                  }}
                >
                  Temporary Open
                </button>
              </div>

              {marketNoticeModeUS === "TIMED_OPEN" && (
                <div className="market-presets-row">
                  <span className="preset-label">Open for:</span>
                  {[1, 4, 8, 24].map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`preset-btn ${marketOverrideHoursUS === h ? "active" : ""}`}
                      onClick={() => {
                        setMarketOverrideHoursUS(h);
                        setMarketMessageUS(`⏱️ Temporary Open: US market trading enabled for ${h}h outside normal hours.`);
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Master Global Kill Switch Box */}
          <div className="market-desk-box global">
            <div className="market-desk-box-header">
              <div className="market-desk-title-group">
                <span className="desk-flag-icon">🚨</span>
                <div>
                  <h3>Master Platform Emergency Kill Switch</h3>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`market-status-pill ${marketOpen ? "open" : "closed"}`}>
                  {marketOpen ? "🟢 PLATFORM LIVE" : "🔴 PLATFORM OVERRIDE HALTED"}
                </span>
                <button
                  type="button"
                  className={`desk-toggle-btn ${marketOpen ? "open" : "closed"}`}
                  onClick={toggleMarket}
                  disabled={savingMarket}
                >
                  {marketOpen ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />}
                  {savingMarket ? "Updating..." : marketOpen ? "Halt All Trading" : "Resume Global Trading"}
                </button>
              </div>
            </div>

            <div className="market-message-row">
              <label>Global maintenance message</label>
              <div className="market-message-input">
                <input
                  type="text"
                  value={marketMessage}
                  onChange={(e) => setMarketMessage(e.target.value)}
                  maxLength={300}
                  placeholder="Trading is currently paused by admin. Please check back soon..."
                />
                <button type="button" onClick={saveMarketMessage} disabled={savingMarket}>
                  Save Global Message
                </button>
              </div>
            </div>
          </div>

        </section>
      )}

      {/* ================= WORKSPACE PANEL 5: BROADCAST NOTIFICATIONS ================= */}
      {workspaceTab === "BROADCASTS" && (
        <section className="admin-card">
          {actionError && <div className="admin-alert">{actionError}</div>}
          <h2>
            <FiBell style={{ verticalAlign: "-2px", marginRight: 8 }} />
            Broadcast Notification to Investors
          </h2>
          <p className="admin-subtext">Send an alert or announcement to all user notification inboxes.</p>

          {notifSuccess && <div className="admin-success">{notifSuccess}</div>}

          <form className="notif-form" onSubmit={handleSendNotification}>
            <div className="notif-form-row">
              <input
                type="text"
                placeholder="Notification Title (e.g. US Market Hours Extended)"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                maxLength={150}
              />
              <select value={notifType} onChange={(e) => setNotifType(e.target.value)}>
                <option value="info">Info (Blue)</option>
                <option value="success">Success (Green)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="critical">Critical (Red)</option>
              </select>
            </div>
            <textarea
              placeholder="Notification Message content..."
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              maxLength={1000}
              rows={3}
            />
            <button type="submit" className="notif-send-btn" disabled={sendingNotif}>
              <FiSend />
              {sendingNotif ? "Sending Broadcast..." : "Broadcast to All Users"}
            </button>
          </form>

          <div className="sent-notifs-section">
            <h3>Recent Broadcast History ({sentNotifications.length})</h3>
            {sentNotifications.length > 0 ? (
              <ul className="sent-notif-list">
                {sentNotifications.map((n) => (
                  <li key={n._id}>
                    <span className={`notif-badge ${n.type}`}>{n.type}</span>
                    <div className="sent-notif-body">
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                      <span className="admin-subtext">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      className="sent-notif-delete"
                      onClick={() => handleDeleteNotification(n)}
                      title="Delete notification"
                    >
                      <FiTrash2 />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="admin-empty-box">No broadcast notifications sent yet.</div>
            )}
          </div>
        </section>
      )}

      {/* ================= WORKSPACE PANEL 6: AUDIT TRAIL ================= */}
      {workspaceTab === "AUDIT" && (
        <section className="admin-card">
          <div className="admin-card-top">
            <div>
              <h2>
                <FiClock style={{ verticalAlign: "-2px", marginRight: 8 }} />
                Admin Audit Trail
              </h2>
              <p className="admin-subtext">Immutable log of all administrative actions, stock changes, and user overrides.</p>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.actorEmail}</td>
                    <td>
                      <span className="audit-action-tag">{log.action.replaceAll("_", " ")}</span>
                    </td>
                    <td>
                      <strong>
                        {log.targetLabel ||
                          ({
                            MARKET: "Global Market",
                            MARKET_IN: "Indian Market (NSE/BSE)",
                            MARKET_US: "US Market (NYSE/Nasdaq)",
                          }[log.targetType] || "—")}
                      </strong>
                    </td>
                    <td>{log.details}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-empty">
                      No admin actions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {auditPagination && auditPagination.totalPages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="pagination-btn"
                disabled={auditPage <= 1}
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
              >
                <FiChevronLeft /> Previous
              </button>
              <span className="pagination-text">
                Page <strong>{auditPagination.page}</strong> of <strong>{auditPagination.totalPages}</strong>
              </span>
              <button
                type="button"
                className="pagination-btn"
                disabled={auditPage >= auditPagination.totalPages}
                onClick={() => setAuditPage((p) => p + 1)}
              >
                Next <FiChevronRight />
              </button>
            </div>
          )}
        </section>
      )}

      {/* -------- User detail modal -------- */}
      {(detailUser || detailLoading) && (
        <div className="admin-modal-overlay" onClick={() => setDetailUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setDetailUser(null)}>
              <FiX />
            </button>

            {detailLoading && !detailUser ? (
              <p>Loading…</p>
            ) : (
              <>
                <div className="admin-modal-user-header">
                  <div>
                    <div className="modal-title-row">
                      <h2>{detailUser.user.name}</h2>
                      <span className={`role-pill ${detailUser.user.role}`}>
                        {detailUser.user.role}
                      </span>
                      <span className={`status-pill ${detailUser.user.isActive ? "active" : "suspended"}`}>
                        {detailUser.user.isActive ? "Active" : "Suspended"}
                      </span>
                    </div>
                    <p className="admin-subtext">{detailUser.user.email} • Joined: {new Date(detailUser.user.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Market Switcher in Modal */}
                  <div className="admin-modal-market-tabs">
                    <button
                      type="button"
                      className={`modal-tab-btn ${modalMarketTab === "IN" ? "active inr" : ""}`}
                      onClick={() => setModalMarketTab("IN")}
                    >
                      🇮🇳 Indian Equities (₹)
                    </button>
                    <button
                      type="button"
                      className={`modal-tab-btn ${modalMarketTab === "US" ? "active usd" : ""}`}
                      onClick={() => setModalMarketTab("US")}
                    >
                      🇺🇸 US Equities ($)
                    </button>
                  </div>
                </div>

                {(() => {
                  const summary = detailUser.portfolioSummary || {};
                  const isIN = modalMarketTab === "IN";
                  const activeSum = isIN
                    ? summary.inr || {
                        totalNetWorth: detailUser.user.balance || 100000,
                        cash: detailUser.user.balance || 100000,
                        invested: 0,
                        currentHoldings: 0,
                        overallPL: (detailUser.user.balance || 100000) - 100000,
                        overallPLPercent: 0,
                      }
                    : summary.usd || {
                        totalNetWorth: detailUser.user.balanceUSD ?? 10000,
                        cash: detailUser.user.balanceUSD ?? 10000,
                        invested: 0,
                        currentHoldings: 0,
                        overallPL: (detailUser.user.balanceUSD ?? 10000) - 10000,
                        overallPLPercent: 0,
                      };

                  const formatFn = isIN ? formatINR : formatUSD;
                  const baseCapStr = isIN ? "₹1,00,000 (1 Lakh INR)" : "$10,000 (10k USD)";
                  const filteredHoldings = (detailUser.holdings || []).filter((h) =>
                    isIN ? h.currency === "INR" || h.symbol?.endsWith(".NS") || h.symbol?.endsWith(".BO")
                         : h.currency === "USD" || (!h.symbol?.endsWith(".NS") && !h.symbol?.endsWith(".BO"))
                  );

                  return (
                    <>
                      {/* GROWW-STYLE TWO-COLUMN EXECUTIVE HERO CARD */}
                      <div className="admin-groww-hero">
                        {/* Left Side: Portfolio Net Worth & Overall Returns */}
                        <div className="admin-groww-left">
                          <span className="admin-groww-label">
                            {isIN ? "🇮🇳 INDIAN PORTFOLIO NET WORTH" : "🇺🇸 US PORTFOLIO NET WORTH"}
                          </span>
                          <div className="admin-groww-val-row">
                            <strong className="admin-groww-networth">
                              {formatFn(activeSum.totalNetWorth)}
                            </strong>
                            <span
                              className={`groww-pnl-pill ${activeSum.overallPL >= 0 ? "profit" : "loss"}`}
                            >
                              {activeSum.overallPL >= 0 ? "+" : "-"}
                              {formatFn(Math.abs(activeSum.overallPL))} (
                              {activeSum.overallPL >= 0 ? "+" : ""}
                              {activeSum.overallPLPercent.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="admin-groww-sub-metrics">
                            <span>Invested: <strong>{formatFn(activeSum.invested)}</strong></span>
                            <span>•</span>
                            <span>Holdings: <strong>{formatFn(activeSum.currentHoldings)}</strong></span>
                            <span>•</span>
                            <span>Base: {baseCapStr}</span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="admin-groww-vdivider" />

                        {/* Right Side: Available Margin & Action */}
                        <div className="admin-groww-right">
                          <span className="admin-groww-label">AVAILABLE TO INVEST (MARGIN)</span>
                          <strong className="admin-groww-margin">
                            {formatFn(activeSum.cash)}
                          </strong>
                          <div className="admin-groww-actions">
                            <button
                              type="button"
                              className="admin-add-funds-btn"
                              onClick={() => {
                                handleAddFunds(detailUser.user);
                              }}
                            >
                              <FiPlusCircle /> Add Funds
                            </button>
                            <button
                              type="button"
                              className="admin-reset-margin-btn"
                              onClick={() => {
                                handleResetAtoZ(detailUser.user);
                              }}
                            >
                              <FiRefreshCw /> Reset A-Z
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ASSETS / HOLDINGS IN ACCOUNT */}
                      <div className="admin-modal-section">
                        <div className="admin-modal-sec-header">
                          <h3>Assets in Account ({filteredHoldings.length})</h3>
                          <span className="admin-subtext">Live Valuations & Cost Basis</span>
                        </div>

                        {filteredHoldings.length === 0 ? (
                          <div className="admin-empty-box">No active positions in this market.</div>
                        ) : (
                          <div className="admin-table-wrap">
                            <table className="admin-modal-table">
                              <thead>
                                <tr>
                                  <th>Asset / Stock</th>
                                  <th className="num-col">Shares</th>
                                  <th className="num-col">Avg. Cost</th>
                                  <th className="num-col">Market Price</th>
                                  <th className="num-col">Invested</th>
                                  <th className="num-col">Current Value</th>
                                  <th className="num-col">Total P&L</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredHoldings.map((h) => (
                                  <tr key={h._id || h.symbol}>
                                    <td>
                                      <div className="asset-name-block">
                                        <strong>{h.symbol}</strong>
                                        <span className="asset-sub-name">{h.companyName}</span>
                                      </div>
                                    </td>
                                    <td className="num-col"><strong>{h.quantity}</strong></td>
                                    <td className="num-col">{formatFn(h.avgPrice)}</td>
                                    <td className="num-col"><strong>{formatFn(h.currentPrice)}</strong></td>
                                    <td className="num-col">{formatFn(h.investedValue)}</td>
                                    <td className="num-col"><strong>{formatFn(h.currentValue)}</strong></td>
                                    <td className="num-col">
                                      <span className={h.pnl >= 0 ? "profit-text" : "loss-text"}>
                                        {h.pnl >= 0 ? "+" : "-"}{formatFn(Math.abs(h.pnl))} ({h.pnl >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%)
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* RECENT USER TRANSACTIONS */}
                      <div className="admin-modal-section">
                        <div className="admin-modal-sec-header">
                          <h3>Recent Execution History</h3>
                        </div>
                        {detailUser.recentTransactions.length === 0 ? (
                          <div className="admin-empty-box">No practice orders recorded yet.</div>
                        ) : (
                          <div className="admin-table-wrap">
                            <table className="admin-modal-table">
                              <thead>
                                <tr>
                                  <th>Date & Time</th>
                                  <th>Symbol</th>
                                  <th>Side</th>
                                  <th className="num-col">Shares</th>
                                  <th className="num-col">Execution Price</th>
                                  <th className="num-col">Total Volume</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailUser.recentTransactions.slice(0, 10).map((t) => {
                                  const isTxUS = t.currency === "USD" || (!t.symbol?.endsWith(".NS") && !t.symbol?.endsWith(".BO"));
                                  const symFmt = isTxUS ? formatUSD : formatINR;
                                  return (
                                    <tr key={t._id}>
                                      <td className="time-col">{new Date(t.createdAt).toLocaleString()}</td>
                                      <td><strong>{t.symbol}</strong></td>
                                      <td>
                                        <span className={`side-badge ${t.type.toLowerCase()}`}>
                                          {t.type}
                                        </span>
                                      </td>
                                      <td className="num-col">{t.quantity}</td>
                                      <td className="num-col">{symFmt(t.price)}</td>
                                      <td className="num-col"><strong>{symFmt(t.quantity * t.price)}</strong></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
