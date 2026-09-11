import { useNavigate } from "react-router-dom";
import { FiClock, FiArrowRight } from "react-icons/fi";
import "./StatsCards.css";

function StatsCards({ inrStockVal = 0, usdStockVal = 0, inrCount = 0, usdCount = 0 }) {
  const navigate = useNavigate();

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

  return (
    <div className="stats-container">
      <div className="stat-card inr-stat">
        <div className="stat-card-top">
          <span className="stat-flag">🇮🇳</span>
          <h4>Indian Stocks Held</h4>
          <span className="stat-count-tag">{inrCount} {inrCount === 1 ? "Stock" : "Stocks"}</span>
        </div>
        <h2 className="stat-amount">₹{formatINR(inrStockVal)}</h2>
        <span className="stat-sub">NSE / BSE Equity Value</span>
      </div>

      <div className="stat-card usd-stat">
        <div className="stat-card-top">
          <span className="stat-flag">🇺🇸</span>
          <h4>US Stocks Held</h4>
          <span className="stat-count-tag">{usdCount} {usdCount === 1 ? "Stock" : "Stocks"}</span>
        </div>
        <h2 className="stat-amount">${formatUSD(usdStockVal)}</h2>
        <span className="stat-sub">NYSE / Nasdaq Equity Value</span>
      </div>

      <div className="stat-card replay-stat" onClick={() => navigate("/replay")}>
        <div className="replay-stat-header">
          <div className="replay-badge-strip">
            <FiClock />
            <span>Time Machine</span>
          </div>
          <span className="replay-live-tag">24/7 Practice</span>
        </div>
        <h3>Replay Past Markets</h3>
        <p>Step candle-by-candle through historical charts and practice trading anytime.</p>
        <button type="button" className="replay-launch-btn">
          <span>Enter Replay Studio</span>
          <FiArrowRight />
        </button>
      </div>
    </div>
  );
}

export default StatsCards;