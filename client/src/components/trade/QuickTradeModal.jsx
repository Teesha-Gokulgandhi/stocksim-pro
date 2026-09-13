import { useState, useEffect, useMemo, useCallback } from "react";
import { FiX, FiCheck, FiAlertCircle } from "react-icons/fi";
import API from "../../services/api";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import "./QuickTradeModal.css";

const PRESET_QUANTITIES = [10, 25, 50, 100, 250];

function QuickTradeModal({ stock, isOpen, onClose, onTradeSuccess }) {
  const { user, refreshUser } = useUser();
  const toast = useToast();

  const [mode, setMode] = useState("BUY");
  const [quantity, setQuantity] = useState(1);
  const [holding, setHolding] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [marketStatus, setMarketStatus] = useState({ marketOpen: true });

  const isUSD =
    stock?.currency === "USD" ||
    (stock?.symbol && !stock.symbol.endsWith(".NS") && !stock.symbol.endsWith(".BO"));
  const currencySymbol = isUSD ? "$" : "₹";
  const balance = isUSD ? (user?.balanceUSD ?? 10000) : (user?.balance || 0);

  // Esc key closes the modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const fetchHolding = useCallback(async () => {
    if (!stock?.symbol) return;
    try {
      const res = await API.get(`/trade/holding/${stock.symbol}`);
      setHolding(res.data.holding || null);
    } catch {
      setHolding(null);
    }
  }, [stock]);

  const fetchMarketStatus = useCallback(async () => {
    try {
      const res = await API.get("/admin/market-status");
      setMarketStatus(res.data);
    } catch {
      setMarketStatus({ marketOpen: true });
    }
  }, []);

  useEffect(() => {
    if (isOpen && stock?.symbol) {
      setQuantity(1);
      setError("");
      setMode("BUY");
      fetchHolding();
      fetchMarketStatus();
      if (refreshUser) refreshUser();
    }
  }, [isOpen, stock?.symbol, stock?.currentPrice, fetchHolding, fetchMarketStatus, refreshUser]);

  const ownedQuantity = holding?.quantity || 0;

  const formatMoney = (val) =>
    (val || 0).toLocaleString(isUSD ? "en-US" : "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const estimatedAmount = useMemo(() => {
    return (stock?.currentPrice || 0) * (Number(quantity) || 0);
  }, [stock?.currentPrice, quantity]);

  const remainingBalance = useMemo(() => {
    return mode === "BUY" ? balance - estimatedAmount : balance + estimatedAmount;
  }, [mode, balance, estimatedAmount]);

  if (!isOpen || !stock) return null;

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

  const handleTrade = async (e) => {
    e.preventDefault();
    const qty = Number(quantity);

    if (!qty || qty <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }

    if (mode === "BUY" && estimatedAmount > balance) {
      setError(`Insufficient ${isUSD ? "USD ($)" : "INR (₹)"} balance in your wallet.`);
      return;
    }

    if (mode === "SELL" && qty > ownedQuantity) {
      setError(`You only hold ${ownedQuantity} shares.`);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const endpoint = mode === "BUY" ? "/trade/buy" : "/trade/sell";

      const payload = {
        symbol: stock.symbol,
        quantity: qty,
      };

      const res = await API.post(endpoint, payload);

      await refreshUser();

      // Notify entire app of executed trade for immediate collection & UI updates
      window.dispatchEvent(
        new CustomEvent("stocksim:trade-executed", {
          detail: { ...res.data, symbol: stock.symbol, mode, quantity: qty }
        })
      );

      toast.success(
        `${mode === "BUY" ? "Purchased" : "Sold"} ${qty} share${qty > 1 ? "s" : ""} of ${stock.symbol} at ${currencySymbol}${formatMoney(stock.currentPrice)}`,
        "Trade Executed"
      );

      if (onTradeSuccess) {
        onTradeSuccess(res.data);
      }

      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Trade failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="trade-modal-overlay" onClick={onClose}>
      <div className="trade-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="trade-modal-header">
          <div className="trade-modal-title">
            <h3>Trade {stock.symbol} {isUSD ? "(US)" : "(NSE)"}</h3>
            <p>{stock.companyName}</p>
          </div>
          <button className="trade-modal-close" onClick={onClose} type="button" title="Close (Esc)">
            <FiX />
          </button>
        </div>

        {/* Clean, Dedicated Order Entry */}
        <div className="trade-type-tabs">
          <button
            type="button"
            className={`trade-type-tab buy ${mode === "BUY" ? "active" : ""}`}
            onClick={() => {
              setMode("BUY");
              setQuantity(1);
              setError("");
            }}
          >
            Buy
          </button>
          <button
            type="button"
            className={`trade-type-tab sell ${mode === "SELL" ? "active" : ""}`}
            disabled={ownedQuantity === 0}
            onClick={() => {
              setMode("SELL");
              setQuantity(1);
              setError("");
            }}
          >
            Sell {ownedQuantity > 0 ? `(${ownedQuantity})` : ""}
          </button>
        </div>

        <div className="trade-price-strip">
          <div>
            <span>Market Price</span>
            <strong>{currencySymbol}{formatMoney(stock.currentPrice)}</strong>
          </div>
          <div className="trade-price-strip-right">
            <span>{mode === "BUY" ? `Available Margin (${isUSD ? "$" : "₹"})` : "Shares Owned"}</span>
            <strong>
              {mode === "BUY" ? `${currencySymbol}${formatMoney(balance)}` : `${ownedQuantity} shares`}
            </strong>
          </div>
        </div>

            <form onSubmit={handleTrade} className="trade-modal-form">
              <div className="trade-qty-field">
                <label htmlFor="quick-trade-qty">Shares to {mode.toLowerCase()}</label>
                <div className="trade-qty-input-wrap">
                  <button
                    type="button"
                    className="modal-stepper-btn"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <input
                    id="quick-trade-qty"
                    type="number"
                    min="1"
                    max={mode === "SELL" ? ownedQuantity : undefined}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="modal-stepper-btn"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={mode === "SELL" && quantity >= ownedQuantity}
                    aria-label="Increase"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="max-btn"
                    onClick={handleMaxQuantity}
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="trade-preset-chips">
                {PRESET_QUANTITIES.map((num) => (
                  <button
                    type="button"
                    key={num}
                    className={quantity === num ? "preset-chip active" : "preset-chip"}
                    onClick={() => handleQuantityChange(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="trade-calc-summary">
                <div className="calc-row">
                  <span>{mode === "BUY" ? "Total Investment" : "Total Proceeds"}</span>
                  <strong className="calc-amount">{currencySymbol}{formatMoney(estimatedAmount)}</strong>
                </div>
                <div className="calc-row text-muted">
                  <span>Est. Cash After Trade</span>
                  <span className={remainingBalance < 0 ? "text-danger" : ""}>
                    {currencySymbol}{formatMoney(Math.max(0, remainingBalance))}
                  </span>
                </div>
              </div>

              {mode === "BUY" && (
                <p className="trade-protection-hint">
                  Want to set a take-profit or stop-loss for this position? You can do that from the stock's details page after buying.
                </p>
              )}

              {(() => {
                const isMarketClosed =
                  marketStatus.marketOpen === false ||
                  (isUSD && (marketStatus.marketOpenUS === false || marketStatus.effectiveMarketOpenUS === false)) ||
                  (!isUSD && (marketStatus.marketOpenIN === false || marketStatus.effectiveMarketOpenIN === false));

                const marketClosedNotice =
                  marketStatus.marketOpen === false
                    ? marketStatus.marketClosedMessage || "Trading is currently paused platform-wide by admin."
                    : isUSD && marketStatus.marketStatusUS
                    ? marketStatus.marketReasonUS || marketStatus.marketStatusUS.replaceAll("_", " ")
                    : !isUSD && marketStatus.marketStatusIN
                    ? marketStatus.marketReasonIN || marketStatus.marketStatusIN.replaceAll("_", " ")
                    : isUSD && marketStatus.effectiveMarketOpenUS === false
                    ? "US market is currently outside its trading hours."
                    : !isUSD && marketStatus.effectiveMarketOpenIN === false
                    ? "Indian market is currently outside its trading hours."
                    : isUSD
                    ? marketStatus.marketClosedMessageUS || "US Market (NYSE/Nasdaq) trading is currently paused by admin."
                    : marketStatus.marketClosedMessageIN || "Indian Market (NSE/BSE) trading is currently paused by admin.";

                return (
                  <>
                    {(isMarketClosed || error) && (
                      <div className="trade-error-box">
                        <FiAlertCircle />
                        <span>{isMarketClosed ? marketClosedNotice : error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className={`trade-confirm-btn ${mode.toLowerCase()}`}
                      disabled={submitting || (mode === "SELL" && ownedQuantity === 0) || isMarketClosed}
                    >
                      {submitting ? (
                        "Executing Trade..."
                      ) : isMarketClosed ? (
                        "Trading Paused by Admin"
                      ) : (
                        <>
                          <FiCheck /> Confirm {mode === "BUY" ? "Purchase" : "Sale"}
                        </>
                      )}
                    </button>
                  </>
                );
              })()}
            </form>
      </div>
    </div>
  );
}

export default QuickTradeModal;