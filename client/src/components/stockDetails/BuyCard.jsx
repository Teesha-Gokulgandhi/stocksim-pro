import { useState, useEffect } from "react";
import API from "../../services/api";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import "./BuyCard.css";

const PRESET_QUANTITIES = [1, 5, 10, 25, 50];

function BuyCard({ stock, balance, setBalance, holding, setHolding }) {
  const { refreshUser } = useUser();
  const toast = useToast();

  const [requestedMode, setRequestedMode] = useState("BUY");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [marketStatus, setMarketStatus] = useState({ marketOpen: true });

  useEffect(() => {
    let active = true;
    API.get("/admin/market-status")
      .then(({ data }) => {
        if (active) setMarketStatus(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const isUSD =
    stock?.currency === "USD" ||
    (stock?.symbol && !stock.symbol.endsWith(".NS") && !stock.symbol.endsWith(".BO"));
  const currencySymbol = isUSD ? "$" : "₹";

  const isMarketClosed =
    !marketStatus.marketOpen ||
    (isUSD && (marketStatus.marketOpenUS === false || marketStatus.effectiveMarketOpenUS === false)) ||
    (!isUSD && (marketStatus.marketOpenIN === false || marketStatus.effectiveMarketOpenIN === false));

  const marketPausedLabel = !marketStatus.marketOpen
    ? "Market Paused by Admin"
    : isUSD && marketStatus.marketReasonUS
    ? marketStatus.marketReasonUS
    : !isUSD && marketStatus.marketReasonIN
    ? marketStatus.marketReasonIN
    : isUSD && marketStatus.marketStatusUS
    ? marketStatus.marketStatusUS.replaceAll("_", " ")
    : !isUSD && marketStatus.marketStatusIN
    ? marketStatus.marketStatusIN.replaceAll("_", " ")
    : isUSD && marketStatus.effectiveMarketOpenUS === false
    ? "US Market Outside Trading Hours"
    : !isUSD && marketStatus.effectiveMarketOpenIN === false
    ? "Indian Market Outside Trading Hours"
    : isUSD
    ? "US Trading Paused by Admin"
    : "Indian Trading Paused by Admin";

  const ownedQuantity = holding?.quantity || 0;
  // Derive mode purely: if user selected SELL but has 0 shares, fall back to BUY without an effect
  const mode = requestedMode === "SELL" && ownedQuantity === 0 ? "BUY" : requestedMode;

  const formatMoney = (value) =>
    (value || 0).toLocaleString(isUSD ? "en-US" : "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleQuantityChange = (val) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    if (mode === "SELL" && ownedQuantity > 0 && num > ownedQuantity) {
      setQuantity(ownedQuantity);
    } else {
      setQuantity(num);
    }
    setError("");
  };

  const handleMaxQuantity = () => {
    if (mode === "BUY") {
      const maxCanBuy = Math.floor(balance / (stock.currentPrice || 1));
      setQuantity(Math.max(1, maxCanBuy));
    } else {
      setQuantity(Math.max(1, ownedQuantity));
    }
    setError("");
  };

  const switchMode = (newMode) => {
    setRequestedMode(newMode);
    setQuantity(1);
    setError("");
  };

  const estimatedAmount = (stock?.currentPrice || 0) * (Number(quantity) || 0);
  const remainingCash = mode === "BUY" ? balance - estimatedAmount : balance + estimatedAmount;

  const handleTrade = async () => {
    setError("");

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a valid quantity.");
      return;
    }

    if (mode === "BUY" && estimatedAmount > balance) {
      setError(`Insufficient ${isUSD ? "USD ($)" : "INR (₹)"} balance for this purchase.`);
      return;
    }

    if (mode === "SELL" && qty > ownedQuantity) {
      setError(`You only own ${ownedQuantity} shares.`);
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = mode === "BUY" ? "/trade/buy" : "/trade/sell";

      const response = await API.post(endpoint, {
        symbol: stock.symbol,
        quantity: qty,
      });

      setBalance(isUSD && response.data.balanceUSD != null ? response.data.balanceUSD : response.data.balance);
      await refreshUser();

      // Notify entire app of executed trade for immediate collection & UI updates
      window.dispatchEvent(
        new CustomEvent("stocksim:trade-executed", {
          detail: { ...response.data, symbol: stock.symbol, mode, quantity: qty }
        })
      );

      if (mode === "BUY") {
        setHolding(response.data.holding);
      } else {
        setHolding((prev) => {
          if (!prev) return null;
          const remaining = prev.quantity - qty;
          return remaining <= 0 ? null : { ...prev, quantity: remaining };
        });
      }

      toast.success(
        `${mode === "BUY" ? "Purchased" : "Sold"} ${qty} share${qty > 1 ? "s" : ""} of ${stock.symbol} at ${currencySymbol}${formatMoney(stock.currentPrice)}`,
        "Trade Completed"
      );

      setQuantity(1);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `${mode === "BUY" ? "Purchase" : "Sale"} failed. Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!stock) return null;

  return (
    <div className="buy-card">
      <div className="trade-header">
        <h2>Trade Stock {isUSD ? "(US Market)" : "(NSE)"}</h2>

        <div className="mode-toggle">
          <button
            type="button"
            className={mode === "BUY" ? "mode-btn buy active" : "mode-btn buy"}
            onClick={() => switchMode("BUY")}
          >
            Buy
          </button>

          {ownedQuantity > 0 && (
            <button
              type="button"
              className={mode === "SELL" ? "mode-btn sell active" : "mode-btn sell"}
              onClick={() => switchMode("SELL")}
            >
              Sell
            </button>
          )}
        </div>
      </div>

      <div className="trade-summary">
        <div className="summary-box">
          <span>Current Price</span>
          <strong>{currencySymbol}{formatMoney(stock.currentPrice)}</strong>
        </div>

        <div className="summary-box">
          <span>{mode === "BUY" ? (isUSD ? "Available USD Margin" : "Available INR Margin") : "Shares Available"}</span>
          <strong>
            {mode === "BUY" ? `${currencySymbol}${formatMoney(balance)}` : `${ownedQuantity} shares`}
          </strong>
        </div>
      </div>

      <div className="quantity-card">
        <div className="quantity-header">
          <div className="quantity-label-col">
            <label htmlFor="order-quantity-input" className="quantity-label">Quantity (Shares)</label>
            {mode === "SELL" && (
              <span className="max-hint">Max available: <strong>{ownedQuantity}</strong></span>
            )}
          </div>
          <div className="quantity-presets">
            {[10, 25, 50, 100, 250].map((n) => (
              <button
                type="button"
                key={n}
                className={quantity === n ? "qty-preset-btn active" : "qty-preset-btn"}
                onClick={() => handleQuantityChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="quantity-stepper-box">
          <button
            type="button"
            className="stepper-btn dec-btn"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>

          <div className="stepper-input-wrapper">
            <input
              id="order-quantity-input"
              type="number"
              min="1"
              max={mode === "SELL" ? ownedQuantity : undefined}
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="stepper-input"
            />
            <span className="stepper-unit">SHARES</span>
          </div>

          <button
            type="button"
            className="stepper-btn inc-btn"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={mode === "SELL" && quantity >= ownedQuantity}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <div className="estimate-card">
        <div className="estimate-main">
          <span>{mode === "BUY" ? "Estimated Cost" : "Estimated Proceeds"}</span>
          <h1>{currencySymbol}{formatMoney(estimatedAmount)}</h1>
        </div>
        <div className="estimate-sub">
          <span>Cash After Trade:</span>
          <strong>{currencySymbol}{formatMoney(Math.max(0, remainingCash))}</strong>
        </div>
      </div>

      {error && <p className="trade-error">{error}</p>}

      <button
        type="button"
        className={mode === "BUY" ? "trade-btn buy-btn" : "trade-btn sell-btn"}
        onClick={handleTrade}
        disabled={submitting || (mode === "SELL" && ownedQuantity === 0) || isMarketClosed}
      >
        {submitting
          ? "Processing..."
          : isMarketClosed
          ? marketPausedLabel
          : mode === "BUY"
          ? "Buy Stock"
          : "Sell Stock"}
      </button>
    </div>
  );
}

export default BuyCard;