import { useEffect, useMemo, useState, useCallback } from "react";
import {
  FiTrendingUp,
  FiClock,
  FiPieChart,
  FiEye,
  FiFileText,
  FiArrowUpRight,
  FiArrowDownRight,
} from "react-icons/fi";

import API from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useUser } from "../../context/UserContext";
import { useMarket } from "../../context/MarketContext";

import SearchBar from "../../components/market/SearchBar";
import MarketStats from "../../components/market/MarketStats";
import FilterBar from "../../components/market/FilterBar";
import SortDropdown from "../../components/market/SortDropdown";
import StockGrid from "../../components/market/StockGrid";
import StockCard from "../../components/market/StockCard";
import HoldingRow from "../../components/portfolio/HoldingRow";
import QuickTradeModal from "../../components/trade/QuickTradeModal";
import PageLoader from "../../components/common/PageLoader";
import MarketStatusBanner from "../../components/MarketStatusBanner";
import Replay from "../Replay/Replay";
import ExportDropdown from "../../components/common/ExportDropdown";

import "./MarketHub.css";

function MarketHub() {
  const toast = useToast();
  const { user, refreshUser } = useUser();
  const { selectedMarket, marketView, setMarketView, isIN, currency, currencySymbol } = useMarket();

  const [stocks, setStocks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [tradingStock, setTradingStock] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const [stocksRes, watchlistRes, portfolioRes, txRes] = await Promise.all([
        API.get("/stocks/live", { params: { limit: 100 } }),
        API.get("/watchlist").catch(() => ({ data: { symbols: [] } })),
        API.get("/user/portfolio").catch(() => ({ data: { holdings: [] } })),
        API.get("/user/transactions", { params: { limit: 50 } }).catch(() => ({
          data: { transactions: [] },
        })),
      ]);

      setStocks(stocksRes.data.stocks || []);
      setWatchlist(watchlistRes.data?.symbols || []);
      setHoldings(portfolioRes.data?.holdings || []);
      setTransactions(txRes.data?.transactions || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Reactive listener so trades immediately update holdings, order book, and balances
  useEffect(() => {
    const handleTradeExecuted = () => {
      fetchAll();
      refreshUser();
    };
    window.addEventListener("stocksim:trade-executed", handleTradeExecuted);
    return () => window.removeEventListener("stocksim:trade-executed", handleTradeExecuted);
  }, [fetchAll, refreshUser]);

  // Auto-refresh when switching to Portfolio or Order Book tabs
  useEffect(() => {
    if (marketView === "portfolio" || marketView === "orders") {
      fetchAll();
    }
  }, [marketView, fetchAll]);

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
      toast.error("Couldn't update watchlist");
      setWatchlist((prev) =>
        isIn ? [...prev, symbol] : prev.filter((s) => s !== symbol)
      );
    }
  };

  // Filter stocks strictly by the selected market (Indian vs US)
  const marketStocks = useMemo(() => {
    return stocks.filter((stock) => {
      const isIndianStock =
        stock.country === "IN" ||
        stock.currency === "INR" ||
        stock.exchange === "NSE" ||
        stock.exchange === "BSE" ||
        stock.symbol.endsWith(".NS") ||
        stock.symbol.endsWith(".BO");

      return isIN ? isIndianStock : !isIndianStock;
    });
  }, [stocks, isIN]);

  // Apply search, sector, and sort
  const filteredStocks = useMemo(() => {
    let result = marketStocks.filter((stock) => {
      const keyword = search.toLowerCase();
      const matchesSearch =
        stock.companyName.toLowerCase().includes(keyword) ||
        stock.symbol.toLowerCase().includes(keyword);

      const matchesSector = sector === "All" || stock.sector === sector;
      return matchesSearch && matchesSector;
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
  }, [marketStocks, search, sector, sortBy]);

  // Price map for live quotes
  const priceMap = useMemo(() => {
    const map = {};
    stocks.forEach((s) => (map[s.symbol] = s));
    return map;
  }, [stocks]);

  // Market-isolated Holdings
  const marketHoldings = useMemo(() => {
    return holdings
      .filter((h) => {
        const isUSStock =
          h.currency === "USD" ||
          (h.symbol && !h.symbol.endsWith(".NS") && !h.symbol.endsWith(".BO"));
        return isIN ? !isUSStock : isUSStock;
      })
      .map((h) => {
        const live = priceMap[h.symbol];
        const isUSD = !isIN;
        const currentPrice = live?.currentPrice ?? h.avgPrice;
        const invested = h.avgPrice * h.quantity;
        const currentValue = currentPrice * h.quantity;
        const pl = currentValue - invested;
        const plPercent = invested > 0 ? (pl / invested) * 100 : 0;

        return {
          ...h,
          currency: isUSD ? "USD" : "INR",
          isUSD,
          companyName: live?.companyName || h.symbol,
          sector: live?.sector || "General",
          currentPrice,
          invested,
          currentValue,
          pl,
          plPercent,
        };
      });
  }, [holdings, priceMap, isIN]);

  // Totals for this market's holdings
  const marketTotals = useMemo(() => {
    let invested = 0;
    let currentValue = 0;
    marketHoldings.forEach((h) => {
      invested += h.invested;
      currentValue += h.currentValue;
    });
    const pl = currentValue - invested;
    const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
    return { invested, currentValue, pl, plPercent };
  }, [marketHoldings]);

  // Market-isolated Watchlist
  const marketWatchedStocks = useMemo(() => {
    return marketStocks.filter((s) => watchlist.includes(s.symbol));
  }, [marketStocks, watchlist]);

  // Market-isolated Transactions/Orders (Strict separation between Indian and US orders)
  const marketTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx || !tx.symbol) return false;
      // Filter out non-trade system events (DEPOSIT, RESET) from the stock order book
      if (tx.type === "DEPOSIT" || tx.type === "RESET") return false;

      const sym = String(tx.symbol).toUpperCase();
      const isIndianStock = sym.endsWith(".NS") || sym.endsWith(".BO") || sym.includes(".NS");
      const isUSTx = tx.currency === "USD" || (!isIndianStock && !sym.includes("INR"));

      return isIN ? isIndianStock : isUSTx;
    });
  }, [transactions, isIN]);

  const formatMargin = (val) =>
    (val || 0).toLocaleString(isIN ? "en-IN" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const availableMargin = isIN
    ? user?.balance || 100000
    : user?.balanceUSD ?? 10000;

  if (loading && stocks.length === 0) return <PageLoader />;

  return (
    <div className="market-hub-page">
      <MarketStatusBanner />

      {/* Market Desk Header */}
      <div className="market-hub-header">
        <div className="market-hub-title-group">
          <div className="market-flag-banner">
            <span className="hub-flag">{isIN ? "🇮🇳" : "🇺🇸"}</span>
            <div>
              <h1 className="hub-title">
                {isIN ? "Indian Stock Market (NSE/BSE)" : "US Stock Market (NYSE/Nasdaq)"}
              </h1>
              <span className="hub-sub">
                {isIN ? "Hours: 9:15 AM - 3:30 PM IST" : "Hours: 7:00 PM - 1:30 AM IST"} • Virtual Cash Margin
              </span>
            </div>
          </div>

          <div className="hub-margin-box">
            <span className="margin-title">Available Trading Margin</span>
            <strong className={`margin-val ${isIN ? "inr-color" : "usd-color"}`}>
              {currencySymbol}{formatMargin(availableMargin)}
            </strong>
          </div>
        </div>

        {/* 5 Core Market Views Switcher */}
        <div className="market-mode-switcher">
          <button
            type="button"
            className={`mode-tab-btn ${marketView === "live" ? "active" : ""}`}
            onClick={() => setMarketView("live")}
            title="Live Stock Screener & Order Execution"
          >
            <FiTrendingUp />
            <span className="mode-tab-title">Live Trading</span>
          </button>

          <button
            type="button"
            className={`mode-tab-btn ${marketView === "backtest" ? "active" : ""}`}
            onClick={() => setMarketView("backtest")}
            title="Historical Candlestick Backtesting"
          >
            <FiClock />
            <span className="mode-tab-title">Backtest Studio</span>
          </button>

          <button
            type="button"
            className={`mode-tab-btn ${marketView === "portfolio" ? "active" : ""}`}
            onClick={() => setMarketView("portfolio")}
            title="Holdings & Portfolio"
          >
            <FiPieChart />
            <span className="mode-tab-title">Portfolio ({marketHoldings.length})</span>
          </button>

          <button
            type="button"
            className={`mode-tab-btn ${marketView === "watchlist" ? "active" : ""}`}
            onClick={() => setMarketView("watchlist")}
            title="Watchlist"
          >
            <FiEye />
            <span className="mode-tab-title">Watchlist ({marketWatchedStocks.length})</span>
          </button>

          <button
            type="button"
            className={`mode-tab-btn ${marketView === "orders" ? "active" : ""}`}
            onClick={() => setMarketView("orders")}
            title="Order Book"
          >
            <FiFileText />
            <span className="mode-tab-title">Order Book ({marketTransactions.length})</span>
          </button>
        </div>
      </div>

      {/* View 1: Live Stock Trading (Zerodha / Wall St Screener & Execution) */}
      {marketView === "live" && (
        <div className="live-trading-view">
          <MarketStats stocks={filteredStocks} />

          <div className="live-trading-toolbar">
            <div className="search-wrap-hub">
              <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <SortDropdown value={sortBy} onChange={(e) => setSortBy(e.target.value)} />
          </div>

          <div className="sector-filter-container">
            <FilterBar stocks={marketStocks} selected={sector} onSelect={setSector} />
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
            onTradeSuccess={() => {
              fetchAll();
              refreshUser();
            }}
          />
        </div>
      )}

      {/* View 2: Candlestick Backtest Studio */}
      {marketView === "backtest" && (
        <div className="candlestick-simulator-view">
          <Replay market={selectedMarket} />
        </div>
      )}

      {/* View 3: Market Portfolio (Isolated to active market) */}
      {marketView === "portfolio" && (
        <div className="market-portfolio-view">
          <div className="desk-portfolio-summary-bar">
            <div className="port-sum-card">
              <span>Holdings Valuation</span>
              <strong>{currencySymbol}{formatMargin(marketTotals.currentValue)}</strong>
            </div>
            <div className="port-sum-card">
              <span>Invested Capital</span>
              <strong>{currencySymbol}{formatMargin(marketTotals.invested)}</strong>
            </div>
            <div className="port-sum-card">
              <span>Unrealized Net P&L</span>
              <div className={`sum-pnl ${marketTotals.pl >= 0 ? "profit" : "loss"}`}>
                {marketTotals.pl >= 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
                <span>{marketTotals.pl >= 0 ? "+" : "-"}{currencySymbol}{formatMargin(Math.abs(marketTotals.pl))}</span>
                <span className="pnl-badge">({marketTotals.pl >= 0 ? "+" : ""}{marketTotals.plPercent.toFixed(2)}%)</span>
              </div>
            </div>
          </div>

          {marketHoldings.length === 0 ? (
            <div className="market-empty-view">
              <h3>No {isIN ? "Indian" : "US"} Stock Positions Yet</h3>
              <p>Switch to Live Stock Trading to execute buy orders with your virtual margin.</p>
              <button type="button" onClick={() => setMarketView("live")}>Trade Live Stocks</button>
            </div>
          ) : (
            <div className="market-table-container">
              <table className="portfolio-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Asset / Stock</th>
                    <th style={{ textAlign: "right" }}>Shares</th>
                    <th style={{ textAlign: "right" }}>Avg Buy</th>
                    <th style={{ textAlign: "right" }}>Live Price</th>
                    <th style={{ textAlign: "right" }}>Total Value</th>
                    <th style={{ textAlign: "right" }}>Unrealized P&L</th>
                    <th style={{ textAlign: "center", width: "90px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {marketHoldings.map((h) => (
                    <HoldingRow key={h._id || h.symbol} holding={h} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 4: Market Watchlist */}
      {marketView === "watchlist" && (
        <div className="market-watchlist-view">
          {marketWatchedStocks.length === 0 ? (
            <div className="market-empty-view">
              <h3>Your {isIN ? "Indian" : "US"} Watchlist is Empty</h3>
              <p>Star any stock on the live screener to track its price here.</p>
              <button type="button" onClick={() => setMarketView("live")}>Browse Stocks</button>
            </div>
          ) : (
            <div className="market-watchlist-grid">
              {marketWatchedStocks.map((stock) => (
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
            onTradeSuccess={() => {
              fetchAll();
              refreshUser();
            }}
          />
        </div>
      )}

      {/* View 5: Market Order Book & History */}
      {marketView === "orders" && (
        <div className="market-orders-view">
          <div className="orders-top-row">
            <div>
              <h3>{isIN ? "NSE / BSE" : "NYSE / Nasdaq"} Order Execution Book</h3>
              <p>Complete record of filled orders and transactions in {currencySymbol}</p>
            </div>

            <ExportDropdown
              data={marketTransactions}
              filename={`${isIN ? "nse_bse" : "us_market"}_orders`}
              title={`${isIN ? "Indian Market (NSE/BSE)" : "US Market (NYSE/Nasdaq)"} Order Execution Statement`}
              user={user}
              currency={currency}
              currencySymbol={currencySymbol}
              label={`Export ${isIN ? "INR" : "USD"} Statement`}
              placement="top"
            />
          </div>

          {marketTransactions.length === 0 ? (
            <div className="market-empty-view">
              <h3>No {isIN ? "Indian" : "US"} Orders Yet</h3>
              <p>Your executed buy and sell trades will be logged here.</p>
            </div>
          ) : (
            <div className="market-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Shares</th>
                    <th>Execution Price</th>
                    <th>Total Value</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {marketTransactions.map((tx, idx) => (
                    <tr key={tx._id || idx}>
                      <td>
                        <strong>{tx.symbol || "—"}</strong>
                      </td>
                      <td>
                        <span className={`order-badge ${(tx.type || "BUY").toLowerCase()}`}>
                          {tx.type || "BUY"}
                        </span>
                      </td>
                      <td>{tx.quantity ?? 1}</td>
                      <td>{currencySymbol}{formatMargin(tx.price || 0)}</td>
                      <td>{currencySymbol}{formatMargin((tx.price || 0) * (tx.quantity || 1))}</td>
                      <td>
                        {tx.createdAt ? (
                          new Date(tx.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MarketHub;
