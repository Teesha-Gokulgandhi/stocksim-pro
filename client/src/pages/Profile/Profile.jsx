import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiShield,
  FiBriefcase,
  FiTrendingUp,
  FiCalendar,
  FiMail,
} from "react-icons/fi";
import API from "../../services/api";
import { useUser } from "../../context/UserContext";
import PageLoader from "../../components/common/PageLoader";
import "./Profile.css";

function Profile() {
  const { user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [stocksHeld, setStocksHeld] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [portfolioRes, transactionsRes] = await Promise.all([
        API.get("/user/portfolio"),
        API.get("/user/transactions", { params: { limit: 1 } }),
      ]);

      setStocksHeld((portfolioRes.data.holdings || []).length);
      const count =
        transactionsRes.data.pagination?.total ??
        (transactionsRes.data.transactions || []).length;
      setTotalTrades(count);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading || userLoading) return <PageLoader />;
  if (!user) return <p className="profile-error">Couldn't load your profile.</p>;

  const joinedDate = new Date(user.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const inrBalance = Number(user.balance || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const usdBalance = Number(user.balanceUSD ?? 10000).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Profile</h1>
      </div>

      {/* --- Profile Identity Hero Card --- */}
      <div className="profile-hero-card">
        <div className="profile-hero-main">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar-large">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="profile-avatar-status-dot" />
          </div>

          <div className="profile-hero-details">
            <div className="profile-name-row">
              <h2>{user.name}</h2>
              <span className={`profile-role-badge ${user.role === "admin" ? "admin" : "user"}`}>
                <FiShield /> {user.role === "admin" ? "Platform Admin" : "Verified Trader"}
              </span>
            </div>

            <div className="profile-email-row">
              <FiMail className="profile-meta-icon" />
              <span>{user.email}</span>
            </div>

            <div className="profile-joined-row">
              <FiCalendar className="profile-meta-icon" />
              <span>Member since {joinedDate}</span>
            </div>
          </div>
        </div>

        {user.role === "admin" && (
          <div className="profile-hero-actions">
            <button
              type="button"
              className="profile-admin-console-btn"
              onClick={() => navigate("/admin")}
            >
              <FiShield /> Admin Console
            </button>
          </div>
        )}
      </div>

      {/* --- Trading Metrics & Capital Grid --- */}
      <div className="profile-section">
        <div className="profile-detail-grid">
          {/* INR Cash */}
          <div className="profile-detail-box">
            <div className="profile-box-top">
              <div className="profile-box-icon icon-inr">₹</div>
            </div>
            <div className="profile-box-content">
              <span className="profile-box-label">INR Margin Balance</span>
              <strong className="profile-box-val">₹{inrBalance}</strong>
            </div>
          </div>

          {/* USD Cash */}
          <div className="profile-detail-box">
            <div className="profile-box-top">
              <div className="profile-box-icon icon-usd">$</div>
            </div>
            <div className="profile-box-content">
              <span className="profile-box-label">USD Margin Balance</span>
              <strong className="profile-box-val">${usdBalance}</strong>
            </div>
          </div>

          {/* Holdings Count */}
          <div className="profile-detail-box">
            <div className="profile-box-top">
              <div className="profile-box-icon icon-holdings">
                <FiBriefcase />
              </div>
            </div>
            <div className="profile-box-content">
              <span className="profile-box-label">Active Stocks Held</span>
              <strong className="profile-box-val">{stocksHeld}</strong>
            </div>
          </div>

          {/* Total Trades */}
          <div className="profile-detail-box">
            <div className="profile-box-top">
              <div className="profile-box-icon icon-trades">
                <FiTrendingUp />
              </div>
            </div>
            <div className="profile-box-content">
              <span className="profile-box-label">Total Filled Trades</span>
              <strong className="profile-box-val">{totalTrades}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;