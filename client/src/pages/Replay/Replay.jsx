import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  FiAward,
  FiCheckCircle,
  FiShoppingBag,
  FiClock,
  FiList,
  FiPlus,
  FiMinus,
  FiTrendingUp,
  FiDollarSign,
  FiLayers,
} from "react-icons/fi";
import API from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useUser } from "../../context/UserContext";
import PageLoader from "../../components/common/PageLoader";
import { useMarket } from "../../context/MarketContext";
import CandlestickChart from "../../components/replay/CandlestickChart";
import ReplayScorecardModal from "../../components/replay/ReplayScorecardModal";
import "./Replay.css";

const INDIAN_STOCK_PRESETS = [
  { symbol: "RELIANCE.NS", label: "🇮🇳 RELIANCE.NS — Reliance Industries (NSE)" },
  { symbol: "TCS.NS", label: "🇮🇳 TCS.NS — Tata Consultancy Services (NSE)" },
  { symbol: "INFY.NS", label: "🇮🇳 INFY.NS — Infosys Ltd (NSE)" },
  { symbol: "HDFCBANK.NS", label: "🇮🇳 HDFCBANK.NS — HDFC Bank (NSE)" },
  { symbol: "ICICIBANK.NS", label: "🇮🇳 ICICIBANK.NS — ICICI Bank (NSE)" },
  { symbol: "BLIND", label: "🎲 Blind Test (Randomized Indian Asset)" },
];

const US_STOCK_PRESETS = [
  { symbol: "AAPL", label: "🇺🇸 AAPL — Apple Inc. (Nasdaq)" },
  { symbol: "TSLA", label: "🇺🇸 TSLA — Tesla, Inc. (Nasdaq)" },
  { symbol: "NVDA", label: "🇺🇸 NVDA — Nvidia Corp (Nasdaq)" },
  { symbol: "MSFT", label: "🇺🇸 MSFT — Microsoft Corp (Nasdaq)" },
  { symbol: "AMZN", label: "🇺🇸 AMZN — Amazon.com Inc. (Nasdaq)" },
  { symbol: "BLIND", label: "🎲 Blind Test (Randomized US Asset)" },
];

const SPEED_OPTIONS = [
  { label: "0.5x", ms: 2000 },
  { label: "1x", ms: 1000 },
  { label: "2x", ms: 500 },
  { label: "5x", ms: 200 },
];

function Replay({ market }) {
  const toast = useToast();
  const { user, refreshUser } = useUser();
  const { selectedMarket: contextMarket } = useMarket();
  const activeMarket = market || contextMarket || "IN";
  const isIN = activeMarket === "IN";

  const presets = isIN ? INDIAN_STOCK_PRESETS : US_STOCK_PRESETS;
  const defaultAsset = isIN ? "RELIANCE.NS" : "AAPL";

  // Setup options
  const [selectedAsset, setSelectedAsset] = useState(defaultAsset);
  const [range, setRange] = useState("6M");
  const [loading, setLoading] = useState(true);

  // Sync asset if market changes
  useEffect(() => {
    setSelectedAsset(defaultAsset);
  }, [activeMarket, defaultAsset]);

  // Replay Data
  const [sessionInfo, setSessionInfo] = useState(null);
  const [candles, setCandles] = useState([]);
  const [visibleCount, setVisibleCount] = useState(0);

  // Currency helper
  const currency = sessionInfo?.currency || (isIN ? "INR" : "USD");
  const currencySymbol = currency === "INR" ? "₹" : "$";

  // Playback Control
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1); // 1x default

  // Trading State — initialized from user's live practice bankroll
  const baseUserBalance = isIN ? (user?.balance ?? 100000) : (user?.balanceUSD ?? 10000);
  const [initialCapital, setInitialCapital] = useState(baseUserBalance);
  const [cash, setCash] = useState(baseUserBalance);
  const [position, setPosition] = useState(null); // { quantity, avgPrice, buyIndex, entryDate }
  const [closedTrades, setClosedTrades] = useState([]);
  const [buyQty, setBuyQty] = useState(10);

  // Scorecard modal
  const [showScorecard, setShowScorecard] = useState(false);

  // History Tab / View
  const [viewHistory, setViewHistory] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const timerRef = useRef(null);
  const toastRef = useRef(toast);
  const lastLoadedSessionKey = useRef("");
  const latestBalanceRef = useRef(null);

  useEffect(() => {
    toastRef.current = toast;
  });

  // Synchronize bankroll with live user balance when no active simulation trade is underway
  useEffect(() => {
    if (!position && closedTrades.length === 0 && user) {
      const liveBal = latestBalanceRef.current ?? (currency === "INR" ? (user.balance ?? 100000) : (user.balanceUSD ?? 10000));
      setCash(liveBal);
      setInitialCapital(liveBal);
    }
  }, [user?.balance, user?.balanceUSD, currency, position, closedTrades.length, user]);

  // Load a new replay session (silent on initial mount, notify on explicit user reload)
  const startNewSession = useCallback(
    async (assetToLoad = selectedAsset, rangeToLoad = range, notifyUser = false, overrideFunds = null) => {
      try {
        setLoading(true);
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);

        const isBlind = assetToLoad === "BLIND";
        const params = isBlind
          ? { isBlind: true, range: rangeToLoad, market: activeMarket }
          : { symbol: assetToLoad, range: rangeToLoad, market: activeMarket };

        const res = await API.get("/replay/candles", { params });
        const data = res.data;

        setSessionInfo(data);
        setCandles(data.candles || []);

        const startBars = Math.min(25, Math.floor((data.candles || []).length * 0.25));
        setVisibleCount(startBars);

        // Dynamically sync to real user practice capital (preserved from latest session if provided)
        const startingFunds =
          overrideFunds != null
            ? overrideFunds
            : latestBalanceRef.current != null
            ? latestBalanceRef.current
            : (data.currency === "INR" ? (user?.balance ?? 100000) : (user?.balanceUSD ?? 10000));

        setInitialCapital(startingFunds);
        setCash(startingFunds);
        setPosition(null);
        setClosedTrades([]);
        setShowScorecard(false);

        if (notifyUser) {
          toastRef.current?.success(
            `Loaded ${data.displaySymbol} (${data.candles.length} candles ready)`,
            "Backtest Session Loaded"
          );
        }
      } catch (err) {
        console.error("Failed to load replay:", err);
        toastRef.current?.error(err.response?.data?.message || "Could not load historical candles.");
      } finally {
        setLoading(false);
      }
    },
    [selectedAsset, range, activeMarket, user?.balance, user?.balanceUSD]
  );

  useEffect(() => {
    const sessionKey = `${activeMarket}_${defaultAsset}_${range}`;
    if (lastLoadedSessionKey.current === sessionKey) return;
    lastLoadedSessionKey.current = sessionKey;
    startNewSession(defaultAsset, range, false);
  }, [activeMarket, defaultAsset, range, startNewSession]);

  // Fetch Past Sessions History
  const fetchPastSessions = async () => {
    try {
      setHistoryLoading(true);
      const res = await API.get("/replay/history");
      setPastSessions(res.data.sessions || []);
      setHistoryStats(res.data.stats || null);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const currentCandle = useMemo(() => {
    if (candles.length === 0 || visibleCount === 0) return null;
    return candles[visibleCount - 1] || null;
  }, [candles, visibleCount]);

  // Advance 1 Candle forward
  const stepForward = useCallback(() => {
    setVisibleCount((prev) => {
      if (prev >= candles.length) {
        setIsPlaying(false);
        toastRef.current?.info("Reached end of historical session! Review your scorecard to record your grade.");
        setShowScorecard(true);
        return prev;
      }
      return prev + 1;
    });
  }, [candles.length]);

  // Autoplay loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = SPEED_OPTIONS[speedIndex].ms;
      timerRef.current = setInterval(() => {
        setVisibleCount((prev) => {
          if (prev >= candles.length) {
            setIsPlaying(false);
            clearInterval(timerRef.current);
            toastRef.current?.info("Reached end of historical session! Review your scorecard to record your grade.");
            setShowScorecard(true);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speedIndex, candles.length]);

  // Current Position Metrics
  const positionMetrics = useMemo(() => {
    if (!position || !currentCandle) {
      return { currentValue: 0, unrealizedPnl: 0, unrealizedPnlPct: 0 };
    }
    const currentValue = position.quantity * currentCandle.close;
    const invested = position.quantity * position.avgPrice;
    const unrealizedPnl = currentValue - invested;
    const unrealizedPnlPct = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;
    return { currentValue, unrealizedPnl, unrealizedPnlPct };
  }, [position, currentCandle]);

  const netWorth = cash + positionMetrics.currentValue;

  // Trading Actions
  const handleBuy = () => {
    if (!currentCandle) return;
    const qty = Number(buyQty);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    const cost = qty * currentCandle.close;
    if (cost > cash) {
      toast.error(`Insufficient cash! Max buy: ${Math.floor(cash / currentCandle.close)} shares.`);
      return;
    }

    setCash((prev) => prev - cost);

    setPosition((prev) => {
      if (!prev) {
        return {
          quantity: qty,
          avgPrice: currentCandle.close,
          buyIndex: visibleCount - 1,
          entryDate: currentCandle.displayDate || currentCandle.date,
        };
      } else {
        const totalQty = prev.quantity + qty;
        const totalCost = prev.quantity * prev.avgPrice + cost;
        return {
          ...prev,
          quantity: totalQty,
          avgPrice: Number((totalCost / totalQty).toFixed(2)),
        };
      }
    });

    toast.success(
      `Bought ${qty} shares at ${currencySymbol}${currentCandle.close.toFixed(2)}`,
      "Order Executed"
    );
  };

  const handleSell = () => {
    if (!position || !currentCandle) return;

    const proceeds = position.quantity * currentCandle.close;
    const invested = position.quantity * position.avgPrice;
    const pnl = proceeds - invested;
    const returnPct = invested > 0 ? (pnl / invested) * 100 : 0;
    const barsHeld = Math.max(1, visibleCount - 1 - position.buyIndex);

    const completedTrade = {
      type: "BUY",
      buyIndex: position.buyIndex,
      sellIndex: visibleCount - 1,
      entryPrice: position.avgPrice,
      exitPrice: currentCandle.close,
      quantity: position.quantity,
      pnl: Number(pnl.toFixed(2)),
      returnPercent: Number(returnPct.toFixed(2)),
      barsHeld,
      entryDate: position.entryDate,
      exitDate: currentCandle.displayDate || currentCandle.date,
    };

    setClosedTrades((prev) => [...prev, completedTrade]);
    setCash((prev) => prev + proceeds);
    setPosition(null);

    toast.success(
      `Sold ${position.quantity} shares at ${currencySymbol}${currentCandle.close.toFixed(2)} (${pnl >= 0 ? "+" : ""}{currencySymbol}${pnl.toFixed(2)})`,
      pnl >= 0 ? "Profit Realized" : "Loss Realized"
    );
  };

  const handleQuickPercent = (pct) => {
    if (!currentCandle || cash <= 0) return;
    const budget = (cash * pct) / 100;
    const maxQty = Math.floor(budget / currentCandle.close);
    setBuyQty(Math.max(1, maxQty));
  };

  // Build Scorecard Data
  const sessionStats = useMemo(() => {
    const finalBalance = netWorth;
    const netPnl = finalBalance - initialCapital;
    const returnPercent = initialCapital > 0 ? (netPnl / initialCapital) * 100 : 0;

    return {
      symbol: sessionInfo?.symbol || "ASSET",
      displaySymbol: sessionInfo?.displaySymbol || "ASSET",
      isBlind: sessionInfo?.isBlind || false,
      currency,
      initialBalance: initialCapital,
      finalBalance: Number(finalBalance.toFixed(2)),
      netPnl: Number(netPnl.toFixed(2)),
      returnPercent: Number(returnPercent.toFixed(2)),
      candlesProcessed: visibleCount,
      trades: closedTrades,
    };
  }, [netWorth, initialCapital, sessionInfo, currency, visibleCount, closedTrades]);

  // Save session to backend — updates user practice funds and refreshes user context immediately
  const handleSaveSession = async (payload) => {
    try {
      const res = await API.post("/replay/session", payload);
      toast.success("Practice session saved! Bankroll updated.", "Saved");
      const updatedUser = await refreshUser();
      fetchPastSessions();
      const newBal =
        res.data?.updatedBalance ??
        (currency === "INR" ? updatedUser?.balance : updatedUser?.balanceUSD);
      if (newBal != null) {
        latestBalanceRef.current = newBal;
        setCash(newBal);
        setInitialCapital(newBal);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save replay session.");
      throw err;
    }
  };

  const progressPct =
    candles.length > 0 ? Math.round((visibleCount / candles.length) * 100) : 0;

  if (loading && candles.length === 0) return <PageLoader />;

  return (
    <div className="replay-page">
      {/* Sleek, Streamlined Studio Top Bar */}
      <div className="replay-top-bar">
        <div className="top-bar-left">
          <div className="studio-brand">
            <span className="studio-icon"><FiClock /></span>
            <span className="studio-name">Backtest Studio</span>
            <span className="studio-market-tag">{isIN ? "NSE / BSE" : "NYSE / NASDAQ"}</span>
          </div>

          <div className="asset-select-wrapper">
            <select
              className="studio-asset-dropdown"
              value={selectedAsset}
              onChange={(e) => {
                setSelectedAsset(e.target.value);
                startNewSession(e.target.value, range, true);
              }}
            >
              {presets.map((p) => (
                <option key={p.symbol} value={p.symbol}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="studio-range-toggle">
            {["3M", "6M", "1Y"].map((r) => (
              <button
                type="button"
                key={r}
                className={`range-pill ${range === r ? "active" : ""}`}
                onClick={() => {
                  setRange(r);
                  startNewSession(selectedAsset, r, true);
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="top-bar-right">
          <div className="practice-funds-pill" title="Sandbox practice trading balance — updates with session results">
            <span className="funds-label">Practice Bankroll</span>
            <span className="funds-value">
              {currencySymbol}{cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="button"
            className="studio-action-btn journal"
            onClick={() => {
              setViewHistory((p) => !p);
              if (!viewHistory) fetchPastSessions();
            }}
          >
            <FiList /> <span>{viewHistory ? "Back to Chart" : "Past Sessions"}</span>
          </button>

          <button
            type="button"
            className="studio-action-btn finish"
            onClick={() => setShowScorecard(true)}
            title="Complete practice session and view scorecard"
          >
            <FiAward /> <span>Scorecard</span>
          </button>
        </div>
      </div>

      {viewHistory ? (
        /* History & Journal View */
        <div className="replay-history-section">
          <div className="history-header">
            <div>
              <h2>Replay Practice Journal</h2>
              <p>Review your historical simulation decisions, win rate, and profit factor over time.</p>
            </div>
            <button
              type="button"
              className="history-back-btn"
              onClick={() => setViewHistory(false)}
            >
              Back to Chart
            </button>
          </div>

          {/* Cumulative Practice Performance Header Cards */}
          <div className="history-summary-grid">
            <div className="history-kpi-card">
              <div className="kpi-icon-wrap emerald"><FiDollarSign /></div>
              <div className="kpi-meta">
                <span className="kpi-label">Current Practice Bankroll</span>
                <strong className="kpi-value text-emerald">
                  {currencySymbol}
                  {(
                    isIN
                      ? (historyStats?.currentBalanceINR ?? user?.balance ?? 100000)
                      : (historyStats?.currentBalanceUSD ?? user?.balanceUSD ?? 10000)
                  ).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div className="history-kpi-card">
              <div className={`kpi-icon-wrap ${(historyStats?.totalPnl || 0) >= 0 ? "emerald" : "rose"}`}><FiTrendingUp /></div>
              <div className="kpi-meta">
                <span className="kpi-label">Cumulative Replay P&L</span>
                <strong className={`kpi-value ${(historyStats?.totalPnl || 0) >= 0 ? "profit" : "loss"}`}>
                  {(historyStats?.totalPnl || 0) >= 0 ? "+" : "-"}
                  {currencySymbol}
                  {Math.abs(historyStats?.totalPnl || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div className="history-kpi-card">
              <div className="kpi-icon-wrap sapphire"><FiAward /></div>
              <div className="kpi-meta">
                <span className="kpi-label">Average Win Rate</span>
                <strong className="kpi-value">
                  {historyStats?.avgWinRate ?? 0}%
                </strong>
              </div>
            </div>

            <div className="history-kpi-card">
              <div className="kpi-icon-wrap purple"><FiLayers /></div>
              <div className="kpi-meta">
                <span className="kpi-label">Completed Sessions</span>
                <strong className="kpi-value">
                  {historyStats?.totalSessions ?? pastSessions.length} Runs
                </strong>
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div className="history-loading">Loading journal...</div>
          ) : pastSessions.length === 0 ? (
            <div className="history-empty">
              <h3>No completed replay sessions yet</h3>
              <p>Complete your first candle replay to record your trading grade!</p>
              <button onClick={() => setViewHistory(false)}>Return to Backtest Studio</button>
            </div>
          ) : (
            <div className="history-table-card">
              <table>
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Asset</th>
                    <th>Date Practiced</th>
                    <th>Win Rate</th>
                    <th>Trades</th>
                    <th>Profit Factor</th>
                    <th>Net P&L</th>
                    <th>Return %</th>
                  </tr>
                </thead>
                <tbody>
                  {pastSessions.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <span className={`grade-chip ${s.grade.toLowerCase()}`}>
                          {s.grade}
                        </span>
                      </td>
                      <td>
                        <strong>{s.displaySymbol || s.symbol}</strong>
                        {s.isBlind && <span className="blind-tag">BLIND</span>}
                      </td>
                      <td>{new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td>{s.winRate}%</td>
                      <td>{s.tradesCount}</td>
                      <td>{s.profitFactor}</td>
                      <td className={s.netPnl >= 0 ? "profit" : "loss"}>
                        {s.netPnl >= 0 ? "+" : "-"}{s.currency === "INR" ? "₹" : "$"}{Math.abs(s.netPnl).toLocaleString()}
                      </td>
                      <td className={s.returnPercent >= 0 ? "profit" : "loss"}>
                        {s.returnPercent >= 0 ? "+" : ""}{s.returnPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Main Replay Studio */
        <>
          {/* Interactive Candlestick Chart with Integrated Playback Toolbar */}
          <CandlestickChart
            candles={candles}
            visibleCount={visibleCount}
            trades={closedTrades}
            currentPosition={position}
            currency={currency}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onStep={stepForward}
            onReset={() => startNewSession(selectedAsset, range, true)}
            speedIndex={speedIndex}
            onSetSpeed={setSpeedIndex}
            totalCandles={candles.length}
            progressPct={progressPct}
          />

          {/* Clean, Comfortable Practice Trading Terminal */}
          <div className="replay-trade-hub">
            {/* Account & Position Overview */}
            <div className="trade-hub-card account-card">
              <div className="card-header-row">
                <h3>Practice Account & Position</h3>
                <span className={`position-status-pill ${position ? "active" : "flat"}`}>
                  {position ? "In Position" : "Flat / Cash"}
                </span>
              </div>

              <div className="hub-metrics-grid">
                <div className="hub-metric-tile">
                  <span className="tile-label">Available Cash</span>
                  <strong className="tile-value">
                    {currencySymbol}{cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="hub-metric-tile">
                  <span className="tile-label">Open Position</span>
                  <strong className="tile-value">
                    {position ? `${position.quantity} shares @ ${currencySymbol}${position.avgPrice.toFixed(2)}` : "None"}
                  </strong>
                </div>

                <div className="hub-metric-tile">
                  <span className="tile-label">Unrealized P&L</span>
                  <strong className={`tile-value ${positionMetrics.unrealizedPnl >= 0 ? "profit" : "loss"}`}>
                    {positionMetrics.unrealizedPnl >= 0 ? "+" : "-"}{currencySymbol}
                    {Math.abs(positionMetrics.unrealizedPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                    <span className="tile-pct">({positionMetrics.unrealizedPnlPct >= 0 ? "+" : ""}{positionMetrics.unrealizedPnlPct.toFixed(2)}%)</span>
                  </strong>
                </div>

                <div className="hub-metric-tile highlight">
                  <span className="tile-label">Total Net Equity</span>
                  <strong className="tile-value text-accent">
                    {currencySymbol}{netWorth.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Order Execution */}
            <div className="trade-hub-card order-card">
              <div className="card-header-row">
                <h3>Instant Order Execution</h3>
                <span className="bar-price-chip">
                  Bar Close: {currencySymbol}{currentCandle?.close?.toFixed(2) || "0.00"}
                </span>
              </div>

              <div className="order-form-body">
                <div className="qty-row">
                  <div className="qty-stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setBuyQty((q) => Math.max(1, q - 5))}
                      title="Decrease quantity by 5"
                    >
                      <FiMinus />
                    </button>
                    <input
                      id="order-qty"
                      type="number"
                      min="1"
                      value={buyQty}
                      onChange={(e) => setBuyQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="qty-number-input"
                    />
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setBuyQty((q) => q + 5)}
                      title="Increase quantity by 5"
                    >
                      <FiPlus />
                    </button>
                  </div>

                  <div className="quick-allocation-pills">
                    <button type="button" onClick={() => handleQuickPercent(25)}>25%</button>
                    <button type="button" onClick={() => handleQuickPercent(50)}>50%</button>
                    <button type="button" onClick={() => handleQuickPercent(100)}>Max</button>
                  </div>
                </div>

                <div className="order-summary-row">
                  <span>Est. Order Value:</span>
                  <strong>
                    {currencySymbol}
                    {((buyQty || 0) * (currentCandle?.close || 0)).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </div>

                <div className="action-buttons-row">
                  <button
                    type="button"
                    className="hub-btn buy"
                    onClick={handleBuy}
                    disabled={!currentCandle || cash < (currentCandle?.close || 0)}
                  >
                    <FiShoppingBag /> Buy (Long) {buyQty} Shares
                  </button>

                  <button
                    type="button"
                    className="hub-btn sell"
                    onClick={handleSell}
                    disabled={!position}
                  >
                    <FiCheckCircle /> Close Position {position ? `(${position.quantity})` : ""}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Session Trades Log */}
          {closedTrades.length > 0 && (
            <div className="replay-trades-card">
              <div className="trades-card-header">
                <div className="trades-title-group">
                  <h3>Practice Session Trades</h3>
                  <span className="trades-count-chip">{closedTrades.length} Completed</span>
                </div>
                <div className="trades-summary-stats">
                  <span>
                    Win Rate: <strong>{closedTrades.filter((t) => t.pnl > 0).length}/{closedTrades.length} ({Math.round((closedTrades.filter((t) => t.pnl > 0).length / closedTrades.length) * 100)}%)</strong>
                  </span>
                  <span>
                    Realized P&L:{" "}
                    <strong className={closedTrades.reduce((a, t) => a + t.pnl, 0) >= 0 ? "profit" : "loss"}>
                      {closedTrades.reduce((a, t) => a + t.pnl, 0) >= 0 ? "+" : "-"}{currencySymbol}{Math.abs(closedTrades.reduce((a, t) => a + t.pnl, 0)).toFixed(2)}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="trades-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Entry Price</th>
                      <th>Exit Price</th>
                      <th>Shares</th>
                      <th>Bars Held</th>
                      <th>Net P/L</th>
                      <th>Return %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.map((t, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{currencySymbol}{t.entryPrice.toFixed(2)}</td>
                        <td>{currencySymbol}{t.exitPrice.toFixed(2)}</td>
                        <td>{t.quantity}</td>
                        <td>{t.barsHeld} bars</td>
                        <td className={t.pnl >= 0 ? "profit" : "loss"}>
                          {t.pnl >= 0 ? "+" : "-"}{currencySymbol}{Math.abs(t.pnl).toFixed(2)}
                        </td>
                        <td className={t.returnPercent >= 0 ? "profit" : "loss"}>
                          {t.returnPercent >= 0 ? "+" : ""}{t.returnPercent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Scorecard Modal */}
      <ReplayScorecardModal
        isOpen={showScorecard}
        onClose={() => setShowScorecard(false)}
        sessionStats={sessionStats}
        onSave={handleSaveSession}
        onPlayAgain={() => {
          setShowScorecard(false);
          startNewSession(selectedAsset, range, true, latestBalanceRef.current);
        }}
        currency={currency}
      />
    </div>
  );
}

export default Replay;
