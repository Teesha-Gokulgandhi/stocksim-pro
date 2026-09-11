import "./PriceCard.css";

function PriceCard({ stock, isUSD: propIsUSD }) {
  const isUSD =
    propIsUSD !== undefined
      ? propIsUSD
      : stock?.currency === "USD" ||
        (stock?.symbol && !stock.symbol.endsWith(".NS") && !stock.symbol.endsWith(".BO"));

  const currencySymbol = isUSD ? "$" : "₹";
  const isPositive = stock.changePercent >= 0;
  const priceChange = stock.currentPrice - stock.previousClose;

  const formatPrice = (value) =>
    (value || 0).toLocaleString(isUSD ? "en-US" : "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="price-card">
      <div className="company-header">
        <div className="company-info">
          <div className="company-logo">
            {stock.companyName.charAt(0)}
          </div>
          <div>
            <h1>{stock.companyName}</h1>
            <p>{stock.symbol}</p>
          </div>
        </div>

        <div className="sector-badge">
          {stock.sector}
        </div>
      </div>

      <div className="price-section">
        <h2>
          {currencySymbol}{formatPrice(stock.currentPrice)}
        </h2>

        <p className={isPositive ? "gain" : "loss"}>
          {isPositive ? "▲" : "▼"}{" "}
          {currencySymbol}{Math.abs(priceChange).toFixed(2)}
          {" "}
          ({Math.abs(stock.changePercent).toFixed(2)}%)
        </p>
      </div>

      <div className="company-details">
        <div className="detail-box">
          <span>Exchange</span>
          <strong>{isUSD ? "US (NYSE / NASDAQ)" : "NSE (India)"}</strong>
        </div>

        <div className="detail-box">
          <span>Sector</span>
          <strong>{stock.sector}</strong>
        </div>
      </div>
    </div>
  );
}

export default PriceCard;