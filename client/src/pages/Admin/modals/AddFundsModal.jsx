import { FiPlusCircle } from "react-icons/fi";

function AddFundsModal({
  addFundsModalUser,
  setAddFundsModalUser,
  addFundsCurrency,
  setAddFundsCurrency,
  addFundsAmount,
  setAddFundsAmount,
  processingUserId,
  confirmAddFunds,
}) {
  if (!addFundsModalUser) return null;

  return (
    <div className="admin-modal-overlay" onClick={() => setAddFundsModalUser(null)}>
      <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-confirm-header">
          <div className="admin-confirm-icon-wrap success">
            <FiPlusCircle size={22} />
          </div>
          <div>
            <h3>Add Virtual Funds</h3>
            <p className="admin-subtext">Credit cash margin to investor (stocks and trade history remain untouched)</p>
          </div>
        </div>

        <div className="admin-confirm-body">
          <div className="admin-confirm-user-badge">
            <strong>{addFundsModalUser.name || "Investor"}</strong>
            <span>{addFundsModalUser.email}</span>
          </div>

          <div className="admin-modal-field">
            <label className="admin-modal-label">Select Market Currency</label>
            <div className="admin-currency-toggle">
              <button
                type="button"
                className={`curr-pill-btn ${addFundsCurrency === "INR" ? "active inr" : ""}`}
                onClick={() => setAddFundsCurrency("INR")}
              >
                🇮🇳 Indian Rupee (INR ₹)
              </button>
              <button
                type="button"
                className={`curr-pill-btn ${addFundsCurrency === "USD" ? "active usd" : ""}`}
                onClick={() => setAddFundsCurrency("USD")}
              >
                🇺🇸 US Dollar (USD $)
              </button>
            </div>
          </div>

          <div className="admin-modal-field">
            <label className="admin-modal-label">
              Amount to Credit ({addFundsCurrency === "INR" ? "₹" : "$"})
            </label>
            <input
              type="number"
              className="admin-modal-num-input"
              min="1"
              placeholder={addFundsCurrency === "INR" ? "e.g. 1000000" : "e.g. 5000"}
              value={addFundsAmount}
              onChange={(e) => setAddFundsAmount(e.target.value)}
            />
          </div>

          <div className="quick-amount-pills">
            {addFundsCurrency === "INR" ? (
              <>
                <button type="button" onClick={() => setAddFundsAmount("100000")}>+₹1 Lakh</button>
                <button type="button" onClick={() => setAddFundsAmount("500000")}>+₹5 Lakhs</button>
                <button type="button" onClick={() => setAddFundsAmount("1000000")}>+₹10 Lakhs</button>
                <button type="button" onClick={() => setAddFundsAmount("2500000")}>+₹25 Lakhs</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setAddFundsAmount("1000")}>+$1,000</button>
                <button type="button" onClick={() => setAddFundsAmount("5000")}>+$5,000</button>
                <button type="button" onClick={() => setAddFundsAmount("10000")}>+$10,000</button>
                <button type="button" onClick={() => setAddFundsAmount("25000")}>+$25,000</button>
              </>
            )}
          </div>
        </div>

        <div className="admin-confirm-actions">
          <button
            type="button"
            className="admin-cancel-btn"
            onClick={() => setAddFundsModalUser(null)}
            disabled={processingUserId === addFundsModalUser._id}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-success-btn"
            onClick={confirmAddFunds}
            disabled={processingUserId === addFundsModalUser._id}
          >
            {processingUserId === addFundsModalUser._id ? "Adding..." : "Credit Funds to Margin"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddFundsModal;
