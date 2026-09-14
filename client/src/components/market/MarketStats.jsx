import { useMemo, useState, useEffect } from "react";
import { useMarket } from "../../context/MarketContext";
import API from "../../services/api";
import "./MarketStats.css";

function getRealNseStatus() {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const ist = new Date(istString);

  const day = ist.getDay(); // 0 = Sunday, 6 = Saturday
  const totalMinutes = ist.getHours() * 60 + ist.getMinutes();

  const marketOpen = 9 * 60 + 15; // 9:15 AM
  const marketClose = 15 * 60 + 30; // 3:30 PM

  const isWeekday = day >= 1 && day <= 5;
  const isDuringHours = totalMinutes >= marketOpen && totalMinutes <= marketClose;

  return isWeekday && isDuringHours;
}

function getRealUsStatus() {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const ist = new Date(istString);

  const day = ist.getDay();
  const totalMinutes = ist.getHours() * 60 + ist.getMinutes();

  const isNight = totalMinutes >= 19 * 60 && day >= 1 && day <= 5;
  const isEarlyMorning = totalMinutes < 1 * 60 + 30 && day >= 2 && day <= 6;

  return isNight || isEarlyMorning;
}

function MarketStats({ stocks = [] }) {
  const { isIN } = useMarket();
  const totalStocks = stocks.length;
  const [adminStatus, setAdminStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    API.get("/admin/market-status")
      .then(({ data }) => {
        if (!cancelled) setAdminStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const isRealNseLive = getRealNseStatus();
  const isRealUsLive = getRealUsStatus();

  const isNseLive = adminStatus
    ? (adminStatus.marketOpen !== false && adminStatus.marketOpenIN !== false && adminStatus.effectiveMarketOpenIN !== false && isRealNseLive)
    : isRealNseLive;

  const isUsLive = adminStatus
    ? (adminStatus.marketOpen !== false && adminStatus.marketOpenUS !== false && adminStatus.effectiveMarketOpenUS !== false && isRealUsLive)
    : isRealUsLive;

  const avgGain = useMemo(() => {
    if (stocks.length === 0) return "0.00";
    const sum = stocks.reduce((acc, s) => acc + (s.changePercent || 0), 0);
    return (sum / stocks.length).toFixed(2);
  }, [stocks]);

  const isPositive = Number(avgGain) >= 0;

  return (
    <div className="market-stats-grid">
      {/* Card 1: Active Equities */}
      <div className="m-stat-card">
        <span className="m-stat-label">Active Equities</span>
        <h3 className="m-stat-val">{totalStocks}</h3>
        <span className="m-stat-sub">
          {isIN ? "Indian NSE/BSE Feeds" : "US NYSE/Nasdaq Feeds"}
        </span>
      </div>

      {/* Card 2: Average Session Change */}
      <div className="m-stat-card">
        <span className="m-stat-label">Average Session Change</span>
        <h3 className={`m-stat-val ${isPositive ? "profit" : "loss"}`}>
          {isPositive ? "+" : ""}{avgGain}%
        </h3>
        <span className="m-stat-sub">Across filtered assets</span>
      </div>

      {/* Card 3: Active Market Desk Session (Strictly current market only) */}
      {isIN ? (
        <div className="m-stat-card market-session-card">
          <div className="session-card-header">
            <span className="session-flag">🇮🇳</span>
            <span className="session-name">NSE / BSE Session</span>
            <span className={`session-status-badge ${isNseLive ? "open" : "closed"}`}>
              {isNseLive ? "Trading Live" : "Market Closed"}
            </span>
          </div>
          <span className="session-timing">Regular Hours: 9:15 AM - 3:30 PM IST</span>
        </div>
      ) : (
        <div className="m-stat-card market-session-card">
          <div className="session-card-header">
            <span className="session-flag">🇺🇸</span>
            <span className="session-name">NYSE / Nasdaq Session</span>
            <span className={`session-status-badge ${isUsLive ? "open" : "closed"}`}>
              {isUsLive ? "Trading Live" : "Market Closed"}
            </span>
          </div>
          <span className="session-timing">Regular Hours: 7:00 PM - 1:30 AM IST (9:30 AM - 4:00 PM EST)</span>
        </div>
      )}
    </div>
  );
}

export default MarketStats;