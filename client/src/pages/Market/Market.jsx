import { useEffect, useMemo, useState, useCallback } from "react";
import API from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useMarket } from "../../context/MarketContext";

import SearchBar from "../../components/market/SearchBar";
import MarketStats from "../../components/market/MarketStats";
import FilterBar from "../../components/market/FilterBar";
import SortDropdown from "../../components/market/SortDropdown";
import StockGrid from "../../components/market/StockGrid";
import QuickTradeModal from "../../components/trade/QuickTradeModal";
import PageLoader from "../../components/common/PageLoader";
import MarketStatusBanner from "../../components/MarketStatusBanner";

import "./Market.css";

function Market() {
  const toast = useToast();
  const { selectedMarket, setSelectedMarket } = useMarket();

  const [stocks, setStocks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [tradingStock, setTradingStock] = useState(null);
  const [marketRegion, setMarketRegion] = useState(() => selectedMarket || "ALL");

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const stocksRes = await API.get("/stocks/live", { params: { limit: 100 } });
      setStocks(stocksRes.data.stocks || []);

      try {
        const watchlistRes = await API.get("/watchlist");
        setWatchlist(watchlistRes.data.symbols || []);
      } catch (watchlistError) {
        console.log("Watchlist unavailable:", watchlistError);
        setWatchlist([]);
      }
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
    const isIn = watchlist.includes(symbol);

    setWatchlist((prev) =>
      isIn ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );

    try {
      if (isIn) {
        await API.delete(`/watchlist/${symbol}`);
        toast.info(`Removed ${symbol} from watchlist`);
      } else {
        await API.post(`/watchlist/${symbol}`, {});
        toast.success(`Added ${symbol} to watchlist`);
      }
    } catch (error) {
      console.error("Watchlist toggle failed:", error);
      toast.error(error.response?.data?.message || "Couldn't update watchlist");

      setWatchlist((prev) =>
        isIn ? [...prev, symbol] : prev.filter((s) => s !== symbol)
      );
    }
  };

  const inCount = useMemo(
    () =>
      stocks.filter(
        (s) =>
          s.country === "IN" ||
          s.currency === "INR" ||
          s.exchange === "NSE" ||
          s.exchange === "BSE" ||
          s.symbol.endsWith(".NS") ||
          s.symbol.endsWith(".BO")
      ).length,
    [stocks]
  );
  const usCount = useMemo(
    () =>
      stocks.filter(
        (s) =>
          s.country === "US" ||
          s.currency === "USD" ||
          s.exchange === "NASDAQ" ||
          s.exchange === "NYSE" ||
          (!s.symbol.endsWith(".NS") && !s.symbol.endsWith(".BO"))
      ).length,
    [stocks]
  );

  const filteredStocks = useMemo(() => {
    let result = stocks.filter((stock) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        stock.companyName.toLowerCase().includes(keyword) ||
        stock.symbol.toLowerCase().includes(keyword);

      const matchesSector = sector === "All" || stock.sector === sector;

      const isIndianStock =
        stock.country === "IN" ||
        stock.currency === "INR" ||
        stock.exchange === "NSE" ||
        stock.exchange === "BSE" ||
        stock.symbol.endsWith(".NS") ||
        stock.symbol.endsWith(".BO");

      const matchesRegion =
        marketRegion === "ALL" ||
        (marketRegion === "IN" && isIndianStock) ||
        (marketRegion === "US" && !isIndianStock);

      return matchesSearch && matchesSector && matchesRegion;
    });

    switch (sortBy) {
      case "priceHigh":
        result.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "priceLow":
        result.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "gainers":
        result.sort((a, b) => b.changePercent - a.changePercent);
        break;
      case "losers":
        result.sort((a, b) => a.changePercent - b.changePercent);
        break;
      case "az":
        result.sort((a, b) => a.companyName.localeCompare(b.companyName));
        break;
      default:
        break;
    }

    return result;
  }, [stocks, search, sector, sortBy, marketRegion]);

  if (loading) return <PageLoader />;

  return (
    <div className="market-page">
      <MarketStatusBanner />
      <div className="market-header">
        <div className="market-title">
          <h1>Global Paper Markets</h1>
          <p>Practice trading live Indian (NSE) & US (NYSE/Nasdaq) stocks with virtual funds.</p>
        </div>

        <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Market Region Filter Tabs */}
      <div className="market-region-tabs">
        <button
          type="button"
          className={`region-tab ${marketRegion === "IN" ? "active inr" : ""}`}
          onClick={() => {
            setMarketRegion("IN");
            setSelectedMarket("IN");
          }}
        >
          🇮🇳 Indian Stocks ({inCount})
        </button>
        <button
          type="button"
          className={`region-tab ${marketRegion === "US" ? "active usd" : ""}`}
          onClick={() => {
            setMarketRegion("US");
            setSelectedMarket("US");
          }}
        >
          🇺🇸 US Stocks ({usCount})
        </button>
        <button
          type="button"
          className={`region-tab ${marketRegion === "ALL" ? "active" : ""}`}
          onClick={() => setMarketRegion("ALL")}
        >
          🌐 All Markets ({stocks.length})
        </button>
      </div>

      <MarketStats stocks={filteredStocks} />

      <div className="market-toolbar">
        <FilterBar stocks={stocks} selected={sector} onSelect={setSector} />
        <SortDropdown value={sortBy} onChange={(e) => setSortBy(e.target.value)} />
      </div>

      <StockGrid
        stocks={filteredStocks}
        watchlist={watchlist}
        onToggleWatchlist={toggleWatchlist}
        onQuickTrade={(stk) => setTradingStock(stk)}
      />

      <QuickTradeModal
        stock={tradingStock}
        isOpen={!!tradingStock}
        onClose={() => setTradingStock(null)}
        onTradeSuccess={() => fetchAll()}
      />
    </div>
  );
}

export default Market;