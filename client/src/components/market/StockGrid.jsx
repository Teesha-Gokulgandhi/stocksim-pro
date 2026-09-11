import { FiInbox } from "react-icons/fi";
import StockCard from "./StockCard";
import "./StockGrid.css";

function StockGrid({ stocks, watchlist, onToggleWatchlist, onQuickTrade }) {
  if (stocks.length === 0) {
    return (
      <div className="stock-grid-empty">
        <FiInbox />
        <h3>No stocks match your filters</h3>
        <p>Try a different search term or sector.</p>
      </div>
    );
  }

  return (
    <div className="stock-grid">
      {stocks.map((stock) => (
        <StockCard
          key={stock._id}
          stock={stock}
          isWatchlisted={watchlist?.includes(stock.symbol)}
          onToggleWatchlist={onToggleWatchlist}
          onQuickTrade={onQuickTrade}
        />
      ))}
    </div>
  );
}

export default StockGrid;