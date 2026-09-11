import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiTrendingUp } from "react-icons/fi";

import API from "../../services/api";
import { useUser } from "../../context/UserContext";

import PriceCard from "../../components/stockDetails/PriceCard";
import StatsCard from "../../components/stockDetails/StatsCard";
import BuyCard from "../../components/stockDetails/BuyCard";
import PositionCard from "../../components/stockDetails/PositionCard";
import StockPriceChart from "../../components/charts/StockPriceChart";
import PageLoader from "../../components/common/PageLoader";
import MarketStatusBanner from "../../components/MarketStatusBanner";
import StockRealAnalytics from "../../components/stock/StockRealAnalytics";
import QuickTradeModal from "../../components/trade/QuickTradeModal";

import "./StockDetails.css";

function StockDetails() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();

  const [stock, setStock] = useState(null);
  const [holding, setHolding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isTradeOpen, setIsTradeOpen] = useState(false);

  const isUSD =
    stock?.currency === "USD" ||
    (stock?.symbol && !stock.symbol.endsWith(".NS") && !stock.symbol.endsWith(".BO"));

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (user) {
      setBalance(isUSD ? (user.balanceUSD ?? 10000) : (user.balance || 0));
    }
  }, [user, isUSD]);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      setNotFound(false);
      const response = await API.get(`/stocks/${symbol}`);
      setStock(response.data.stock);
    } catch (error) {
      console.log(error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const fetchHolding = useCallback(async () => {
    if (!symbol) return;
    try {
      const response = await API.get(`/trade/holding/${symbol}`);
      setHolding(response.data.holding || null);
    } catch {
      setHolding(null);
    }
  }, [symbol]);

  useEffect(() => {
    fetchStock();
    fetchHolding();
  }, [fetchStock, fetchHolding]);

  // Reactive listener for trade events to immediately refresh holding, balance and stats
  useEffect(() => {
    const handleTradeExecuted = () => {
      fetchStock();
      fetchHolding();
      refreshUser();
    };
    window.addEventListener("stocksim:trade-executed", handleTradeExecuted);
    return () => window.removeEventListener("stocksim:trade-executed", handleTradeExecuted);
  }, [fetchStock, fetchHolding, refreshUser]);

  if (loading) return <PageLoader />;

  if (notFound || !stock) {
    return (
      <div className="stock-not-found">
        <h2>Couldn't load this stock</h2>
        <p>It may not exist, or the market data is temporarily unavailable.</p>
        <button className="back-btn" onClick={() => navigate("/market")}>
          <FiArrowLeft /> Back to Market
        </button>
      </div>
    );
  }

  return (
    <div className="stock-details-page">
      <MarketStatusBanner market={isUSD ? "US" : "IN"} />

      <div className="stock-details-top-bar">
        <button className="back-btn" onClick={() => navigate("/market")}>
          <FiArrowLeft /> Back to Market
        </button>

        <button
          type="button"
          className="stock-trade-action-btn"
          onClick={() => setIsTradeOpen(true)}
        >
          <FiTrendingUp /> Trade {stock.symbol}
        </button>
      </div>

      <div className="details-grid">
        <PriceCard stock={stock} isUSD={isUSD} />
        <StatsCard stock={stock} isUSD={isUSD} />
      </div>

      <StockPriceChart symbol={stock.symbol} currentPrice={stock.currentPrice} isUSD={isUSD} />

      {/* Groww-style Real Performance & Fundamentals (100% Yahoo Finance Data) */}
      <StockRealAnalytics stock={stock} isUSD={isUSD} />

      {/* Direct In-Page Trade Execution Card */}
      <BuyCard
        stock={stock}
        balance={balance}
        setBalance={setBalance}
        holding={holding}
        setHolding={setHolding}
      />

      <PositionCard
        key={`pos-${stock.symbol}`}
        symbol={stock.symbol}
        currentPrice={stock.currentPrice}
        holding={holding}
        setHolding={setHolding}
        isUSD={isUSD}
      />

      {/* Institutional Trade Modal Triggered from Header */}
      <QuickTradeModal
        stock={stock}
        isOpen={isTradeOpen}
        onClose={() => setIsTradeOpen(false)}
        onTradeSuccess={() => {
          fetchStock();
          fetchHolding();
          refreshUser();
        }}
      />
    </div>
  );
}

export default StockDetails;