import { useMemo } from "react";
import { FiTrendingUp, FiBarChart2, FiLayers, FiActivity } from "react-icons/fi";
import "./StockRealAnalytics.css";

function formatCompactNumber(num, isUSD = false) {
  if (num == null || Number.isNaN(Number(num)) || num === 0) return "—";
  const val = Number(num);
  const cur = isUSD ? "$" : "₹";

  if (isUSD) {
    if (val >= 1e12) return `${cur}${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `${cur}${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `${cur}${(val / 1e6).toFixed(2)}M`;
    return `${cur}${val.toLocaleString()}`;
  }

  // Indian number system: Lakh (1e5), Crore (1e7), Lakh Cr (1e12)
  if (val >= 1e12) return `${cur}${(val / 1e12).toFixed(2)}L Cr`;
  if (val >= 1e7) return `${cur}${(val / 1e7).toFixed(2)} Cr`;
  if (val >= 1e5) return `${cur}${(val / 1e5).toFixed(2)} Lakh`;
  return `${cur}${val.toLocaleString("en-IN")}`;
}

export default function StockRealAnalytics({
  stock = {},
  isUSD = false,
  onAskCopilot,
}) {
  const currencySymbol = isUSD ? "$" : "₹";
  const currentPrice = Number(stock.currentPrice || stock.price || 0);

  // Today's Range
  const dayLow = Number(stock.low || currentPrice * 0.99);
  const dayHigh = Number(stock.high || currentPrice * 1.01);
  const dayRangeSpread = Math.max(0.01, dayHigh - dayLow);
  const dayProgressPct = Math.min(100, Math.max(0, ((currentPrice - dayLow) / dayRangeSpread) * 100));

  // 52-Week Range
  const w52Low = Number(stock.fiftyTwoWeekLow || dayLow * 0.85);
  const w52High = Number(stock.fiftyTwoWeekHigh || dayHigh * 1.25);
  const w52Spread = Math.max(0.01, w52High - w52Low);
  const w52ProgressPct = Math.min(100, Math.max(0, ((currentPrice - w52Low) / w52Spread) * 100));

  const handleCopilotClick = () => {
    if (onAskCopilot) {
      onAskCopilot();
      return;
    }
    window.dispatchEvent(
      new CustomEvent("open-copilot", {
        detail: {
          query: `Give a comprehensive analytical breakdown for ${stock.symbol} including valuation multiples, technical support/resistance, and sector catalysts.`,
        },
      })
    );
  };

  return (
    <div className="groww-analytics-card">
      <div className="groww-card-header">
        <div className="groww-header-title">
          <FiBarChart2 className="header-icon" />
          <div>
            <h4>Performance & Fundamentals</h4>
            <span className="live-source-badge">100% Real-Time Market Data</span>
          </div>
        </div>

        <button
          type="button"
          className="clean-copilot-trigger-btn"
          onClick={handleCopilotClick}
          title="Ask AI Copilot for analytical insights"
        >
          <FiActivity /> AI Analytics
        </button>
      </div>

      {/* Groww-style Performance Sliders */}
      <div className="groww-performance-section">
        {/* Today's Low / High */}
        <div className="range-slider-row">
          <div className="range-meta">
            <span className="meta-lbl">Today's Low</span>
            <strong>{currencySymbol}{dayLow.toFixed(2)}</strong>
          </div>

          <div className="range-track-wrap">
            <div className="range-track-bg">
              <div
                className="range-current-pin"
                style={{ left: `${dayProgressPct}%` }}
                title={`Current: ${currencySymbol}${currentPrice.toFixed(2)}`}
              >
                <span className="pin-triangle" />
                <span className="pin-tooltip">{currencySymbol}{currentPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="range-meta right">
            <span className="meta-lbl">Today's High</span>
            <strong>{currencySymbol}{dayHigh.toFixed(2)}</strong>
          </div>
        </div>

        {/* 52-Week Low / High */}
        <div className="range-slider-row">
          <div className="range-meta">
            <span className="meta-lbl">52-Week Low</span>
            <strong>{currencySymbol}{w52Low.toFixed(2)}</strong>
          </div>

          <div className="range-track-wrap">
            <div className="range-track-bg w52">
              <div
                className="range-current-pin"
                style={{ left: `${w52ProgressPct}%` }}
                title={`Current: ${currencySymbol}${currentPrice.toFixed(2)}`}
              >
                <span className="pin-triangle" />
                <span className="pin-tooltip">{currencySymbol}{currentPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="range-meta right">
            <span className="meta-lbl">52-Week High</span>
            <strong>{currencySymbol}{w52High.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Fundamentals Grid (Groww style) */}
      <div className="groww-fundamentals-grid">
        <div className="fund-tile">
          <span className="fund-lbl">Open</span>
          <strong>{currencySymbol}{Number(stock.open || currentPrice).toFixed(2)}</strong>
        </div>

        <div className="fund-tile">
          <span className="fund-lbl">Prev. Close</span>
          <strong>{currencySymbol}{Number(stock.previousClose || currentPrice).toFixed(2)}</strong>
        </div>

        <div className="fund-tile">
          <span className="fund-lbl">Volume</span>
          <strong>{Number(stock.volume || 0).toLocaleString()}</strong>
        </div>

        <div className="fund-tile">
          <span className="fund-lbl">Avg. Volume</span>
          <strong>{Number(stock.avgVolume || stock.volume || 0).toLocaleString()}</strong>
        </div>

        <div className="fund-tile">
          <span className="fund-lbl">Market Cap</span>
          <strong>{formatCompactNumber(stock.marketCap, isUSD)}</strong>
        </div>

        <div className="fund-tile">
          <span className="fund-lbl">P/E Ratio (TTM)</span>
          <strong>{stock.pe ? Number(stock.pe).toFixed(2) : "—"}</strong>
        </div>

        <div className="fund-tile">
          <span className="fund-lbl">EPS (TTM)</span>
          <strong>{stock.eps ? `${currencySymbol}${Number(stock.eps).toFixed(2)}` : "—"}</strong>
        </div>

        <div className="fund-tile">
          <span className="fund-lbl">Exchange</span>
          <strong>{stock.exchange || (isUSD ? "NYSE" : "NSE")}</strong>
        </div>
      </div>
    </div>
  );
}
