import { useEffect, useMemo, useState, useCallback } from "react";
import { FiSearch, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import API from "../../services/api";
import { useMarket } from "../../context/MarketContext";
import PageLoader from "../../components/common/PageLoader";
import ExportDropdown from "../../components/common/ExportDropdown";
import "./Transactions.css";

function Transactions() {
  const { selectedMarket } = useMarket();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [marketFilter, setMarketFilter] = useState(selectedMarket || "IN");

  const fetchTransactions = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const res = await API.get("/user/transactions", {
        params: { page, limit: 25 },
      });
      setTransactions(res.data.transactions || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [fetchTransactions, currentPage]);

  // Reactive listener so trades immediately appear in Transactions table
  useEffect(() => {
    const handleTradeExecuted = (e) => {
      fetchTransactions(1);
      // If the trade was US and current filter is IN, switch to ALL or US so user sees their new trade
      if (e?.detail?.symbol && !e.detail.symbol.endsWith(".NS") && !e.detail.symbol.endsWith(".BO")) {
        setMarketFilter((prev) => (prev === "IN" ? "ALL" : prev));
      }
    };
    window.addEventListener("stocksim:trade-executed", handleTradeExecuted);
    return () => window.removeEventListener("stocksim:trade-executed", handleTradeExecuted);
  }, [fetchTransactions]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (!tx) return false;
      const sym = String(tx.symbol || "").toUpperCase();
      const isIndianStock = sym.endsWith(".NS") || sym.endsWith(".BO") || sym.includes(".NS");
      const isUSTx =
        tx.currency === "USD" ||
        (!isIndianStock && !sym.includes("INR") && tx.type !== "DEPOSIT" && tx.type !== "RESET");

      const matchesMarket =
        marketFilter === "ALL" || (marketFilter === "IN" ? !isUSTx : isUSTx);
      const matchesSearch = sym.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "ALL" || tx.type === typeFilter;
      return matchesMarket && matchesSearch && matchesType;
    });
  }, [transactions, search, typeFilter, marketFilter]);

  const getBadgeClass = (type) => {
    switch (type) {
      case "BUY":
        return "txn-badge buy";
      case "SELL":
        return "txn-badge sell";
      case "TAKE_PROFIT":
        return "txn-badge take-profit";
      case "STOP_LOSS":
        return "txn-badge stop-loss";
      case "CONVERT":
        return "txn-badge convert";
      case "DEPOSIT":
        return "txn-badge deposit";
      case "RESET":
        return "txn-badge reset";
      case "REPLAY":
        return "txn-badge replay";
      default:
        return "txn-badge";
    }
  };

  return (
    <div className="transactions-page">
      <div className="txn-page-header">
        <div>
          <h1>Transactions</h1>
          <p>Complete record of all orders, replay sessions, and fund movements ({pagination.total} total)</p>
        </div>

        <ExportDropdown
          data={filtered}
          filename={`${marketFilter === "US" ? "us_orders" : marketFilter === "IN" ? "indian_orders" : "all_transactions"}`}
          title={`${marketFilter === "US" ? "US Market (NYSE/Nasdaq)" : marketFilter === "IN" ? "Indian Market (NSE/BSE)" : "Global Portfolio"} Order Execution Statement`}
          currency={marketFilter === "US" ? "USD" : "INR"}
          currencySymbol={marketFilter === "US" ? "$" : "₹"}
          label={`Export ${marketFilter === "US" ? "USD" : marketFilter === "IN" ? "INR" : ""} Statement`}
        />
      </div>

      {/* Market Selector Tabs */}
      <div className="txn-market-toggle-row">
        <button
          type="button"
          className={`txn-market-btn ${marketFilter === "IN" ? "active" : ""}`}
          onClick={() => setMarketFilter("IN")}
        >
          🇮🇳 Indian Market Orders (₹)
        </button>
        <button
          type="button"
          className={`txn-market-btn ${marketFilter === "US" ? "active" : ""}`}
          onClick={() => setMarketFilter("US")}
        >
          🇺🇸 US Market Orders ($)
        </button>
        <button
          type="button"
          className={`txn-market-btn ${marketFilter === "ALL" ? "active" : ""}`}
          onClick={() => setMarketFilter("ALL")}
        >
          🌐 All Orders
        </button>
      </div>

      <div className="txn-filters">
        <div className="txn-search-wrap">
          <FiSearch className="txn-search-icon" />
          <input
            type="text"
            placeholder="Search by symbol (e.g. TCS, AAPL, RELIANCE)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="txn-type-toggle">
          {["ALL", "BUY", "SELL", "REPLAY", "DEPOSIT"].map((type) => (
            <button
              key={type}
              type="button"
              className={typeFilter === type ? "txn-type-btn active" : "txn-type-btn"}
              onClick={() => setTypeFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="txn-empty">
          <h3>No transactions found</h3>
          <p>
            {transactions.length === 0
              ? "You haven't made any trades yet."
              : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <div className="txn-table-card">
          <div className="txn-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Order Type</th>
                  <th>Shares</th>
                  <th>Execution Price</th>
                  <th>Gross Amount</th>
                  <th>Realized P&L</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const isUSD =
                    tx.currency === "USD" ||
                    (tx.symbol &&
                      !tx.symbol.endsWith(".NS") &&
                      !tx.symbol.endsWith(".BO") &&
                      tx.type !== "DEPOSIT" &&
                      tx.type !== "RESET");
                  const sym = isUSD ? "$" : "₹";
                  const formatTxMoney = (val) =>
                    (val || 0).toLocaleString(isUSD ? "en-US" : "en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });

                  return (
                    <tr key={tx._id}>
                      <td>
                        <strong className="txn-symbol">{tx.symbol}</strong>
                        {tx.currency && (
                          <span style={{ fontSize: "11px", opacity: 0.65, marginLeft: "6px" }}>
                            ({tx.currency})
                          </span>
                        )}
                      </td>
                      {(() => {
                        const isAutoExit = tx.type === "SELL" && tx.exitReason && tx.exitReason !== "MANUAL";
                        return (
                          <td>
                            <span className={getBadgeClass(isAutoExit ? tx.exitReason : tx.type)}>
                              {isAutoExit ? tx.exitReason.replace("_", " ") : tx.type}
                            </span>
                          </td>
                        );
                      })()}
                      <td>{tx.type === "REPLAY" ? `${tx.quantity} trade${tx.quantity === 1 ? "" : "s"}` : tx.quantity}</td>
                      <td>{sym}{formatTxMoney(tx.price)}</td>
                      <td>
                        {tx.type === "REPLAY"
                          ? `${sym}${formatTxMoney(Math.abs(tx.netPnl || 0))}`
                          : `${sym}${formatTxMoney(tx.price * (tx.quantity || 1))}`}
                      </td>
                      <td className={`txn-total-cell ${(tx.type === "REPLAY" || tx.type === "SELL") ? (tx.netPnl >= 0 ? "profit" : "loss") : ""}`}>
                        {(tx.type === "REPLAY" || tx.type === "SELL") ? (
                          <>
                            {tx.netPnl >= 0 ? "+" : "-"}{sym}{formatTxMoney(Math.abs(tx.netPnl || 0))}
                            {tx.type === "SELL" && (
                              <span style={{ fontSize: "11px", opacity: 0.75, display: "block" }}>
                                {(tx.returnPercent >= 0 ? "+" : "")}{(tx.returnPercent || 0).toFixed(2)}%
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="txn-pagination">
              <button
                type="button"
                className="page-nav-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <FiChevronLeft /> Previous
              </button>
              <span className="page-indicator">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="page-nav-btn"
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next <FiChevronRight />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Transactions;