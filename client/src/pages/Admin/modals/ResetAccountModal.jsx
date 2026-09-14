import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

function ResetAccountModal({
  resetModalUser,
  setResetModalUser,
  processingUserId,
  confirmResetAccount,
}) {
  if (!resetModalUser) return null;

  return (
    <div className="admin-modal-overlay" onClick={() => setResetModalUser(null)}>
      <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-confirm-header">
          <div className="admin-confirm-icon-wrap warning">
            <FiAlertTriangle size={22} />
          </div>
          <div>
            <h3>Reset Trading Account</h3>
            <p className="admin-subtext">Restore standard initial capital and reset portfolio metrics</p>
          </div>
        </div>

        <div className="admin-confirm-body">
          <div className="admin-confirm-user-badge">
            <strong>{resetModalUser.name || "Investor"}</strong>
            <span>{resetModalUser.email}</span>
          </div>

          <p className="admin-confirm-desc">
            This action restores this account back to default simulated trading parameters:
          </p>

          <ul className="admin-confirm-list">
            <li>
              <FiCheckCircle className="check-icon" />
              <span><strong>Starting Capital:</strong> Restored to <strong>₹1,00,000 INR</strong> & <strong>$10,000 USD</strong></span>
            </li>
            <li>
              <FiCheckCircle className="check-icon" />
              <span><strong>Holdings:</strong> All active stock positions will be cleared (invested becomes ₹0)</span>
            </li>
            <li>
              <FiCheckCircle className="check-icon" />
              <span><strong>Trade History:</strong> Execution transactions and open orders will be cleared</span>
            </li>
            <li>
              <FiCheckCircle className="check-icon" />
              <span><strong>Competition Stats:</strong> Overall P&L and ROI reset to <strong>0.00%</strong></span>
            </li>
          </ul>
        </div>

        <div className="admin-confirm-actions">
          <button
            type="button"
            className="admin-cancel-btn"
            onClick={() => setResetModalUser(null)}
            disabled={processingUserId === resetModalUser._id}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-danger-btn"
            onClick={confirmResetAccount}
            disabled={processingUserId === resetModalUser._id}
          >
            {processingUserId === resetModalUser._id ? "Resetting..." : "Confirm Account Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetAccountModal;
