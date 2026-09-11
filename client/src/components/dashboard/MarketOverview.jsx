import { useNavigate } from "react-router-dom";
import "./MarketOverview.css";

function MarketOverview({ topGainer, topLoser, stocks }) {
  const navigate = useNavigate();

  if (!stocks || stocks.length === 0) {
    return (
      <div className="market-card">
        <h2>Market Overview</h2>
        <p className="market-empty">Market data unavailable right now.</p>
      </div>
    );
  }

  const rows = [
    topGainer ? { label: "Top Gainer", stock: topGainer } : null,
    topLoser ? { label: "Top Loser", stock: topLoser } : null,
  ].filter(Boolean);

  return (
    <div className="market-card">
      <h2>Market Overview</h2>

      {rows.map(({ label, stock }) => {
        const isPositive = stock.changePercent >= 0;

        return (
          <div
            className="stock"
            key={`${label}-${stock.symbol}`}
            onClick={() => navigate(`/market/${stock.symbol}`)}
            style={{ cursor: "pointer" }}
          >
            <div>
              <h3>{label}</h3>
              <p>{stock.symbol} • {stock.companyName}</p>
            </div>

            <div>
              <h3>
                ₹{stock.currentPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </h3>
              <span className={isPositive ? "green" : "red"}>
                {isPositive ? "+" : ""}
                {stock.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MarketOverview;