import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useMarket } from "../../context/MarketContext";
import StockCard from "../../components/market/StockCard";
import QuickTradeModal from "../../components/trade/QuickTradeModal";
import PageLoader from "../../components/common/PageLoader";
import "./Watchlist.css";

function Watchlist() {
  const navigate = useNavigate();
  const toast = useToast();
  const { selectedMarket } = useMarket();

  const [symbols, setSymbols] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tradingStock, setTradingStock] = useState(null);
  const [marketFilter, setMarketFilter] = useState(selectedMarket || "IN");

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const [watchlistRes, stocksRes] = await Promise.all([
        API.get("/watchlist"),
        API.get("/stocks/live", { params: { limit: 100 } }),
      ]);

      setSymbols(watchlistRes.data.symbols || []);
      setStocks(stocksRes.data.stocks || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleWatchlist = async (symbol) => {
    setSymbols((prev) => prev.filter((s) => s !== symbol));

    try {
      await API.delete(`/watchlist/${symbol}`);
      toast.info(`Removed ${symbol} from watchlist`);
    } catch (error) {
      console.log(error);
      setSymbols((prev) => [...prev, symbol]);
      toast.error("Failed to remove from watchlist");
    }
  };

  const watchedStocks = useMemo(() => {
    return stocks
      .filter((s) => symbols.includes(s.symbol))
      .filter((s) => {
        const isUS =
          s.currency === "USD" ||
          s.country === "US" ||
          (!s.symbol.endsWith(".NS") && !s.symbol.endsWith(".BO"));
        return marketFilter === "ALL" ? true : marketFilter === "IN" ? !isUS : isUS;
      });
  }, [stocks, symbols, marketFilter]);

  if (loading) return <PageLoader />;

  return (
    <div className="watchlist-page">
      <div className="watchlist-header">
        <div>
          <h1>Watchlist</h1>
          <p>Stocks you're keeping an eye on.</p>
        </div>

        <div className="watchlist-market-toggle-row">
          <button
            type="button"
            className={`watchlist-market-btn ${marketFilter === "IN" ? "active" : ""}`}
            onClick={() => setMarketFilter("IN")}
          >
            🇮🇳 Indian Watchlist (₹)
          </button>
          <button
            type="button"
            className={`watchlist-market-btn ${marketFilter === "US" ? "active" : ""}`}
            onClick={() => setMarketFilter("US")}
          >
            🇺🇸 US Watchlist ($)
          </button>
          <button
            type="button"
            className={`watchlist-market-btn ${marketFilter === "ALL" ? "active" : ""}`}
            onClick={() => setMarketFilter("ALL")}
          >
            🌐 All
          </button>
        </div>
      </div>

      {watchedStocks.length === 0 ? (
        <div className="watchlist-empty">
          <h3>Your watchlist is empty</h3>
          <p>Tap the star on any stock in Market to track it here.</p>
          <button
            type="button"
            className="browse-market-btn"
            onClick={() => navigate("/market")}
          >
            Browse Market
          </button>
        </div>
      ) : (
        <div className="watchlist-grid">
          {watchedStocks.map((stock) => (
            <StockCard
              key={stock._id}
              stock={stock}
              isWatchlisted={true}
              onToggleWatchlist={toggleWatchlist}
              onQuickTrade={(stk) => setTradingStock(stk)}
            />
          ))}
        </div>
      )}

      <QuickTradeModal
        stock={tradingStock}
        isOpen={!!tradingStock}
        onClose={() => setTradingStock(null)}
        onTradeSuccess={() => fetchAll()}
      />
    </div>
  );
}

export default Watchlist;