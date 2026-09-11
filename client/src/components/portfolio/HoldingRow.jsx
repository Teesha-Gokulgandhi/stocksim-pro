import { useNavigate } from "react-router-dom";
import "./HoldingRow.css";

function HoldingRow({ holding }) {
  const navigate = useNavigate();
  const isUSD =
    holding.currency === "USD" ||
    (holding.symbol && !holding.symbol.endsWith(".NS") && !holding.symbol.endsWith(".BO"));
  const currencySymbol = isUSD ? "$" : "₹";
  const isProfit = (holding.pl || 0) >= 0;

  const formatPrice = (val) =>
    (val || 0).toLocaleString(isUSD ? "en-US" : "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <tr className="portfolio-row" onClick={() => navigate(`/market/${holding.symbol}`)}>
      {/* Column 1: Asset Details */}
      <td className="stock-cell">
        <div className="holding-stock-item">
          <div className={`holding-avatar ${isUSD ? "usd" : "inr"}`}>
            {holding.symbol?.slice(0, 2).toUpperCase() || "ST"}
          </div>
          <div className="holding-info">
            <strong className="holding-name">{holding.companyName}</strong>
            <div className="holding-meta">
              <span className="holding-symbol">{holding.symbol}</span>
              <span className={`market-tag ${isUSD ? "usd" : "inr"}`}>
                {isUSD ? "🇺🇸 US" : "🇮🇳 NSE"}
              </span>
              {holding.takeProfit && (
                <span className="holding-bracket-tag tp" title="Take Profit Target">
                  TP: {currencySymbol}{formatPrice(holding.takeProfit)}
                </span>
              )}
              {holding.stopLoss && (
                <span className="holding-bracket-tag sl" title="Stop Loss Trigger">
                  SL: {currencySymbol}{formatPrice(holding.stopLoss)}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Column 2: Shares */}
      <td className="num-cell bold">{holding.quantity}</td>

      {/* Column 3: Avg Buy Price */}
      <td className="num-cell">{currencySymbol}{formatPrice(holding.avgPrice)}</td>

      {/* Column 4: Current Price */}
      <td className="num-cell">{currencySymbol}{formatPrice(holding.currentPrice)}</td>

      {/* Column 5: Total Value */}
      <td className="num-cell bold">{currencySymbol}{formatPrice(holding.currentValue)}</td>

      {/* Column 6: Unrealized P/L */}
      <td className="num-cell">
        <div className={`pnl-wrap ${isProfit ? "profit" : "loss"}`}>
          <span className="pnl-val">
            {isProfit ? "+" : "-"}{currencySymbol}{formatPrice(Math.abs(holding.pl || 0))}
          </span>
          <span className="pnl-percent">
            ({isProfit ? "+" : ""}{(holding.plPercent || 0).toFixed(2)}%)
          </span>
        </div>
      </td>

      {/* Column 7: Action */}
      <td className="action-cell" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="trade-cta-btn"
          onClick={() => navigate(`/market/${holding.symbol}`)}
        >
          Trade
        </button>
      </td>
    </tr>
  );
}

export default HoldingRow;