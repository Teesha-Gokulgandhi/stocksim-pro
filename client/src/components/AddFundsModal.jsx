import { useState } from "react";
import { FiX, FiDollarSign } from "react-icons/fi";
import API from "../services/api";
import "./AddFundsModal.css";

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

function AddFundsModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Number(amount);

    if (!amount || Number.isNaN(value) || value <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    if (value > 500000) {
      setError("Maximum deposit is ₹5,00,000 at a time");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await API.post("/user/deposit", { amount: value });
      onSuccess(data.balance);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add funds");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="funds-modal-overlay" onClick={onClose}>
      <div className="funds-modal" onClick={(e) => e.stopPropagation()}>
        <button className="funds-modal-close" onClick={onClose} type="button">
          <FiX />
        </button>

        <div className="funds-modal-icon">
          <FiDollarSign />
        </div>

        <h2>Add Virtual Funds</h2>
        <p className="funds-modal-subtext">
          Top up your practice balance. This is simulated money — nothing real is charged.
        </p>

        <div className="funds-quick-grid">
          {QUICK_AMOUNTS.map((val) => (
            <button
              type="button"
              key={val}
              className={amount === String(val) ? "quick-amount active" : "quick-amount"}
              onClick={() => setAmount(String(val))}
            >
              ₹{val.toLocaleString("en-IN")}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="fund-amount">Or enter a custom amount</label>
          <input
            id="fund-amount"
            type="number"
            min="1"
            max="500000"
            step="1"
            placeholder="e.g. 25000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          {error && <div className="funds-error">{error}</div>}

          <button type="submit" className="funds-submit" disabled={loading}>
            {loading ? "Adding..." : "Add Funds"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddFundsModal;
