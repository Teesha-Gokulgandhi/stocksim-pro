import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiTrendingUp, FiArrowUpRight, FiArrowDownRight } from "react-icons/fi";
import API from "../../services/api";
import { useUser } from "../../context/UserContext";
import HoldingRow from "../../components/portfolio/HoldingRow";
import AssetAllocationChart from "../../components/charts/AssetAllocationChart";
import PageLoader from "../../components/common/PageLoader";
import "./Portfolio.css";

function Portfolio() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [balance, setBalance] = useState(() => user?.balance || 0);
  const [balanceUSD, setBalanceUSD] = useState(() => user?.balanceUSD ?? 10000);
  const [holdings, setHoldings] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("ALL"); // ALL, IN, US

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const [portfolioRes, stocksRes] = await Promise.all([
        API.get("/user/portfolio"),
        API.get("/stocks/live", { params: { limit: 100 } }),
      ]);

      setBalance(portfolioRes.data.balance);
      setBalanceUSD(portfolioRes.data.balanceUSD ?? 10000);
      setHoldings(portfolioRes.data.holdings || []);
      setStocks(stocksRes.data.stocks || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Reactive listener so trades immediately update global portfolio holdings
  useEffect(() => {
    const handleTradeExecuted = () => {
      fetchAll();
    };
    window.addEventListener("stocksim:trade-executed", handleTradeExecuted);
    return () => window.removeEventListener("stocksim:trade-executed", handleTradeExecuted);
  }, [fetchAll]);

  const priceMap = useMemo(() => {
    const map = {};
    stocks.forEach((s) => {
      map[s.symbol] = s;
    });
    return map;
  }, [stocks]);

  const enrichedHoldings = useMemo(() => {
    return holdings.map((h) => {
      const live = priceMap[h.symbol];
      const isUSD =
        h.currency === "USD" ||
        (h.symbol && !h.symbol.endsWith(".NS") && !h.symbol.endsWith(".BO"));
      const currentPrice = live?.currentPrice ?? h.avgPrice;
      const invested = h.avgPrice * h.quantity;
      const currentValue = currentPrice * h.quantity;
      const pl = currentValue - invested;
      const plPercent = invested > 0 ? (pl / invested) * 100 : 0;

      return {
        ...h,
        currency: isUSD ? "USD" : "INR",
        isUSD,
        companyName: live?.companyName || h.symbol,
        sector: live?.sector || "General",
        currentPrice,
        invested,
        currentValue,
        pl,
        plPercent,
      };
    });
  }, [holdings, priceMap]);

  const inrHoldings = useMemo(() => enrichedHoldings.filter((h) => !h.isUSD), [enrichedHoldings]);
  const usdHoldings = useMemo(() => enrichedHoldings.filter((h) => h.isUSD), [enrichedHoldings]);

  const filteredHoldings = useMemo(() => {
    if (selectedFilter === "IN") return inrHoldings;
    if (selectedFilter === "US") return usdHoldings;
    return enrichedHoldings;
  }, [selectedFilter, inrHoldings, usdHoldings, enrichedHoldings]);

  // Distinct Indian Totals
  const inrTotals = useMemo(() => {
    let invested = 0;
    let currentValue = 0;
    inrHoldings.forEach((h) => {
      invested += h.invested;
      currentValue += h.currentValue;
    });
    const pl = currentValue - invested;
    const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
    return { invested, currentValue, pl, plPercent };
  }, [inrHoldings]);

  // Distinct US Totals
  const usdTotals = useMemo(() => {
    let invested = 0;
    let currentValue = 0;
    usdHoldings.forEach((h) => {
      invested += h.invested;
      currentValue += h.currentValue;
    });
    const pl = currentValue - invested;
    const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
    return { invested, currentValue, pl, plPercent };
  }, [usdHoldings]);

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

  const effectiveBalance = user?.balance != null ? user.balance : balance;
  const effectiveBalanceUSD = user?.balanceUSD != null ? user.balanceUSD : balanceUSD;

  if (loading) return <PageLoader />;

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div>
          <div className="portfolio-badge">
            <span>Portfolio Overview</span>
          </div>
          <h1>Global Asset Holdings</h1>
          <p>
            Independent Indian (NSE/BSE) and US (NYSE/Nasdaq) market positions priced with real-time feeds.
          </p>
        </div>

        <button
          type="button"
          className="portfolio-trade-cta"
          onClick={() => navigate("/market")}
        >
          <FiTrendingUp />
          <span>Trade Live Stocks</span>
        </button>
      </div>

      {/* Two Clean Market Cards */}
      <div className="market-desks-grid">
        {/* Indian Market */}
        <div className="market-desk-card inr">
          <div className="desk-header">
            <div className="desk-title-group">
              <span className="desk-flag">🇮🇳</span>
              <div>
                <h3>Indian Equities</h3>
                <span className="desk-sub">NSE / BSE Market</span>
              </div>
            </div>
            <span className="desk-status inr">INR (₹)</span>
          </div>

          <div className="desk-metrics-grid">
            <div className="desk-metric">
              <span className="desk-metric-label">Holdings Value</span>
              <span className="desk-metric-val">₹{formatINR(inrTotals.currentValue)}</span>
            </div>
            <div className="desk-metric">
              <span className="desk-metric-label">Invested Capital</span>
              <span className="desk-metric-val">₹{formatINR(inrTotals.invested)}</span>
            </div>
            <div className="desk-metric">
              <span className="desk-metric-label">Net P&L</span>
              <span className={`desk-metric-val ${inrTotals.pl >= 0 ? "profit" : "loss"}`}>
                {inrTotals.pl >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
                {inrTotals.pl >= 0 ? "+" : "-"}₹{formatINR(Math.abs(inrTotals.pl))} ({inrTotals.pl >= 0 ? "+" : ""}{inrTotals.plPercent.toFixed(2)}%)
              </span>
            </div>
            <div className="desk-metric">
              <span className="desk-metric-label">Available Margin</span>
              <span className="desk-metric-val margin-val">₹{formatINR(effectiveBalance)}</span>
            </div>
          </div>
        </div>

        {/* US Market */}
        <div className="market-desk-card usd">
          <div className="desk-header">
            <div className="desk-title-group">
              <span className="desk-flag">🇺🇸</span>
              <div>
                <h3>US Equities</h3>
                <span className="desk-sub">NYSE / Nasdaq</span>
              </div>
            </div>
            <span className="desk-status usd">USD ($)</span>
          </div>

          <div className="desk-metrics-grid">
            <div className="desk-metric">
              <span className="desk-metric-label">Holdings Value</span>
              <span className="desk-metric-val">${formatUSD(usdTotals.currentValue)}</span>
            </div>
            <div className="desk-metric">
              <span className="desk-metric-label">Invested Capital</span>
              <span className="desk-metric-val">${formatUSD(usdTotals.invested)}</span>
            </div>
            <div className="desk-metric">
              <span className="desk-metric-label">Net P&L</span>
              <span className={`desk-metric-val ${usdTotals.pl >= 0 ? "profit" : "loss"}`}>
                {usdTotals.pl >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
                {usdTotals.pl >= 0 ? "+" : "-"}${formatUSD(Math.abs(usdTotals.pl))} ({usdTotals.pl >= 0 ? "+" : ""}{usdTotals.plPercent.toFixed(2)}%)
              </span>
            </div>
            <div className="desk-metric">
              <span className="desk-metric-label">Available Margin</span>
              <span className="desk-metric-val margin-val">${formatUSD(effectiveBalanceUSD)}</span>
            </div>
          </div>
        </div>
      </div>

      {enrichedHoldings.length > 0 && (
        <AssetAllocationChart holdings={enrichedHoldings} />
      )}

      {/* Region Filter Tabs */}
      <div className="portfolio-filter-tabs">
        <button
          type="button"
          className={`port-tab ${selectedFilter === "ALL" ? "active" : ""}`}
          onClick={() => setSelectedFilter("ALL")}
        >
          🌐 All Assets ({enrichedHoldings.length})
        </button>
        <button
          type="button"
          className={`port-tab ${selectedFilter === "IN" ? "active" : ""}`}
          onClick={() => setSelectedFilter("IN")}
        >
          🇮🇳 Indian Stocks ({inrHoldings.length})
        </button>
        <button
          type="button"
          className={`port-tab ${selectedFilter === "US" ? "active" : ""}`}
          onClick={() => setSelectedFilter("US")}
        >
          🇺🇸 US Stocks ({usdHoldings.length})
        </button>
      </div>

      {filteredHoldings.length === 0 ? (
        <div className="portfolio-empty">
          <h3>No {selectedFilter === "ALL" ? "" : selectedFilter === "IN" ? "Indian" : "US"} positions open yet</h3>
          <p>Execute your first live order on the Market Watch with virtual margin.</p>
          <button type="button" onClick={() => navigate("/market")}>Explore Market</button>
        </div>
      ) : (
        <div className="portfolio-table-card">
          <div className="portfolio-table-scroll">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Asset / Stock</th>
                  <th style={{ textAlign: "right" }}>Shares</th>
                  <th style={{ textAlign: "right" }}>Avg Buy</th>
                  <th style={{ textAlign: "right" }}>Live Price</th>
                  <th style={{ textAlign: "right" }}>Total Value</th>
                  <th style={{ textAlign: "right" }}>Unrealized P&L</th>
                  <th style={{ textAlign: "center", width: "90px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHoldings.map((h) => (
                  <HoldingRow key={h._id || h.symbol} holding={h} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Portfolio;