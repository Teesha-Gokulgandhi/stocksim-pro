import { FiBell, FiSend, FiTrash2 } from "react-icons/fi";
import { formatIST } from "../utils/formatters";

function BroadcastsTab({
  actionError,
  notifSuccess,
  notifTitle,
  setNotifTitle,
  notifMessage,
  setNotifMessage,
  notifType,
  setNotifType,
  sendingNotif,
  handleSendNotification,
  sentNotifications,
  handleDeleteNotification,
}) {
  return (
    <section className="admin-card">
      {actionError && <div className="admin-alert">{actionError}</div>}
      <h2>
        <FiBell style={{ verticalAlign: "-2px", marginRight: 8 }} />
        Broadcast Notification to Investors
      </h2>

      {notifSuccess && <div className="admin-success">{notifSuccess}</div>}

      <form className="notif-form" onSubmit={handleSendNotification}>
        <div className="notif-form-row">
          <input
            type="text"
            placeholder="Notification Title (e.g. US Market Hours Extended)"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            maxLength={150}
          />
          <select value={notifType} onChange={(e) => setNotifType(e.target.value)}>
            <option value="info">Info (Blue)</option>
            <option value="success">Success (Green)</option>
            <option value="warning">Warning (Amber)</option>
            <option value="critical">Critical (Red)</option>
          </select>
        </div>
        <textarea
          placeholder="Notification Message content..."
          value={notifMessage}
          onChange={(e) => setNotifMessage(e.target.value)}
          maxLength={1000}
          rows={3}
        />
        <button type="submit" className="notif-send-btn" disabled={sendingNotif}>
          <FiSend />
          {sendingNotif ? "Sending Broadcast..." : "Broadcast to All Users"}
        </button>
      </form>

      <div className="sent-notifs-section">
        <h3>Recent Broadcast History ({sentNotifications.length})</h3>
        {sentNotifications.length > 0 ? (
          <ul className="sent-notif-list">
            {sentNotifications.map((n) => (
              <li key={n._id}>
                <span className={`notif-badge ${n.type}`}>{n.type}</span>
                <div className="sent-notif-body">
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <span className="admin-subtext">
                    {formatIST(n.createdAt)}
                  </span>
                </div>
                <button
                  className="sent-notif-delete"
                  onClick={() => handleDeleteNotification(n)}
                  title="Delete notification"
                >
                  <FiTrash2 />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="admin-empty-box">No broadcast notifications sent yet.</div>
        )}
      </div>
    </section>
  );
}

export default BroadcastsTab;
