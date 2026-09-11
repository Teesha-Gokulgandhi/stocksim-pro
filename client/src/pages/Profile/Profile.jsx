import { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { useUser } from "../../context/UserContext";
import PageLoader from "../../components/common/PageLoader";
import "./Profile.css";

function Profile() {
  const { user, loading: userLoading } = useUser();
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
    month: "long",
    year: "numeric",
  });

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Profile</h1>
        <p>Your account details and trading statistics.</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-large">{user.name?.charAt(0).toUpperCase()}</div>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="profile-role-tag">{user.role === "admin" ? "Platform Admin" : "Verified Trader"}</span>
        </div>
      </div>

      <div className="profile-detail-grid">
        <div className="profile-detail-box">
          <span>Wallet Balance</span>
          <strong>
            ₹{user.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>

        <div className="profile-detail-box">
          <span>Member Since</span>
          <strong>{joinedDate}</strong>
        </div>

        <div className="profile-detail-box">
          <span>Stocks Held</span>
          <strong>{stocksHeld}</strong>
        </div>

        <div className="profile-detail-box">
          <span>Total Trades</span>
          <strong>{totalTrades}</strong>
        </div>
      </div>
    </div>
  );
}

export default Profile;