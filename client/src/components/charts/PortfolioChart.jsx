import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import API from "../../services/api";
import "./PortfolioChart.css";

const RANGE_DAYS = { "1W": 7, "1M": 30, "3M": 90, "1Y": 365 };

function PortfolioChart() {
  const [transactions, setTransactions] = useState([]);
  const [range, setRange] = useState("1M");
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await API.get("/user/transactions", { params: { limit: 100 } });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    const points = [];
    let currentBalance = 100000;

    for (let i = 0; i < sorted.length; i++) {
      const tx = sorted[i];
      const amount = tx.price * (tx.quantity || 1);

      if (tx.type === "BUY") {
        currentBalance -= amount;
      } else if (tx.type === "SELL" || tx.type === "DEPOSIT") {
        currentBalance += amount;
      } else if (tx.type === "RESET") {
        currentBalance = 100000;
      }

      points.push({
        date: new Date(tx.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        rawDate: new Date(tx.createdAt),
        balance: Math.round(currentBalance),
      });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);

    const windowed = points.filter((p) => p.rawDate >= cutoff);
    return windowed.length > 0 ? windowed : points.slice(-5);
  }, [transactions, range]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h2>Wallet Balance</h2>
          <p>Based on your trade history.</p>
        </div>

        <div className="range-toggle">
          {Object.keys(RANGE_DAYS).map((r) => (
            <button
              key={r}
              className={range === r ? "range-btn active" : "range-btn"}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="chart-skeleton" />
      ) : chartData.length === 0 ? (
        <p className="chart-empty">No trades yet — make your first trade to see this chart.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
            <YAxis
              stroke="var(--text-secondary)"
              fontSize={12}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [`₹${value.toLocaleString("en-IN")}`, "Balance"]}
              contentStyle={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                borderRadius: 10,
                color: "var(--text-primary)",
              }}
            />
            <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default PortfolioChart;