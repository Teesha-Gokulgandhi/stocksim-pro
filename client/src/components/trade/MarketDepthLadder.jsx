import { useState, useEffect, useMemo } from "react";
import { FiLayers, FiActivity } from "react-icons/fi";
import "./MarketDepthLadder.css";

export default function MarketDepthLadder({
  currentPrice = 100,
  currencySymbol = "₹",
}) {
  const [activeTab, setActiveTab] = useState("depth"); // 'depth' | 'tape'
  const [tickPrints, setTickPrints] = useState([]);

  const basePrice = Number(currentPrice) || 100;
  const tickSize = basePrice > 1000 ? 0.5 : basePrice > 100 ? 0.1 : 0.01;

  // Generate realistic Level 2 Ladder around basePrice
  const { bids, asks, spread, maxVolume } = useMemo(() => {
    const rawBids = [
      { price: basePrice - tickSize * 1, size: Math.floor(basePrice * 2.3) % 450 + 80, orders: 4 },
      { price: basePrice - tickSize * 2, size: Math.floor(basePrice * 3.1) % 620 + 120, orders: 7 },
      { price: basePrice - tickSize * 3, size: Math.floor(basePrice * 1.8) % 780 + 190, orders: 11 },
      { price: basePrice - tickSize * 4, size: Math.floor(basePrice * 4.2) % 950 + 260, orders: 16 },
      { price: basePrice - tickSize * 5, size: Math.floor(basePrice * 2.7) % 1100 + 340, orders: 22 },
    ];

    const rawAsks = [
      { price: basePrice + tickSize * 1, size: Math.floor(basePrice * 2.1) % 420 + 90, orders: 5 },
      { price: basePrice + tickSize * 2, size: Math.floor(basePrice * 3.4) % 590 + 140, orders: 8 },
      { price: basePrice + tickSize * 3, size: Math.floor(basePrice * 1.5) % 720 + 210, orders: 12 },
      { price: basePrice + tickSize * 4, size: Math.floor(basePrice * 4.0) % 890 + 280, orders: 18 },
      { price: basePrice + tickSize * 5, size: Math.floor(basePrice * 2.9) % 1050 + 360, orders: 25 },
    ];

    const allSizes = [...rawBids, ...rawAsks].map((x) => x.size);
    const max = Math.max(...allSizes, 500);
    const spreadVal = (rawAsks[0].price - rawBids[0].price).toFixed(2);

    return { bids: rawBids, asks: rawAsks, spread: spreadVal, maxVolume: max };
  }, [basePrice, tickSize]);

  // Simulate streaming Time & Sales tick tape
  useEffect(() => {
    // Initial tape
    const initialTape = Array.from({ length: 6 }).map((_, i) => {
      const isBuy = i % 2 === 0;
      const offset = (Math.random() * 0.4 - 0.2) * tickSize;
      const d = new Date(Date.now() - (6 - i) * 3000);
      return {
        id: i,
        time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        price: (basePrice + offset).toFixed(2),
        size: Math.floor(Math.random() * 85) + 5,
        type: isBuy ? "BUY" : "SELL",
      };
    });
    setTickPrints(initialTape);

    const interval = setInterval(() => {
      const isBuy = Math.random() > 0.48;
      const offset = (Math.random() * 0.4 - 0.2) * tickSize;
      const newPrint = {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        price: (basePrice + offset).toFixed(2),
        size: Math.floor(Math.random() * 95) + 5,
        type: isBuy ? "BUY" : "SELL",
      };

      setTickPrints((prev) => [newPrint, ...prev.slice(0, 9)]);
    }, 2800);

    return () => clearInterval(interval);
  }, [basePrice, tickSize]);

  return (
    <div className="market-depth-container">
      <div className="depth-header-tabs">
        <button
          type="button"
          className={`depth-tab-btn ${activeTab === "depth" ? "active" : ""}`}
          onClick={() => setActiveTab("depth")}
        >
          <FiLayers /> Level 2 Depth
        </button>
        <button
          type="button"
          className={`depth-tab-btn ${activeTab === "tape" ? "active" : ""}`}
          onClick={() => setActiveTab("tape")}
        >
          <FiActivity /> Time & Sales Tape
        </button>
        <span className="depth-spread-badge">
          Spread: {currencySymbol}{spread}
        </span>
      </div>

      {activeTab === "depth" ? (
        <div className="depth-ladder-grid">
          {/* Bids Column (Green / Buyers) */}
          <div className="depth-column bids">
            <div className="depth-col-head">
              <span>Orders</span>
              <span>Qty</span>
              <span>Bid Price</span>
            </div>
            {bids.map((b, idx) => {
              const widthPct = Math.min(100, Math.round((b.size / maxVolume) * 100));
              return (
                <div key={idx} className="depth-row bid-row">
                  <div className="depth-bar bid-bar" style={{ width: `${widthPct}%` }} />
                  <span className="depth-orders">{b.orders}</span>
                  <span className="depth-qty">{b.size}</span>
                  <span className="depth-price bid-price">
                    {currencySymbol}{b.price.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Asks Column (Red / Sellers) */}
          <div className="depth-column asks">
            <div className="depth-col-head">
              <span>Ask Price</span>
              <span>Qty</span>
              <span>Orders</span>
            </div>
            {asks.map((a, idx) => {
              const widthPct = Math.min(100, Math.round((a.size / maxVolume) * 100));
              return (
                <div key={idx} className="depth-row ask-row">
                  <div className="depth-bar ask-bar" style={{ width: `${widthPct}%` }} />
                  <span className="depth-price ask-price">
                    {currencySymbol}{a.price.toFixed(2)}
                  </span>
                  <span className="depth-qty">{a.size}</span>
                  <span className="depth-orders">{a.orders}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Time & Sales Tape Stream */
        <div className="time-sales-stream">
          <div className="tape-head">
            <span>Time</span>
            <span>Price</span>
            <span>Shares</span>
            <span>Execution</span>
          </div>
          <div className="tape-body">
            {tickPrints.map((print) => (
              <div key={print.id} className={`tape-row ${print.type.toLowerCase()}`}>
                <span className="tape-time">{print.time}</span>
                <span className="tape-price">
                  {currencySymbol}{print.price}
                </span>
                <span className="tape-size">{print.size}</span>
                <span className={`tape-badge ${print.type.toLowerCase()}`}>
                  {print.type === "BUY" ? "🟢 AT ASK" : "🔴 AT BID"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
