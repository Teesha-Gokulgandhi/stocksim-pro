import "./StatsCard.css";

function StatsCard({ stock, isUSD: propIsUSD }) {
  const isUSD =
    propIsUSD !== undefined
      ? propIsUSD
      : stock?.currency === "USD" ||
        (stock?.symbol && !stock.symbol.endsWith(".NS") && !stock.symbol.endsWith(".BO"));

  const currencySymbol = isUSD ? "$" : "₹";

  const formatPrice = (value) =>
    (value || 0).toLocaleString(isUSD ? "en-US" : "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatMarketCap = (value) =>
    `${currencySymbol}${(value / 1000000000000).toFixed(1)}T`;

  const formatVolume = (value) =>
    `${(value / 1000000).toFixed(1)}M`;

  return (
    <div className="stats-card">
      <h2>Market Statistics</h2>

      <div className="stats-grid">
        <div className="stat-box">
          <span>Today's High</span>
          <strong>{currencySymbol}{formatPrice(stock.high)}</strong>
        </div>

        <div className="stat-box">
          <span>Today's Low</span>
          <strong>{currencySymbol}{formatPrice(stock.low)}</strong>
        </div>

        <div className="stat-box">
          <span>Open</span>
          <strong>{currencySymbol}{formatPrice(stock.open)}</strong>
        </div>

        <div className="stat-box">
          <span>Previous Close</span>
          <strong>{currencySymbol}{formatPrice(stock.previousClose)}</strong>
        </div>

        <div className="stat-box">
          <span>Volume</span>
          <strong>{formatVolume(stock.volume)}</strong>
        </div>

        <div className="stat-box">
          <span>Market Cap</span>
          <strong>{formatMarketCap(stock.marketCap)}</strong>
        </div>
      </div>
    </div>
  );
}

export default StatsCard;