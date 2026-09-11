import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTrendingUp,
  FiPlusCircle,
  FiClock,
  FiArrowUpRight,
  FiArrowDownRight,
} from "react-icons/fi";

import AddFundsModal from "../../AddFundsModal";
import "./HeroCard.css";

function HeroCard({ balance, balanceUSD, totalPL, plPercent, onBalanceUpdate }) {
  const navigate = useNavigate();
  const [showAddFunds, setShowAddFunds] = useState(false);

  const formattedBalance = Number(balance || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedUSD = Number(balanceUSD || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isProfit = totalPL >= 0;
  const formattedPL = Number(Math.abs(totalPL || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedPercent = Number(plPercent || 0).toFixed(2);

  return (
    <div className="hero-card">
      <div className="hero-top-row">
        <div>
          <div className="hero-greeting-badge">
            <span className="badge-pulse-dot" />
            <span>Trading Desk Active</span>
          </div>
          <h1 className="hero-title">Welcome to StockSim Pro</h1>
          <p className="hero-subtitle">
            Trade live Indian & US equities or practice anytime with 24/7 Candlestick Replay.
          </p>
        </div>

        <div className="hero-pl-metric">
          <span className="metric-label">Estimated P&L</span>
          <div className={`metric-value ${isProfit ? "profit" : "loss"}`}>
            {isProfit ? <FiArrowUpRight /> : <FiArrowDownRight />}
            <span>{isProfit ? "+" : "-"}₹{formattedPL}</span>
            <span className="metric-badge">({isProfit ? "+" : ""}{formattedPercent}%)</span>
          </div>
        </div>
      </div>

      <div className="hero-margins-grid">
        <div className="margin-card inr">
          <div className="margin-card-header">
            <span className="margin-flag">🇮🇳</span>
            <span className="margin-market">NSE / BSE Market</span>
            <span className="margin-status live">Live Feed</span>
          </div>
          <div className="margin-amount-row">
            <span className="margin-curr">₹</span>
            <span className="margin-value">{formattedBalance}</span>
          </div>
          <span className="margin-footer-label">Available Virtual Margin</span>
        </div>

        <div className="margin-card usd">
          <div className="margin-card-header">
            <span className="margin-flag">🇺🇸</span>
            <span className="margin-market">NYSE / Nasdaq</span>
            <span className="margin-status global">Global Feed</span>
          </div>
          <div className="margin-amount-row">
            <span className="margin-curr">$</span>
            <span className="margin-value">{formattedUSD}</span>
          </div>
          <span className="margin-footer-label">Available Virtual Margin</span>
        </div>
      </div>

      <div className="hero-actions-row">
        <button
          type="button"
          className="hero-action-btn primary"
          onClick={() => navigate("/market")}
        >
          <FiTrendingUp />
          <span>Live Market Watch</span>
        </button>

        <button
          type="button"
          className="hero-action-btn replay"
          onClick={() => navigate("/replay")}
        >
          <FiClock />
          <span>Replay Studio (24/7)</span>
          <span className="action-pill-highlight">Practice</span>
        </button>

        <button
          type="button"
          className="hero-action-btn secondary"
          onClick={() => setShowAddFunds(true)}
        >
          <FiPlusCircle />
          <span>Deposit INR Margin</span>
        </button>
      </div>

      {showAddFunds && (
        <AddFundsModal
          onClose={() => setShowAddFunds(false)}
          onSuccess={(newBalance) => onBalanceUpdate?.(newBalance)}
        />
      )}
    </div>
  );
}

export default HeroCard;
