import { useState } from "react";
import {
  FiAward,
  FiTrendingUp,
  FiCheckCircle,
  FiSave,
  FiRotateCcw,
  FiX,
  FiPercent,
  FiDollarSign,
} from "react-icons/fi";
import "./ReplayScorecardModal.css";

function ReplayScorecardModal({
  isOpen,
  onClose,
  sessionStats,
  onSave,
  onPlayAgain,
  currency = "USD",
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen || !sessionStats) return null;

  const {
    initialBalance = 100000,
    finalBalance = 100000,
    netPnl = 0,
    returnPercent = 0,
    trades = [],
    displaySymbol = "ASSET",
    isBlind = false,
  } = sessionStats;

  const currencySymbol = currency === "INR" ? "₹" : "$";

  // Compute stats
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const losingTrades = trades.filter((t) => t.pnl < 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : "0.0";

  let grossGains = 0;
  let grossLosses = 0;
  let bestTrade = 0;
  let worstTrade = 0;

  trades.forEach((t) => {
    if (t.pnl > 0) grossGains += t.pnl;
    if (t.pnl < 0) grossLosses += Math.abs(t.pnl);
    if (t.pnl > bestTrade) bestTrade = t.pnl;
    if (t.pnl < worstTrade) worstTrade = t.pnl;
  });

  const profitFactor =
    grossLosses > 0 ? (grossGains / grossLosses).toFixed(2) : grossGains > 0 ? "∞" : "0.00";

  // Calculate grade
  let grade;
  let gradeTitle;
  let gradeColor;

  const numWinRate = Number(winRate);
  if (numWinRate >= 70 && returnPercent >= 8) {
    grade = "S";
    gradeTitle = "Apex Trader (God-Tier)";
    gradeColor = "var(--color-profit)";
  } else if (numWinRate >= 60 || returnPercent >= 5) {
    grade = "A";
    gradeTitle = "Profitable Disciplined";
    gradeColor = "var(--color-profit)";
  } else if (numWinRate >= 45 || returnPercent >= 0) {
    grade = "B";
    gradeTitle = "Consistent Operator";
    gradeColor = "var(--accent-primary)";
  } else if (numWinRate >= 30) {
    grade = "C";
    gradeTitle = "Developing Edge";
    gradeColor = "var(--color-warning)";
  } else {
    grade = "D";
    gradeTitle = "High Risk / Drawdown";
    gradeColor = "var(--color-loss)";
  }

  // Coaching feedback
  let coachTip = "Focus on risk-to-reward ratio. Make sure your average winning trade is larger than your average losing trade.";
  if (grade === "S" || grade === "A") {
    coachTip = "Phenomenal execution! You capitalized on favorable setups while maintaining discipline on exits.";
  } else if (grade === "B") {
    coachTip = "Solid consistency! To elevate to A-tier, focus on letting high-conviction breakout trades run longer.";
  } else if (numWinRate < 40 && returnPercent < 0) {
    coachTip = "Avoid over-trading. Wait for clear candlestick confluence (like bounce off 21 EMA or key support) before entering.";
  }

  const handleSaveSession = async () => {
    try {
      setSaving(true);
      await onSave?.({
        ...sessionStats,
        winRate: Number(winRate),
        tradesCount: totalTrades,
        winningTrades,
        losingTrades,
        profitFactor: profitFactor === "∞" ? 99 : Number(profitFactor),
        grade,
      });
      setSaved(true);
    } catch {
      // Handled in parent
    } finally {
      setSaving(false);
    }
  };

  const isProfit = netPnl >= 0;

  return (
    <div className="scorecard-overlay" onClick={onClose}>
      <div className="scorecard-modal" onClick={(e) => e.stopPropagation()}>
        <button className="scorecard-close" onClick={onClose} type="button">
          <FiX />
        </button>

        <div className="scorecard-header">
          <div className="grade-badge-wrap" style={{ borderColor: gradeColor }}>
            <span className="grade-letter" style={{ color: gradeColor }}>
              {grade}
            </span>
          </div>

          <h2>Replay Session Complete</h2>
          <p className="grade-title" style={{ color: gradeColor }}>
            {gradeTitle}
          </p>
          <p className="scorecard-asset-tag">
            {isBlind ? "🎭 Blind Practice" : "Stock"}: <strong>{displaySymbol}</strong>
          </p>
        </div>

        <div className="scorecard-main-pnl">
          <span className="pnl-label">Net Profit / Loss</span>
          <h1 className={isProfit ? "profit" : "loss"}>
            {isProfit ? "+" : "-"}{currencySymbol}{Math.abs(netPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <span className={`pnl-percent ${isProfit ? "profit" : "loss"}`}>
            {isProfit ? "+" : ""}{returnPercent.toFixed(2)}% Total Return
          </span>
        </div>

        <div className="scorecard-grid">
          <div className="score-stat-card">
            <span className="stat-label">
              <FiPercent /> Win Rate
            </span>
            <strong className="stat-value">{winRate}%</strong>
            <small>{winningTrades} Won / {losingTrades} Lost</small>
          </div>

          <div className="score-stat-card">
            <span className="stat-label">
              <FiTrendingUp /> Profit Factor
            </span>
            <strong className="stat-value">{profitFactor}</strong>
            <small>Gains vs Losses</small>
          </div>

          <div className="score-stat-card">
            <span className="stat-label">
              <FiAward /> Best Trade
            </span>
            <strong className="stat-value text-gain">
              +{currencySymbol}{bestTrade.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </strong>
            <small>Worst: {currencySymbol}{worstTrade.toLocaleString("en-US", { maximumFractionDigits: 2 })}</small>
          </div>

          <div className="score-stat-card">
            <span className="stat-label">
              <FiDollarSign /> Ending Capital
            </span>
            <strong className="stat-value">
              {currencySymbol}{finalBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </strong>
            <small>Started: {currencySymbol}{initialBalance.toLocaleString("en-US", { maximumFractionDigits: 0 })}</small>
          </div>
        </div>

        <div className="coach-advice-box">
          <span className="coach-tag">💡 TRADER COACH FEEDBACK</span>
          <p>{coachTip}</p>
        </div>

        <div className="scorecard-actions">
          <button
            type="button"
            className={`scorecard-save-btn ${saved ? "saved" : ""}`}
            onClick={handleSaveSession}
            disabled={saving || saved}
          >
            {saved ? (
              <>
                <FiCheckCircle /> Saved to Journal
              </>
            ) : saving ? (
              "Saving..."
            ) : (
              <>
                <FiSave /> Save to Journal
              </>
            )}
          </button>

          <button
            type="button"
            className="scorecard-replay-btn"
            onClick={onPlayAgain}
          >
            <FiRotateCcw /> Practice Another Setup
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReplayScorecardModal;
