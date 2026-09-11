import { useEffect, useState } from "react";
import { FiClock, FiX } from "react-icons/fi";
import API from "../services/api";
import { useMarket } from "../context/MarketContext";

// Public endpoint — safe to call from any page.
// Supports regional checking for Indian (IN) and US markets.
function MarketStatusBanner({ market }) {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const marketCtx = useMarket();
  const effectiveMarket = market || marketCtx?.selectedMarket || "IN";

  useEffect(() => {
    let cancelled = false;
    API.get("/admin/market-status")
      .then(({ data }) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset dismissed state when market changes
  useEffect(() => {
    setDismissed(false);
  }, [effectiveMarket]);

  if (!status || dismissed) return null;

  let isClosed = false;
  let message = null;
  let flag = "";
  let label = "";

  // 1. Global kill switch
  if (status.marketOpen === false) {
    isClosed = true;
    message = status.marketClosedMessage || "All trading is currently paused platform-wide by admin.";
    flag = "🌐";
    label = "All Markets";
  }
  // 2. Regional US Market
  else if (effectiveMarket === "US" && status.marketOpenUS === false) {
    isClosed = true;
    message = status.marketReasonUS || status.marketStatusMessageUS || status.marketClosedMessageUS || "US Market (NYSE/Nasdaq) trading is currently paused by admin.";
    flag = "🇺🇸";
    label = "NYSE / Nasdaq";
  }
  else if (effectiveMarket === "US" && status.effectiveMarketOpenUS === false) {
    isClosed = true;
    message = status.marketReasonUS || status.exchangeStatus?.usSessionLabel || "US Market is outside trading hours.";
    flag = "🇺🇸";
    label = "NYSE / Nasdaq";
  }
  // 3. Regional Indian Market
  else if (effectiveMarket === "IN" && status.marketOpenIN === false) {
    isClosed = true;
    message = status.marketReasonIN || status.marketStatusMessageIN || status.marketClosedMessageIN || "Indian Market (NSE/BSE) trading is currently paused by admin.";
    flag = "🇮🇳";
    label = "NSE / BSE";
  }
  else if (effectiveMarket === "IN" && status.effectiveMarketOpenIN === false) {
    isClosed = true;
    message = status.marketReasonIN || status.exchangeStatus?.indianSessionLabel || "Indian Market is outside trading hours.";
    flag = "🇮🇳";
    label = "NSE / BSE";
  }

  if (!message) return null;

  const stateClass = isClosed ? "msb--closed" : "msb--open";
  const statusLabel = isClosed ? "Closed" : "Open";

  return (
    <div className={`msb ${stateClass}`}>
      <div className="msb__inner">
        <div className="msb__icon-badge">
          <FiClock />
        </div>
        <div className="msb__body">
          <div className="msb__top-row">
            <span className="msb__flag">{flag}</span>
            <span className="msb__label">{label}</span>
            <span className="msb__status-dot" />
            <span className="msb__status-text">{statusLabel}</span>
          </div>
          <p className="msb__message">{message}</p>
        </div>
        <button
          className="msb__close"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <FiX />
        </button>
      </div>
    </div>
  );
}

export default MarketStatusBanner;
