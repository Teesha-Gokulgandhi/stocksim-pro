import { FiEye } from "react-icons/fi";
import { formatINR, formatUSD } from "../utils/formatters";

function TradingLeaguesTab({
  adminLeaderboard,
  adminLeagueMode,
  setAdminLeagueMode,
  users,
  openUserDetail,
}) {
  const leagueList =
    adminLeagueMode === "IN"
      ? adminLeaderboard.inrLeague
      : adminLeaderboard.usdLeague;
  const fmt = adminLeagueMode === "IN" ? formatINR : formatUSD;

  return (
    <section className="admin-card">
      <div className="admin-card-top">
        <div>
          <h2>Market Competition League</h2>
          <p className="admin-subtext">
            Live investor performance, portfolio net worth, and tournament standings.
          </p>
        </div>

        <div className="admin-league-toggle">
          <button
            type="button"
            className={`league-toggle-btn ${adminLeagueMode === "IN" ? "active" : ""}`}
            onClick={() => setAdminLeagueMode("IN")}
          >
            🇮🇳 ₹1 Lakh INR Championship
          </button>
          <button
            type="button"
            className={`league-toggle-btn ${adminLeagueMode === "US" ? "active" : ""}`}
            onClick={() => setAdminLeagueMode("US")}
          >
            🇺🇸 $10k USD Global League
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="admin-table-wrap admin-competition-table-desktop">
        <table className="admin-table admin-competition-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Investor</th>
              <th>Portfolio Net Worth</th>
              <th>Invested</th>
              <th>Cash Margin</th>
              <th>Capital Utilization</th>
              <th>Overall P&L</th>
              <th>ROI</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(!leagueList || leagueList.length === 0) ? (
              <tr>
                <td colSpan={9} className="admin-empty">
                  No competitor data available.
                </td>
              </tr>
            ) : (
              leagueList.map((item) => (
                <tr key={item.userId}>
                  <td>
                    <span
                      className={`admin-rank-badge ${
                        item.rank === 1 ? "rank-1" : item.rank === 2 ? "rank-2" : item.rank === 3 ? "rank-3" : "rank-other"
                      }`}
                    >
                      {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `#${item.rank}`}
                    </span>
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                    <div className="user-email-cell">{item.email}</div>
                  </td>
                  <td>
                    <strong style={{ fontSize: "14px", fontFamily: "var(--font-mono, monospace)" }}>
                      {fmt(item.netWorth ?? item.totalNetWorth ?? 0)}
                    </strong>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    {fmt(item.invested ?? 0)}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono, monospace)" }}>
                    {fmt(item.cash ?? 0)}
                  </td>
                  <td>
                    <div className="cap-util-bar-wrap">
                      <div className="cap-util-bar-track">
                        <div
                          className="cap-util-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, item.capitalUtilization ?? item.utilization ?? 0))}%`,
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "12px" }}>
                        {(item.capitalUtilization ?? item.utilization ?? 0).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const pnl = item.overallPL ?? item.profit ?? 0;
                      return (
                        <span
                          className={pnl >= 0 ? "profit-text" : "loss-text"}
                          style={{ fontWeight: 700, fontFamily: "var(--font-mono, monospace)" }}
                        >
                          {pnl >= 0 ? "+" : "-"}
                          {fmt(Math.abs(pnl))}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    <span
                      className={`roi-tag ${(item.roi ?? 0) >= 0 ? "profit" : "loss"}`}
                      style={{ fontSize: "12px", padding: "3px 8px" }}
                    >
                      {(item.roi ?? 0) >= 0 ? "+" : ""}
                      {(item.roi ?? 0).toFixed(2)}%
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="action-btn view"
                      onClick={() => {
                        const found = users.find((u) => u._id === item.userId);
                        if (found) openUserDetail(found);
                        else openUserDetail({ _id: item.userId, name: item.name, email: item.email });
                      }}
                    >
                      <FiEye /> Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Tournament Cards */}
      <div className="admin-competition-cards-mobile">
        {(!leagueList || leagueList.length === 0) ? (
          <div className="admin-empty-box">
            No competitor data available.
          </div>
        ) : (
          leagueList.map((item) => {
            const pnl = item.overallPL ?? item.profit ?? 0;
            const utilVal = item.capitalUtilization ?? item.utilization ?? 0;

            return (
              <div key={item.userId} className="admin-competition-card">
                <div className="admin-comp-card-header">
                  <div className="admin-comp-identity">
                    <span
                      className={`admin-rank-badge ${
                        item.rank === 1 ? "rank-1" : item.rank === 2 ? "rank-2" : item.rank === 3 ? "rank-3" : "rank-other"
                      }`}
                    >
                      {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : `#${item.rank}`}
                    </span>
                    <div className="admin-comp-user-meta">
                      <strong className="admin-comp-name">{item.name}</strong>
                      <span className="admin-comp-email">{item.email}</span>
                    </div>
                  </div>

                  <div className="admin-comp-worth-group">
                    <strong className="admin-comp-worth">
                      {fmt(item.netWorth ?? item.totalNetWorth ?? 0)}
                    </strong>
                    <span
                      className={`roi-tag ${(item.roi ?? 0) >= 0 ? "profit" : "loss"}`}
                      style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "5px" }}
                    >
                      {(item.roi ?? 0) >= 0 ? "+" : ""}
                      {(item.roi ?? 0).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="admin-comp-grid">
                  <div className="admin-comp-cell">
                    <span className="comp-cell-lbl">Invested</span>
                    <strong className="comp-cell-val">{fmt(item.invested ?? 0)}</strong>
                  </div>
                  <div className="admin-comp-cell">
                    <span className="comp-cell-lbl">Margin (Cash)</span>
                    <strong className="comp-cell-val">{fmt(item.cash ?? 0)}</strong>
                  </div>
                  <div className="admin-comp-cell">
                    <span className="comp-cell-lbl">Overall P&L</span>
                    <strong className={`comp-cell-val ${pnl >= 0 ? "profit-text" : "loss-text"}`}>
                      {pnl >= 0 ? "+" : "-"}
                      {fmt(Math.abs(pnl))}
                    </strong>
                  </div>
                  <div className="admin-comp-cell">
                    <span className="comp-cell-lbl">Capital Util.</span>
                    <div className="cap-util-bar-wrap">
                      <div className="cap-util-bar-track">
                        <div
                          className="cap-util-bar-fill"
                          style={{ width: `${Math.min(100, Math.max(0, utilVal))}%` }}
                        />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "11px" }}>
                        {utilVal.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-comp-actions">
                  <button
                    type="button"
                    className="action-btn view full-width"
                    onClick={() => {
                      const found = users.find((u) => u._id === item.userId);
                      if (found) openUserDetail(found);
                      else openUserDetail({ _id: item.userId, name: item.name, email: item.email });
                    }}
                  >
                    <FiEye /> Inspect Portfolio & Activity
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default TradingLeaguesTab;
