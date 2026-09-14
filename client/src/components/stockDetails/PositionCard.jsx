import "./PositionCard.css";
import { useEffect, useCallback, useState } from "react";
import API from "../../services/api";
import { useToast } from "../../context/ToastContext";

const HoldingsCard = ({
  symbol,
  currentPrice,
  holding,
  setHolding,
  isUSD: propIsUSD,
}) => {
  const toast = useToast();

  const isUSD =
    propIsUSD !== undefined
      ? propIsUSD
      : holding?.currency === "USD" ||
        (symbol && !symbol.endsWith(".NS") && !symbol.endsWith(".BO"));

  const currencySymbol = isUSD ? "$" : "₹";

  const fetchHolding = useCallback(async () => {
    try {
      const response = await API.get(`/trade/holding/${symbol}`);
      setHolding(response.data.holding);
    } catch (error) {
      console.log(error);
    }
  }, [symbol, setHolding]);

  useEffect(() => {
    if (holding) return;
    fetchHolding();
  }, [holding, fetchHolding]);

  // ---- Manual TP/SL protection ----
  const [protection, setProtection] = useState(null);
  const [protectionLoading, setProtectionLoading] = useState(true);
  const [takeProfitInput, setTakeProfitInput] = useState("");
  const [stopLossInput, setStopLossInput] = useState("");
  const [protectionError, setProtectionError] = useState("");
  const [savingProtection, setSavingProtection] = useState(false);

  const fetchProtection = useCallback(async () => {
    if (!symbol) return;
    try {
      setProtectionLoading(true);
      const response = await API.get(`/trade/protection/${symbol}`);
      const rule = response.data.protection || null;
      setProtection(rule);
      setTakeProfitInput(rule?.takeProfit != null ? String(rule.takeProfit) : "");
      setStopLossInput(rule?.stopLoss != null ? String(rule.stopLoss) : "");
    } catch (error) {
      console.log(error);
    } finally {
      setProtectionLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchProtection();
  }, [fetchProtection]);

  const formatPrice = (value) =>
    (value || 0).toLocaleString(isUSD ? "en-US" : "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleSaveProtection = async () => {
    setProtectionError("");
    const tp = takeProfitInput.trim() === "" ? null : Number(takeProfitInput);
    const sl = stopLossInput.trim() === "" ? null : Number(stopLossInput);

    if (tp == null && sl == null) {
      setProtectionError("Enter at least one of take profit or stop loss.");
      return;
    }
    if (tp != null && (Number.isNaN(tp) || tp <= 0)) {
      setProtectionError("Take profit must be a positive price.");
      return;
    }
    if (sl != null && (Number.isNaN(sl) || sl <= 0)) {
      setProtectionError("Stop loss must be a positive price.");
      return;
    }
    if (tp != null && tp <= currentPrice) {
      setProtectionError("Take profit must be above the current price.");
      return;
    }
    if (sl != null && sl >= currentPrice) {
      setProtectionError("Stop loss must be below the current price.");
      return;
    }

    try {
      setSavingProtection(true);
      const payload = {};
      if (tp != null) payload.takeProfit = tp;
      if (sl != null) payload.stopLoss = sl;
      const response = await API.put(`/trade/protection/${symbol}`, payload);
      setProtection(response.data.protection);
      toast.success("Protection settings saved.", "TP/SL Updated");
    } catch (err) {
      setProtectionError(err.response?.data?.message || "Couldn't save protection settings.");
    } finally {
      setSavingProtection(false);
    }
  };

  const handleRemoveProtection = async () => {
    try {
      setSavingProtection(true);
      setProtectionError("");
      await API.delete(`/trade/protection/${symbol}`);
      setProtection(null);
      setTakeProfitInput("");
      setStopLossInput("");
      toast.success("Protection rule removed.", "TP/SL Removed");
    } catch (err) {
      setProtectionError(err.response?.data?.message || "Couldn't remove protection settings.");
    } finally {
      setSavingProtection(false);
    }
  };

  if (!holding) return null;

  const investment = holding.quantity * holding.avgPrice;
  const currentValue = holding.quantity * currentPrice;
  const profitLoss = currentValue - investment;

  const returnPercentage =
    investment > 0
      ? ((profitLoss / investment) * 100).toFixed(2)
      : 0;

  const isProfit = profitLoss >= 0;

  return (
    <div className="holding-card">
      <div className="holding-header">
        <div className="holding-title-wrap">
          <h2>Your Position {isUSD ? "(USD)" : "(INR)"}</h2>
          <span className="holding-subtitle">Active simulated holding</span>
        </div>

        <span className="live-badge">
          ● Live Position
        </span>
      </div>

      {/* Hero P&L Banner */}
      <div className={`position-hero-banner ${isProfit ? "profit" : "loss"}`}>
        <div className="position-hero-main">
          <span className="position-hero-label">Total Profit / Loss</span>
          <div className="position-hero-values">
            <span className="position-hero-pnl">
              {isProfit ? "+" : "-"}{currencySymbol}{formatPrice(Math.abs(profitLoss))}
            </span>
            <span className={`position-hero-pct ${isProfit ? "profit" : "loss"}`}>
              ({isProfit ? "+" : ""}{returnPercentage}%)
            </span>
          </div>
        </div>
        <div className="position-hero-meta">
          <div className="hero-meta-item">
            <span className="hero-meta-label">Current Value</span>
            <span className="hero-meta-val">{currencySymbol}{formatPrice(currentValue)}</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-label">Invested</span>
            <span className="hero-meta-val">{currencySymbol}{formatPrice(investment)}</span>
          </div>
        </div>
      </div>

      {/* Key Holding Details Grid */}
      <div className="holding-grid">
        <div className="position-box">
          <span>Shares Owned</span>
          <h3>{holding.quantity}</h3>
        </div>

        <div className="position-box">
          <span>Average Buy Price</span>
          <h3>{currencySymbol}{formatPrice(holding.avgPrice)}</h3>
        </div>

        <div className="position-box">
          <span>Take Profit Target</span>
          <h3 className={protection?.takeProfit ? "profit" : ""}>
            {protection?.takeProfit ? `${currencySymbol}${formatPrice(protection.takeProfit)}` : "Not Set"}
          </h3>
        </div>

        <div className="position-box">
          <span>Stop Loss Target</span>
          <h3 className={protection?.stopLoss ? "loss" : ""}>
            {protection?.stopLoss ? `${currencySymbol}${formatPrice(protection.stopLoss)}` : "Not Set"}
          </h3>
        </div>
      </div>

      {/* Manual TP/SL configuration */}
      <div className="protection-panel">
        <div className="protection-panel-header">
          <div className="protection-panel-title-row">
            <h4>Manage Take Profit / Stop Loss</h4>
            <span className={`protection-status-tag ${protection ? "active" : ""}`}>
              {protectionLoading ? "Checking..." : protection ? "● Auto-Exit Active" : "Protection Inactive"}
            </span>
          </div>
          <span className="protection-panel-sub">
            Executed automatically by server order monitor when target price triggers.
          </span>
        </div>

        <div className="protection-inputs-row">
          <div className="protection-field">
            <label htmlFor="take-profit-input">Take Profit Target ({currencySymbol})</label>
            <input
              id="take-profit-input"
              type="number"
              step="0.05"
              placeholder={`Above ${currencySymbol}${formatPrice(currentPrice)}`}
              value={takeProfitInput}
              onChange={(e) => setTakeProfitInput(e.target.value)}
            />
          </div>

          <div className="protection-field">
            <label htmlFor="stop-loss-input">Stop Loss Target ({currencySymbol})</label>
            <input
              id="stop-loss-input"
              type="number"
              step="0.05"
              placeholder={`Below ${currencySymbol}${formatPrice(currentPrice)}`}
              value={stopLossInput}
              onChange={(e) => setStopLossInput(e.target.value)}
            />
          </div>
        </div>

        {protectionError && <p className="protection-error">{protectionError}</p>}

        <div className="protection-actions">
          <button
            type="button"
            className="protection-btn save"
            onClick={handleSaveProtection}
            disabled={savingProtection}
          >
            {savingProtection ? "Saving..." : "Save Protection"}
          </button>
          <button
            type="button"
            className="protection-btn remove"
            onClick={handleRemoveProtection}
            disabled={savingProtection || !protection}
          >
            Remove Protection
          </button>
        </div>
      </div>
    </div>
  );
};

export default HoldingsCard;