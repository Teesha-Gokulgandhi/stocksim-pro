import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiRefreshCw,
  FiArrowUpRight,
  FiSearch,
  FiBriefcase,
  FiPieChart,
  FiAward,
  FiDollarSign,
} from "react-icons/fi";

import API from "../../services/api";
import { useUser } from "../../context/UserContext";
import { useMarket } from "../../context/MarketContext";
import PageLoader from "../../components/common/PageLoader";
import "./Dashboard.css";

const STARTING_CAPITAL_INR = 100000; // 1 Lakh INR
const STARTING_CAPITAL_USD = 10000;  // 10k USD

function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const { setSelectedMarket, setMarketView } = useMarket();

  const [balance, setBalance] = useState(() => user?.balance || STARTING_CAPITAL_INR);
  const [balanceUSD, setBalanceUSD] = useState(() => user?.balanceUSD ?? STARTING_CAPITAL_USD);
  const [holdings, setHoldings] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ inrLeague: [], usdLeague: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMarketTab, setActiveMarketTab] = useState("IN"); // "IN" | "US" | "LEADERBOARD"
  const [leagueMode, setLeagueMode] = useState("IN"); // "IN" | "US" inside competition
  const [holdingSearch, setHoldingSearch] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [portfolioRes, transactionsRes, stocksRes, lbRes] = await Promise.all([
        API.get("/user/portfolio"),
        API.get("/user/transactions", { params: { limit: 50 } }),
        API.get("/stocks/live", { params: { limit: 100 } }),
        API.get("/user/leaderboard").catch(() => ({ data: { inrLeague: [], usdLeague: [] } })),
      ]);

      setBalance(portfolioRes.data.balance);
      setBalanceUSD(portfolioRes.data.balanceUSD ?? STARTING_CAPITAL_USD);
      setHoldings(portfolioRes.data.holdings || []);
      setTransactions(transactionsRes.data.transactions || []);
      setStocks(stocksRes.data.stocks || []);
      if (lbRes?.data) {
        setLeaderboard({
          inrLeague: lbRes.data.inrLeague || [],
          usdLeague: lbRes.data.usdLeague || [],
        });
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    await fetchAll();
  };

  const priceMap = useMemo(() => {
    const map = {};
    stocks.forEach((s) => (map[s.symbol] = s));
    return map;
  }, [stocks]);

  // Enrich each holding with live price & metadata
  const enrichedHoldings = useMemo(() => {
    return holdings
      .map((h) => {
        const live = priceMap[h.symbol];
        const isUSD =
          h.currency === "USD" ||
          (!h.symbol?.endsWith(".NS") && !h.symbol?.endsWith(".BO"));
        const curPrice = live?.currentPrice ?? h.avgPrice;
        const invested = h.avgPrice * h.quantity;
        const current = curPrice * h.quantity;
        const pnl = current - invested;
        const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
        const dayChangePercent = live?.changePercent ?? 0;

        return {
          ...h,
          companyName: live?.companyName || h.symbol,
          sector: live?.sector || "General",
          currentPrice: curPrice,
          dayChangePercent,
          invested,
          current,
          pnl,
          pnlPercent,
          isUSD,
        };
      })
      .filter((h) => h.quantity > 0);
  }, [holdings, priceMap]);

  // Filtered holdings by active tab and search
  const filteredHoldings = useMemo(() => {
    return enrichedHoldings.filter((h) => {
      const matchesTab =
        (activeMarketTab === "IN" && !h.isUSD) ||
        (activeMarketTab === "US" && h.isUSD);

      const q = holdingSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        h.symbol.toLowerCase().includes(q) ||
        h.companyName.toLowerCase().includes(q) ||
        h.sector.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [enrichedHoldings, activeMarketTab, holdingSearch]);

  // Indian Holdings metrics (Pure INR)
  const inMetrics = useMemo(() => {
    let invested = 0;
    let current = 0;
    let dayGain = 0;
    let count = 0;

    enrichedHoldings.forEach((h) => {
      if (!h.isUSD) {
        invested += h.invested;
        current += h.current;
        dayGain += (h.current * (h.dayChangePercent / 100));
        count += 1;
      }
    });

    const pl = current - invested;
    const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
    return { invested, current, pl, plPercent, dayGain, count };
  }, [enrichedHoldings]);

  // US Holdings metrics (Pure USD)
  const usMetrics = useMemo(() => {
    let invested = 0;
    let current = 0;
    let dayGain = 0;
    let count = 0;

    enrichedHoldings.forEach((h) => {
      if (h.isUSD) {
        invested += h.invested;
        current += h.current;
        dayGain += (h.current * (h.dayChangePercent / 100));
        count += 1;
      }
    });

    const pl = current - invested;
    const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
    return { invested, current, pl, plPercent, dayGain, count };
  }, [enrichedHoldings]);

  // Balances
  const activeINR = user?.balance != null ? user.balance : balance;
  const activeUSD = user?.balanceUSD != null ? user.balanceUSD : balanceUSD;

  const totalNetWorthINR = inMetrics.current + activeINR;
  const totalNetWorthUSD = usMetrics.current + activeUSD;

  // Calculate Realized P&L from executed SELL transactions
  const realizedPL = useMemo(() => {
    let inr = 0;
    let usd = 0;
    transactions.forEach((tx) => {
      if (tx.type === "SELL") {
        const isUSD = tx.currency === "USD" || (!tx.symbol?.endsWith(".NS") && !tx.symbol?.endsWith(".BO"));
        if (isUSD) {
          usd += (tx.netPnl || 0);
        } else {
          inr += (tx.netPnl || 0);
        }
      }
    });
    return { inr, usd };
  }, [transactions]);

  // Overall Trading P&L: Unrealized P&L on active holdings + Realized P&L from closed trades.
  // We prioritize the exact server-computed stats from leaderboard, aligned across all metrics.
  const myInrStats = leaderboard.inrLeague.find((p) => p.email === user?.email);
  const myUsdStats = leaderboard.usdLeague.find((p) => p.email === user?.email);

  const overallPL_INR = myInrStats != null
    ? myInrStats.profit
    : inMetrics.pl + realizedPL.inr;

  const overallPL_INR_Pct = myInrStats != null
    ? myInrStats.roi
    : (inMetrics.invested > 0 ? (overallPL_INR / inMetrics.invested) * 100 : 0);

  const overallPL_USD = myUsdStats != null
    ? myUsdStats.profit
    : usMetrics.pl + realizedPL.usd;

  const overallPL_USD_Pct = myUsdStats != null
    ? myUsdStats.roi
    : (usMetrics.invested > 0 ? (overallPL_USD / usMetrics.invested) * 100 : 0);

  // Allocation %
  const inEquityPct = Math.round((inMetrics.current / (totalNetWorthINR || 1)) * 100);
  const inCashPct = Math.max(0, 100 - inEquityPct);

  const usEquityPct = Math.round((usMetrics.current / (totalNetWorthUSD || 1)) * 100);
  const usCashPct = Math.max(0, 100 - usEquityPct);

  const formatINR = (val) =>
    (val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatUSD = (val) =>
    (val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleOpenMarket = (marketHub = activeMarketTab === "US" ? "US" : "IN") => {
    setSelectedMarket(marketHub);
    setMarketView("live");
    navigate("/market");
  };

  const handleStockClick = (symbol) => {
    const isUSD = !symbol.endsWith(".NS") && !symbol.endsWith(".BO");
    setSelectedMarket(isUSD ? "US" : "IN");
    navigate(`/market/${symbol}`);
  };

  if (loading) return <PageLoader />;

  const isUS = activeMarketTab === "US";
  const currencySymbol = isUS ? "$" : "₹";
  const activeNetWorth = isUS ? totalNetWorthUSD : totalNetWorthINR;
  const activeAvailableMargin = isUS ? activeUSD : activeINR;
  const activeInvested = isUS ? usMetrics.invested : inMetrics.invested;
  const activeHoldingsVal = isUS ? usMetrics.current : inMetrics.current;
  const activeOverallPL = isUS ? overallPL_USD : overallPL_INR;
  const activeOverallPLPct = isUS ? overallPL_USD_Pct : overallPL_INR_Pct;
  const activeDayGain = isUS ? usMetrics.dayGain : inMetrics.dayGain;
  const activeEquityPct = isUS ? usEquityPct : inEquityPct;
  const activeCashPct = isUS ? usCashPct : inCashPct;
  const activeMetrics = isUS ? usMetrics : inMetrics;

  // Find user's rank on leaderboard
  const myInrRank = leaderboard.inrLeague.find((p) => p.email === user?.email)?.rank || 1;
  const myUsdRank = leaderboard.usdLeague.find((p) => p.email === user?.email)?.rank || 1;

  return (
    <div className="groww-dashboard-page">

      {/* Top Header & Segmented Switcher */}
      <div className="groww-top-header">
        <div className="groww-title-area">
          <h1 className="groww-page-title">Portfolio Overview</h1>
          <p className="groww-page-subtitle">
            Live simulated portfolio tracking, real-time assets, and market competition leagues.
          </p>
        </div>

        <div className="groww-header-actions">
          {/* Segmented Market Tabs */}
          <div className="groww-segment-control">
            <button
              type="button"
              className={`groww-segment-btn ${activeMarketTab === "IN" ? "active" : ""}`}
              onClick={() => setActiveMarketTab("IN")}
            >
              🇮🇳 Indian Stocks
            </button>
            <button
              type="button"
              className={`groww-segment-btn ${activeMarketTab === "US" ? "active" : ""}`}
              onClick={() => setActiveMarketTab("US")}
            >
              🇺🇸 US Stocks
            </button>
            <button
              type="button"
              className={`groww-segment-btn ${activeMarketTab === "LEADERBOARD" ? "active" : ""}`}
              onClick={() => setActiveMarketTab("LEADERBOARD")}
            >
              🏆 Trading Competition
            </button>
          </div>

          <button
            type="button"
            className={`groww-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={handleManualRefresh}
            title="Recalculate with live Yahoo prices"
          >
            <FiRefreshCw />
            <span>{refreshing ? "Updating..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {activeMarketTab !== "LEADERBOARD" ? (
        <>
          {/* GROWW-STYLE HERO EXECUTIVE CARD (Clean, uncluttered, no redundant labels) */}
          <div className="groww-hero-card">
            {/* Left Column: Total Portfolio Value & Profit */}
            <div className="groww-card-left">
              <span className="groww-box-label">TOTAL PORTFOLIO VALUE</span>

              <div className="groww-val-row">
                <span className="groww-primary-val">
                  {currencySymbol}{isUS ? formatUSD(activeNetWorth) : formatINR(activeNetWorth)}
                </span>
                <span className={`groww-pnl-pill ${activeOverallPL >= 0 ? "profit" : "loss"}`}>
                  {activeOverallPL >= 0 ? "+" : "-"}{currencySymbol}{isUS ? formatUSD(Math.abs(activeOverallPL)) : formatINR(Math.abs(activeOverallPL))}
                  {" "}({activeOverallPL >= 0 ? "+" : ""}{activeOverallPLPct.toFixed(2)}%)
                </span>
              </div>

              <div className="groww-sub-metrics-row">
                <div className="groww-sub-metric">
                  <span className="sub-lbl">Invested</span>
                  <strong className="sub-val">
                    {currencySymbol}{isUS ? formatUSD(activeInvested) : formatINR(activeInvested)}
                  </strong>
                </div>
                <div className="groww-sub-divider" />
                <div className="groww-sub-metric">
                  <span className="sub-lbl">Current Holdings</span>
                  <strong className="sub-val">
                    {currencySymbol}{isUS ? formatUSD(activeHoldingsVal) : formatINR(activeHoldingsVal)}
                  </strong>
                </div>
                <div className="groww-sub-divider" />
                <div className="groww-sub-metric">
                  <span className="sub-lbl">1-Day Change</span>
                  <strong className={`sub-val ${activeDayGain >= 0 ? "profit-text" : "loss-text"}`}>
                    {activeDayGain >= 0 ? "+" : "-"}{currencySymbol}{isUS ? formatUSD(Math.abs(activeDayGain)) : formatINR(Math.abs(activeDayGain))}
                  </strong>
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="groww-card-vdivider" />

            {/* Right Column: Available to Invest & Allocation */}
            <div className="groww-card-right">
              <span className="groww-box-label">AVAILABLE TO INVEST (MARGIN)</span>

              <div className="groww-margin-val-row">
                <span className="groww-margin-val">
                  {currencySymbol}{isUS ? formatUSD(activeAvailableMargin) : formatINR(activeAvailableMargin)}
                </span>
              </div>

              {/* Asset Allocation Bar */}
              <div className="groww-allocation-block">
                <div className="groww-alloc-labels">
                  <span>{activeEquityPct}% Invested</span>
                  <span>{activeCashPct}% Margin Available</span>
                </div>
                <div className="groww-alloc-bar-track">
                  <div
                    className={`groww-alloc-bar-fill ${isUS ? "usd" : "inr"}`}
                    style={{ width: `${activeEquityPct}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="groww-hero-actions">
                <button
                  type="button"
                  className={`groww-trade-btn ${isUS ? "usd" : "inr"}`}
                  onClick={() => handleOpenMarket(isUS ? "US" : "IN")}
                >
                  <span>Explore {isUS ? "US" : "Indian"} Stocks</span>
                  <FiArrowUpRight />
                </button>
              </div>
            </div>
          </div>

          {/* CAPITAL DEPLOYMENT & LEAGUE STANDING (No win rate or profit factor) */}
          <div className="groww-stats-bar">
            <div className="groww-stat-pill">
              <FiBriefcase className="stat-icon" />
              <div className="stat-meta">
                <span className="stat-label">Active Holdings</span>
                <strong className="stat-value">{activeMetrics.count} Equities</strong>
              </div>
            </div>

            <div className="groww-stat-pill">
              <FiPieChart className="stat-icon" />
              <div className="stat-meta">
                <span className="stat-label">Capital Deployed</span>
                <strong className="stat-value">{activeEquityPct}% Utilized</strong>
              </div>
            </div>

            <div className="groww-stat-pill">
              <FiDollarSign className="stat-icon" />
              <div className="stat-meta">
                <span className="stat-label">Cash Buffer</span>
                <strong className="stat-value">{activeCashPct}% Margin</strong>
              </div>
            </div>

            <div
              className="groww-stat-pill clickable"
              onClick={() => setActiveMarketTab("LEADERBOARD")}
              title="Click to view full Leaderboard rankings"
            >
              <FiAward className="stat-icon gold" />
              <div className="stat-meta">
                <span className="stat-label">League Standing</span>
                <strong className="stat-value">
                  Rank #{isUS ? myUsdRank : myInrRank} on Leaderboard ↗
                </strong>
              </div>
            </div>
          </div>

          {/* ACTIVE HOLDINGS / ASSETS TABLE */}
          <div className="groww-holdings-section">
            <div className="groww-section-header">
              <div className="section-title-wrap">
                <h2>Active Portfolio Assets</h2>
                <span className="section-count-badge">
                  {filteredHoldings.length} {filteredHoldings.length === 1 ? "Stock" : "Stocks"}
                </span>
              </div>

              <div className="holdings-search-box">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search your holdings..."
                  value={holdingSearch}
                  onChange={(e) => setHoldingSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredHoldings.length === 0 ? (
              <div className="groww-empty-holdings">
                <FiPieChart size={38} />
                <h3>No open positions</h3>
                <p>You have no active holdings matching this market. Start investing to build your portfolio.</p>
                <button
                  type="button"
                  className="groww-explore-btn"
                  onClick={() => handleOpenMarket()}
                >
                  Explore Stocks & Buy
                </button>
              </div>
            ) : (
              <div className="groww-table-card">
                <table className="groww-holdings-table">
                  <thead>
                    <tr>
                      <th>Asset / Company</th>
                      <th className="num-col">Market Price</th>
                      <th className="num-col">Avg. Price</th>
                      <th className="num-col">Shares</th>
                      <th className="num-col">Invested Value</th>
                      <th className="num-col">Current Value</th>
                      <th className="num-col">Total P&L</th>
                      <th className="action-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHoldings.map((h) => {
                      const sym = h.isUSD ? "$" : "₹";
                      return (
                        <tr
                          key={h._id || h.symbol}
                          className="holding-row"
                          onClick={() => handleStockClick(h.symbol)}
                        >
                          <td className="asset-cell">
                            <div className="asset-brand-wrap">
                              <div className={`asset-flag-badge ${h.isUSD ? "usd" : "inr"}`}>
                                {h.isUSD ? "US" : "IN"}
                              </div>
                              <div>
                                <strong className="asset-symbol">{h.symbol}</strong>
                                <div className="asset-name-row">
                                  <span className="asset-name">{h.companyName}</span>
                                  <span className="asset-sector-tag">{h.sector}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="num-col">
                            <div className="price-val">
                              <strong>{sym}{h.isUSD ? formatUSD(h.currentPrice) : formatINR(h.currentPrice)}</strong>
                              <span className={`day-change-tag ${h.dayChangePercent >= 0 ? "gain" : "loss"}`}>
                                {h.dayChangePercent >= 0 ? "+" : ""}{h.dayChangePercent.toFixed(2)}%
                              </span>
                            </div>
                          </td>

                          <td className="num-col">
                            {sym}{h.isUSD ? formatUSD(h.avgPrice) : formatINR(h.avgPrice)}
                          </td>

                          <td className="num-col">
                            <strong>{h.quantity}</strong>
                          </td>

                          <td className="num-col">
                            {sym}{h.isUSD ? formatUSD(h.invested) : formatINR(h.invested)}
                          </td>

                          <td className="num-col">
                            <strong>{sym}{h.isUSD ? formatUSD(h.current) : formatINR(h.current)}</strong>
                          </td>

                          <td className="num-col">
                            <div className={`pnl-val-block ${h.pnl >= 0 ? "gain" : "loss"}`}>
                              <strong>
                                {h.pnl >= 0 ? "+" : "-"}{sym}{h.isUSD ? formatUSD(Math.abs(h.pnl)) : formatINR(Math.abs(h.pnl))}
                              </strong>
                              <span className="pnl-pct">
                                ({h.pnl >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%)
                              </span>
                            </div>
                          </td>

                          <td className="action-col" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="holding-trade-btn"
                              onClick={() => handleStockClick(h.symbol)}
                            >
                              Trade
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RECENT ORDERS TABLE */}
          {transactions.length > 0 && (
            <div className="groww-recent-orders-section">
              <div className="section-title-wrap">
                <h2>Recent Order History</h2>
                <span className="section-count-badge">Past Practice Executions</span>
              </div>

              <div className="groww-table-card">
                <table className="groww-orders-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Symbol</th>
                      <th>Market</th>
                      <th>Side</th>
                      <th className="num-col">Shares</th>
                      <th className="num-col">Order Price</th>
                      <th className="num-col">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 6).map((tx, idx) => {
                      const isTxUSD = tx.currency === "USD" || (!tx.symbol?.endsWith(".NS") && !tx.symbol?.endsWith(".BO"));
                      const sym = isTxUSD ? "$" : "₹";
                      const dateStr = new Date(tx.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <tr key={tx._id || idx}>
                          <td className="time-col">{dateStr}</td>
                          <td>
                            <strong>{tx.symbol}</strong>
                          </td>
                          <td>
                            <span className={`market-pill-small ${isTxUSD ? "usd" : "inr"}`}>
                              {isTxUSD ? "🇺🇸 US" : "🇮🇳 NSE"}
                            </span>
                          </td>
                          <td>
                            <span className={`side-badge ${tx.type?.toLowerCase()}`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="num-col">{tx.quantity}</td>
                          <td className="num-col">{sym}{isTxUSD ? formatUSD(tx.price) : formatINR(tx.price)}</td>
                          <td className="num-col total-col">
                            {sym}{isTxUSD ? formatUSD(tx.quantity * tx.price) : formatINR(tx.quantity * tx.price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* MARKET COMPETITION / LEADERBOARD VIEW */
        <div className="competition-container">
          <div className="competition-header-card">
            <div className="comp-title-block">
              <span className="comp-badge">
                <FiAward /> <span>Live Practice Championships</span>
              </span>
              <h2>Market Investing Leaderboard</h2>
              <p>
                Real-time portfolio competition comparing all participants based on logical capital deployment from ₹1,00,000 (INR) and $10,000 (USD) starting capital.
              </p>
            </div>

            <div className="competition-market-toggle">
              <button
                type="button"
                className={`comp-toggle-btn ${leagueMode === "IN" ? "active inr" : ""}`}
                onClick={() => setLeagueMode("IN")}
              >
                🇮🇳 ₹1 Lakh INR Championship
              </button>
              <button
                type="button"
                className={`comp-toggle-btn ${leagueMode === "US" ? "active usd" : ""}`}
                onClick={() => setLeagueMode("US")}
              >
                🇺🇸 $10k USD Global League
              </button>
            </div>
          </div>

          {/* Podiums for Top 3 Traders */}
          {(() => {
            const list = leagueMode === "IN" ? leaderboard.inrLeague : leaderboard.usdLeague;
            const sym = leagueMode === "IN" ? "₹" : "$";
            const fmt = leagueMode === "IN" ? formatINR : formatUSD;
            const top3 = list.slice(0, 3);

            return (
              <>
                <div className="leaderboard-podium-grid">
                  {top3.map((trader) => (
                    <div
                      key={trader.userId}
                      className={`podium-card rank-${trader.rank} ${trader.email === user?.email ? "is-me" : ""}`}
                    >
                      <div className="podium-rank-badge">
                        {trader.rank === 1 ? "🥇 1st Place" : trader.rank === 2 ? "🥈 2nd Place" : "🥉 3rd Place"}
                      </div>
                      <h3 className="podium-name">
                        {trader.name}
                        {trader.email === user?.email && <span className="you-pill">You</span>}
                      </h3>
                      <span className="podium-email">{trader.email}</span>

                      <div className="podium-networth">
                        <span className="podium-val">{sym}{fmt(trader.totalNetWorth)}</span>
                        <span className={`groww-pnl-pill ${trader.profit >= 0 ? "profit" : "loss"}`}>
                          {trader.profit >= 0 ? "+" : "-"}{sym}{fmt(Math.abs(trader.profit))} ({trader.roi >= 0 ? "+" : ""}{trader.roi.toFixed(2)}%)
                        </span>
                      </div>

                      <div className="podium-meta-row">
                        <span>Capital Utilized: <strong>{trader.utilization}%</strong></span>
                        <span>Holdings: <strong>{trader.stocksCount} Stocks</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Complete Leaderboard Table */}
                <div className="groww-table-card">
                  <table className="groww-holdings-table leaderboard-table">
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Rank</th>
                        <th>Participant / Trader</th>
                        <th className="num-col">Portfolio Net Worth</th>
                        <th className="num-col" style={{ textAlign: "center" }}>Total Profit / Loss</th>
                        <th className="num-col">Capital Deployed</th>
                        <th className="num-col">Stocks Held</th>
                        <th>Top Asset Exposure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((trader) => (
                        <tr
                          key={trader.userId}
                          className={`leaderboard-row ${trader.email === user?.email ? "highlight-me" : ""}`}
                        >
                          <td className="rank-cell">
                            <span className={`rank-number-pill r-${trader.rank}`}>
                              {trader.rank <= 3 ? ["🥇", "🥈", "🥉"][trader.rank - 1] : `#${trader.rank}`}
                            </span>
                          </td>

                          <td>
                            <div className="trader-name-block">
                              <strong>
                                {trader.name}
                                {trader.email === user?.email && <span className="you-pill">You</span>}
                              </strong>
                              <span className="trader-email-sub">{trader.email}</span>
                            </div>
                          </td>

                          <td className="num-col">
                            <strong>{sym}{fmt(trader.totalNetWorth)}</strong>
                          </td>

                          <td className="num-col" style={{ textAlign: "center" }}>
                            <div className={`leaderboard-pnl-pill ${trader.profit >= 0 ? "profit" : "loss"}`}>
                              <span className="pnl-val">
                                {trader.profit >= 0 ? "+" : "-"}{sym}{fmt(Math.abs(trader.profit))}
                              </span>
                              <span className="pnl-roi">
                                ({trader.roi >= 0 ? "+" : ""}{trader.roi.toFixed(2)}%)
                              </span>
                            </div>
                          </td>

                          <td className="num-col">
                            <div className="utilization-cell">
                              <span><strong>{trader.utilization}%</strong> deployed</span>
                              <div className="mini-util-bar">
                                <div
                                  className={`mini-util-fill ${leagueMode === "IN" ? "inr" : "usd"}`}
                                  style={{ width: `${trader.utilization}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="num-col">
                            <strong>{trader.stocksCount}</strong>
                          </td>

                          <td>
                            <div className="top-holdings-chips">
                              {trader.topHoldings && trader.topHoldings.length > 0 ? (
                                trader.topHoldings.map((s) => (
                                  <span key={s} className="holding-mini-chip">
                                    {s}
                                  </span>
                                ))
                              ) : (
                                <span className="no-holdings-chip">100% Liquid Cash</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
