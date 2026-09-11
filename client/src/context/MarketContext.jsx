import { createContext, useContext, useState, useEffect } from "react";

const MarketContext = createContext(null);

export function MarketProvider({ children }) {
  const [selectedMarket, setSelectedMarket] = useState(() => {
    return localStorage.getItem("selectedMarket") || "IN"; // Default to Indian Market (IN)
  });

  const [marketView, setMarketView] = useState(() => {
    return localStorage.getItem("marketView") || "live"; // "live", "backtest", "portfolio", "watchlist", "orders"
  });

  useEffect(() => {
    localStorage.setItem("selectedMarket", selectedMarket);
  }, [selectedMarket]);

  useEffect(() => {
    localStorage.setItem("marketView", marketView);
  }, [marketView]);

  const isIN = selectedMarket === "IN";
  const isUS = selectedMarket === "US";

  const marketInfo = {
    selectedMarket,
    setSelectedMarket,
    marketView,
    setMarketView,
    isIN,
    isUS,
    currency: isIN ? "INR" : "USD",
    currencySymbol: isIN ? "₹" : "$",
    marketName: isIN ? "Indian Stock Market (NSE/BSE)" : "US Stock Market (NYSE/Nasdaq)",
    tradingHours: isIN ? "9:15 AM - 3:30 PM IST" : "7:00 PM - 1:30 AM IST",
    defaultMargin: isIN ? 100000 : 10000,
  };

  return (
    <MarketContext.Provider value={marketInfo}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error("useMarket must be used within a MarketProvider");
  }
  return ctx;
}
