import { useNavigate } from "react-router-dom";
import {
  FiShoppingCart,
  FiStar,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";
import "./StockCard.css";

function StockCard({ stock, isWatchlisted, onToggleWatchlist, onQuickTrade }) {
  const navigate = useNavigate();
  const isPositive = stock.changePercent >= 0;

  const handleStarClick = (e) => {
    e.stopPropagation();
    if (onToggleWatchlist) onToggleWatchlist(stock.symbol);
  };

  const isUSD =
    stock.currency === "USD" ||
    stock.country === "US" ||
    (!stock.symbol.endsWith(".NS") && !stock.symbol.endsWith(".BO"));
  const currSym = isUSD ? "$" : "₹";
  const formattedPrice = Number(stock.currentPrice || 0).toLocaleString(
    isUSD ? "en-US" : "en-IN",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );

  return (
    <div className="stock-card" onClick={() => navigate(`/market/${stock.symbol}`)}>
      <div className="stock-header">
        <div className="stock-company">
          <div className="stock-logo">{stock.companyName.charAt(0)}</div>
          <div>
            <h3>{stock.companyName}</h3>
            <p>
              {stock.symbol} •{" "}
              <span className="stock-exchange-tag">{stock.exchange || (isUSD ? "US" : "NSE")}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
          className={isWatchlisted ? "watch-btn active" : "watch-btn"}
          onClick={handleStarClick}
        >
          <FiStar />
        </button>
      </div>

      <div className="stock-price">
        <h2>
          {currSym}{formattedPrice}
        </h2>

        <span className={isPositive ? "positive" : "negative"}>
          {isPositive ? <FiTrendingUp /> : <FiTrendingDown />}
          {Number(stock.changePercent || 0).toFixed(2)}%
        </span>
      </div>

      <div className="sector-badge">{stock.sector}</div>

      <div className="stock-info">
        <div>
          <span>Market Cap</span>
          <strong>
            {currSym}
            {isUSD
              ? `${((stock.marketCap || 0) / 1000000000).toFixed(1)}B`
              : `${((stock.marketCap || 0) / 1000000000000).toFixed(1)}T`}
          </strong>
        </div>
        <div>
          <span>Volume</span>
          <strong>{((stock.volume || 0) / 1000000).toFixed(1)}M</strong>
        </div>
      </div>

      <div className="stock-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="quick-trade-card-btn"
          onClick={() => onQuickTrade?.(stock)}
        >
          <FiShoppingCart /> Trade
        </button>
        <button
          type="button"
          className="buy-btn"
          onClick={() => navigate(`/market/${stock.symbol}`)}
        >
          Details
        </button>
      </div>
    </div>
  );
}

export default StockCard;