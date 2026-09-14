import {
  FiUsers,
  FiSearch,
  FiEye,
  FiPlusCircle,
  FiRefreshCw,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { formatINR, formatUSD, formatISTDate } from "../utils/formatters";

function InvestorsTab({
  users,
  userPage,
  setUserPage,
  userPagination,
  search,
  setSearch,
  stats,
  actionError,
  processingUserId,
  handleSearchSubmit,
  openUserDetail,
  handleAddFunds,
  handleResetAccount,
  toggleUserRole,
  toggleUserStatus,
  handleDeleteUser,
}) {
  return (
    <section className="admin-card">
      {actionError && <div className="admin-alert">{actionError}</div>}
      <div className="admin-card-top">
        <div>
          <div className="section-title-row">
            <h2>Investor Accounts Directory</h2>
            <span className="directory-page-pill">
              Showing {users.length} of {userPagination?.total ?? stats?.totalUsers ?? users.length} investors (Page {userPage} of {userPagination?.totalPages || 1})
            </span>
          </div>
          <p className="admin-subtext">
            Manage accounts, inspect portfolios, adjust margin allowances, and administer roles.
          </p>
        </div>

        <form className="admin-search" onSubmit={handleSearchSubmit}>
          <FiSearch />
          <input
            type="text"
            placeholder="Search investor by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      <div className="admin-table-wrap admin-users-table-desktop">
        <table className="admin-table admin-users-table">
          <thead>
            <tr>
              <th>Investor Account</th>
              <th>Total Portfolio (₹1L / $10k)</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th className="admin-actions-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td className="user-acc-cell">
                  <strong className="user-name-text" title={u.name}>{u.name}</strong>
                  <div className="user-email-cell" title={u.email}>{u.email}</div>
                </td>
                <td>
                  <div className="user-portfolio-cell">
                    <div className="port-stat-row">
                      <span className="cur-tag inr">IN</span>
                      <span className="port-val">{formatINR(u.portfolioStats?.inr?.netWorth || u.balance || 100000)}</span>
                      <span className={`roi-tag ${(u.portfolioStats?.inr?.roi ?? 0) >= 0 ? "profit" : "loss"}`}>
                        {(u.portfolioStats?.inr?.roi ?? 0) >= 0 ? "+" : ""}{(u.portfolioStats?.inr?.roi ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="port-stat-row">
                      <span className="cur-tag usd">US</span>
                      <span className="port-val">{formatUSD(u.portfolioStats?.usd?.netWorth || (u.balanceUSD ?? 10000))}</span>
                      <span className={`roi-tag ${(u.portfolioStats?.usd?.roi ?? 0) >= 0 ? "profit" : "loss"}`}>
                        {(u.portfolioStats?.usd?.roi ?? 0) >= 0 ? "+" : ""}{(u.portfolioStats?.usd?.roi ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-pill ${u.role}`}>{u.role}</span>
                </td>
                <td>
                  <span className={`status-pill ${u.isActive ? "active" : "suspended"}`}>
                    {u.isActive ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="user-date-cell">{formatISTDate(u.createdAt)}</td>
                <td className="admin-actions-td">
                  <div className="admin-actions-wrap">
                    <button type="button" className="action-btn view" onClick={() => openUserDetail(u)} disabled={processingUserId === u._id} title="View Full Portfolio & Transactions">
                      <FiEye /> View
                    </button>
                    <button type="button" className="action-btn add-funds" onClick={() => handleAddFunds(u)} disabled={processingUserId === u._id} title="Add Virtual Funds to Margin">
                      <FiPlusCircle /> +Funds
                    </button>
                    <button type="button" className="action-btn reset-atoz" onClick={() => handleResetAccount(u)} disabled={processingUserId === u._id} title="Reset Account to Starting Defaults">
                      <FiRefreshCw /> Reset
                    </button>
                    <button type="button" className={`action-btn role ${u.role === "admin" ? "demote" : "promote"}`} onClick={() => toggleUserRole(u)} disabled={processingUserId === u._id} title={u.role === "admin" ? "Demote from Admin" : "Grant Admin Privileges"}>
                      <FiShield /> {processingUserId === u._id ? "..." : (u.role === "admin" ? "Demote" : "Admin")}
                    </button>
                    <button type="button" className={`action-btn icon-only ${u.isActive ? "suspend" : "reactivate"}`} onClick={() => toggleUserStatus(u)} disabled={processingUserId === u._id} title={u.isActive ? "Suspend Access" : "Reactivate Access"}>
                      {u.isActive ? <FiAlertTriangle /> : <FiCheckCircle />}
                    </button>
                    {u.email !== "admin@stocksim.com" && (
                      <button type="button" className="action-btn delete icon-only" onClick={() => handleDeleteUser(u)} disabled={processingUserId === u._id} title="Delete User Permanently">
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dedicated Native Cards for Phone Viewports */}
      <div className="admin-users-cards-mobile">
        {users.map((u) => (
          <div key={u._id} className="admin-user-card">
            <div className="admin-user-card-header">
              <div className="admin-user-card-identity">
                <div className="admin-user-avatar-mini">
                  {u.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="admin-user-name-col">
                  <strong className="admin-user-card-name" title={u.name}>{u.name}</strong>
                  <span className="admin-user-card-email" title={u.email}>{u.email}</span>
                </div>
              </div>
              <div className="admin-user-card-badges">
                <span className={`role-pill ${u.role}`}>{u.role}</span>
                <span className={`status-pill ${u.isActive ? "active" : "suspended"}`}>
                  {u.isActive ? "Active" : "Suspended"}
                </span>
              </div>
            </div>

            <div className="admin-user-card-portfolios">
              <div className="admin-user-port-box">
                <div className="admin-user-port-lbl">
                  <span className="cur-tag inr">IN</span>
                  <span>INR Net Worth</span>
                </div>
                <div className="admin-user-port-val-row">
                  <strong>{formatINR(u.portfolioStats?.inr?.netWorth || u.balance || 100000)}</strong>
                  <span className={`roi-tag ${(u.portfolioStats?.inr?.roi ?? 0) >= 0 ? "profit" : "loss"}`}>
                    {(u.portfolioStats?.inr?.roi ?? 0) >= 0 ? "+" : ""}{(u.portfolioStats?.inr?.roi ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="admin-user-port-box">
                <div className="admin-user-port-lbl">
                  <span className="cur-tag usd">US</span>
                  <span>USD Net Worth</span>
                </div>
                <div className="admin-user-port-val-row">
                  <strong>{formatUSD(u.portfolioStats?.usd?.netWorth || (u.balanceUSD ?? 10000))}</strong>
                  <span className={`roi-tag ${(u.portfolioStats?.usd?.roi ?? 0) >= 0 ? "profit" : "loss"}`}>
                    {(u.portfolioStats?.usd?.roi ?? 0) >= 0 ? "+" : ""}{(u.portfolioStats?.usd?.roi ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-user-card-meta">
              <span>Joined: {formatISTDate(u.createdAt)}</span>
            </div>

            <div className="admin-user-card-actions">
              <button type="button" className="admin-user-primary-action-btn" onClick={() => openUserDetail(u)} disabled={processingUserId === u._id}>
                <FiEye /> Inspect User Portfolio & Activity
              </button>

              <div className="admin-user-secondary-actions-row">
                <button type="button" className="action-btn add-funds" onClick={() => handleAddFunds(u)} disabled={processingUserId === u._id} title="Add Virtual Funds to Margin">
                  <FiPlusCircle /> +Funds
                </button>
                <button type="button" className="action-btn reset-atoz" onClick={() => handleResetAccount(u)} disabled={processingUserId === u._id} title="Reset Account to Starting Defaults">
                  <FiRefreshCw /> Reset
                </button>
                <button type="button" className={`action-btn role ${u.role === "admin" ? "demote" : "promote"}`} onClick={() => toggleUserRole(u)} disabled={processingUserId === u._id} title={u.role === "admin" ? "Demote from Admin" : "Grant Admin Privileges"}>
                  <FiShield /> {processingUserId === u._id ? "..." : (u.role === "admin" ? "Demote" : "Admin")}
                </button>
                <button type="button" className={`action-btn icon-only ${u.isActive ? "suspend" : "reactivate"}`} onClick={() => toggleUserStatus(u)} disabled={processingUserId === u._id} title={u.isActive ? "Suspend Access" : "Reactivate Access"}>
                  {u.isActive ? <FiAlertTriangle /> : <FiCheckCircle />}
                </button>
                {u.email !== "admin@stocksim.com" && (
                  <button type="button" className="action-btn delete icon-only" onClick={() => handleDeleteUser(u)} disabled={processingUserId === u._id} title="Delete User Permanently">
                    <FiTrash2 />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="admin-empty">No users found.</div>
        )}
      </div>

      {userPagination && userPagination.totalPages > 1 && (
        <div className="admin-pagination">
          <button type="button" className="pagination-btn" disabled={userPage <= 1} onClick={() => setUserPage((p) => Math.max(1, p - 1))}>
            <FiChevronLeft /> Previous
          </button>
          <span className="pagination-text">
            Page <strong>{userPagination.page}</strong> of <strong>{userPagination.totalPages}</strong>
          </span>
          <button type="button" className="pagination-btn" disabled={userPage >= userPagination.totalPages} onClick={() => setUserPage((p) => p + 1)}>
            Next <FiChevronRight />
          </button>
        </div>
      )}

      {stats?.mostTradedSymbols?.length > 0 && (
        <div className="admin-card-footer-strip">
          <span className="footer-strip-label">🔥 Most Traded Across Platform:</span>
          <div className="most-traded-list">
            {stats.mostTradedSymbols.map((s) => (
              <span key={s.symbol} className="most-traded-pill">
                {s.symbol} <strong>{s.trades} trades</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default InvestorsTab;
