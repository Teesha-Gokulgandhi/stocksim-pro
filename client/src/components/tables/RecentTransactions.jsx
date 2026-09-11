import { useNavigate } from "react-router-dom";
import "./RecentTransactions.css";

function RecentTransactions({ transactions }) {
  const navigate = useNavigate();

  return (
    <div className="transactions-card">
      <div className="transactions-header">
        <h2>Recent Transactions</h2>
        <button className="view-all-btn" onClick={() => navigate("/transactions")}>
          View All
        </button>
      </div>

      {transactions.length === 0 ? (
        <p className="transactions-empty">
          No trades yet — head to the Market to make your first trade.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Stock</th>
              <th>Type</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((tx) => {
              const isUSD =
                tx.currency === "USD" ||
                (tx.symbol &&
                  !tx.symbol.endsWith(".NS") &&
                  !tx.symbol.endsWith(".BO") &&
                  tx.type !== "DEPOSIT" &&
                  tx.type !== "RESET");
              const sym = isUSD ? "$" : "₹";

              return (
                <tr key={tx._id}>
                  <td>
                    <strong>{tx.symbol}</strong>
                    {tx.currency && (
                      <span style={{ fontSize: "11px", opacity: 0.65, marginLeft: "6px" }}>
                        ({tx.currency})
                      </span>
                    )}
                  </td>
                  <td className={tx.type === "BUY" ? "buy" : tx.type === "SELL" ? "sell" : "convert"}>
                    {tx.type}
                  </td>
                  <td>{sym}{tx.price.toLocaleString(isUSD ? "en-US" : "en-IN", { maximumFractionDigits: 2 })}</td>
                  <td>{tx.quantity}</td>
                  <td>{new Date(tx.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RecentTransactions;