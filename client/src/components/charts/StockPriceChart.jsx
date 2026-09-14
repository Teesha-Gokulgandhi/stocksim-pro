import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import API from "../../services/api";
import "./StockPriceChart.css";

const TIMEFRAMES = ["1D", "1W", "1M", "1Y", "3Y", "5Y"];

function StockPriceChart({ symbol, currentPrice, isUSD: propIsUSD }) {
  const isUSD =
    propIsUSD !== undefined
      ? propIsUSD
      : symbol && !symbol.endsWith(".NS") && !symbol.endsWith(".BO");

  const currencySymbol = isUSD ? "$" : "₹";
  const [range, setRange] = useState("1M");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChart = useCallback(async (selectedRange) => {
    try {
      setLoading(true);
      const res = await API.get(`/stocks/${symbol}/history`, {
        params: { range: selectedRange },
      });
      setData(res.data.data || []);
    } catch (err) {
      console.error("Failed to load chart:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchChart(range);
  }, [fetchChart, range]);

  const { isPositive, changeAmount, changePct, minPrice, maxPrice } = useMemo(() => {
    if (!data || data.length === 0) {
      return { isPositive: true, changeAmount: 0, changePct: 0, minPrice: 0, maxPrice: 0 };
    }
    const firstPrice = data[0].price || currentPrice;
    const lastPrice = data[data.length - 1].price || currentPrice;
    const diff = lastPrice - firstPrice;
    const pct = firstPrice > 0 ? (diff / firstPrice) * 100 : 0;

    let min = Infinity;
    let max = -Infinity;
    data.forEach((p) => {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    });

    return {
      isPositive: diff >= 0,
      changeAmount: diff,
      changePct: pct,
      minPrice: min === Infinity ? currentPrice : min,
      maxPrice: max === -Infinity ? currentPrice : max,
    };
  }, [data, currentPrice]);

  const strokeColor = isPositive ? "#10B981" : "#EF4444";
  const gradientId = `chartGrad_${symbol.replace(/[^a-zA-Z0-9]/g, "")}_${isPositive ? "up" : "down"}`;

  const formatTooltipDate = useCallback(
    (item) => {
      if (!item) return "";
      const d = item.fullDate ? new Date(item.fullDate) : item.timestamp ? new Date(item.timestamp) : null;
      if (!d || Number.isNaN(d.getTime())) return item.date || "";

      const locale = isUSD ? "en-US" : "en-IN";

      if (range === "1D") {
        return d.toLocaleString(locale, {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }

      // 1W, 1M, 1Y, 3Y, 5Y: STRICTLY ONLY calendar date (e.g. 28 Aug 2026), ZERO time or am/pm
      return d.toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    },
    [isUSD, range]
  );

  return (
    <div className="stock-chart-card">
      <div className="stock-chart-header">
        <div className="stock-chart-stats">
          <div className="stock-chart-return">
            <span className={isPositive ? "return-tag positive" : "return-tag negative"}>
              {isPositive ? "▲ +" : "▼ "}{currencySymbol}{Math.abs(changeAmount).toFixed(2)} ({Math.abs(changePct).toFixed(2)}%)
            </span>
            <span className="return-label">{range} Return</span>
          </div>

          <div className="high-low-range">
            <span>L: {currencySymbol}{minPrice.toLocaleString(isUSD ? "en-US" : "en-IN", { minimumFractionDigits: 2 })}</span>
            <div className="range-track">
              <div
                className="range-fill"
                style={{
                  width:
                    maxPrice > minPrice
                      ? `${Math.max(0, Math.min(100, ((currentPrice - minPrice) / (maxPrice - minPrice)) * 100))}%`
                      : "50%",
                  backgroundColor: strokeColor,
                }}
              />
            </div>
            <span>H: {currencySymbol}{maxPrice.toLocaleString(isUSD ? "en-US" : "en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="timeframe-selector" role="group" aria-label="Chart Timeframe">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              className={range === tf ? "tf-btn active" : "tf-btn"}
              onClick={() => setRange(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="stock-chart-body">
        {loading ? (
          <div className="chart-loading-skeleton">
            <div className="skeleton-pulse" />
          </div>
        ) : data.length === 0 ? (
          <div className="chart-no-data">
            <p>Historical price data currently unavailable for {symbol}.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="var(--text-secondary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={["auto", "auto"]}
                stroke="var(--text-secondary)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${currencySymbol}${val.toFixed(0)}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="stock-chart-tooltip">
                        <p className="tooltip-date">{formatTooltipDate(item)}</p>
                        <p className="tooltip-price">{currencySymbol}{item.price?.toLocaleString(isUSD ? "en-US" : "en-IN", { minimumFractionDigits: 2 })}</p>
                        {item.volume > 0 && <p className="tooltip-volume">Vol: {(item.volume / 1000).toFixed(1)}k</p>}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default StockPriceChart;
