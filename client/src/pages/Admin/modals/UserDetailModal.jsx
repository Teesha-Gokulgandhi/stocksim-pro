import { useState } from "react";
import { FiX, FiPlusCircle, FiRefreshCw, FiEye } from "react-icons/fi";
import { formatINR, formatUSD, formatISTDate, formatIST, formatISTShort } from "../utils/formatters";

function UserDetailModal({
  detailUser,
  detailLoading,
  setDetailUser,
  handleAddFunds,
  handleResetAccount,
}) {
  const [modalMarketTab, setModalMarketTab] = useState("IN");

  if (!detailUser && !detailLoading) return null;

  return (
    <div className="admin-modal-overlay" onClick={() => setDetailUser(null)}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="admin-modal-close"
          onClick={() => setDetailUser(null)}
          aria-label="Close modal"
          title="Close"
        >
          <FiX />
        </button>

        {detailLoading && !detailUser ? (
          <p>Loading…</p>
        ) : (
          <>
            <div className="admin-modal-user-header">
              <div>
                <div className="modal-title-row">
                  <h2>{detailUser.user.name}</h2>
                  <span className={`role-pill ${detailUser.user.role}`}>
                    {detailUser.user.role}
                  </span>
                  <span className={`status-pill ${detailUser.user.isActive ? "active" : "suspended"}`}>
                    {detailUser.user.isActive ? "Active" : "Suspended"}
                  </span>
                </div>
                <p className="admin-subtext">{detailUser.user.email} • Joined: {formatISTDate(detailUser.user.createdAt)}</p>
              </div>

              {/* Market Switcher in Modal */}
              <div className="admin-modal-market-tabs">
                <button
                  type="button"
                  className={`modal-tab-btn ${modalMarketTab === "IN" ? "active inr" : ""}`}
                  onClick={() => setModalMarketTab("IN")}
                >
                  🇮🇳 Indian Equities (₹)
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${modalMarketTab === "US" ? "active usd" : ""}`}
                  onClick={() => setModalMarketTab("US")}
                >
                  🇺🇸 US Equities ($)
                </button>
              </div>
            </div>

            {(() => {
              const summary = detailUser.portfolioSummary || {};
              const isIN = modalMarketTab === "IN";
              const activeSum = isIN
                ? summary.inr || {
                    totalNetWorth: detailUser.user.balance || 0,
                    cash: detailUser.user.balance || 0,
                    invested: 0,
                    currentHoldings: 0,
                    overallPL: 0,
                    overallPLPercent: 0,
                  }
                : summary.usd || {
                    totalNetWorth: detailUser.user.balanceUSD ?? 0,
                    cash: detailUser.user.balanceUSD ?? 0,
                    invested: 0,
                    currentHoldings: 0,
                    overallPL: 0,
                    overallPLPercent: 0,
                  };

              const formatFn = isIN ? formatINR : formatUSD;
              const baseCapStr = isIN ? "₹1,00,000 (1 Lakh INR)" : "$10,000 (10k USD)";
              const filteredHoldings = (detailUser.holdings || []).filter((h) =>
                isIN ? h.currency === "INR" || h.symbol?.endsWith(".NS") || h.symbol?.endsWith(".BO")
                     : h.currency === "USD" || (!h.symbol?.endsWith(".NS") && !h.symbol?.endsWith(".BO"))
              );

              return (
                <>
                  {/* GROWW-STYLE TWO-COLUMN EXECUTIVE HERO CARD */}
                  <div className="admin-groww-hero">
                    {/* Left Side: Portfolio Net Worth & Overall Returns */}
                    <div className="admin-groww-left">
                      <span className="admin-groww-label">
                        {isIN ? "🇮🇳 INDIAN PORTFOLIO NET WORTH" : "🇺🇸 US PORTFOLIO NET WORTH"}
                      </span>
                      <div className="admin-groww-val-row">
                        <strong className="admin-groww-networth">
                          {formatFn(activeSum.totalNetWorth)}
                        </strong>
                        <span className={`groww-pnl-pill ${activeSum.overallPL >= 0 ? "profit" : "loss"}`}>
                          {activeSum.overallPL >= 0 ? "+" : "-"}
                          {formatFn(Math.abs(activeSum.overallPL))} (
                          {activeSum.overallPL >= 0 ? "+" : ""}
                          {activeSum.overallPLPercent.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="admin-groww-sub-metrics">
                        <span>Invested: <strong>{formatFn(activeSum.invested)}</strong></span>
                        <span>•</span>
                        <span>Holdings: <strong>{formatFn(activeSum.currentHoldings)}</strong></span>
                        <span>•</span>
                        <span>Base: {baseCapStr}</span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="admin-groww-vdivider" />

                    {/* Right Side: Available Margin & Action */}
                    <div className="admin-groww-right">
                      <span className="admin-groww-label">AVAILABLE TO INVEST (MARGIN)</span>
                      <strong className="admin-groww-margin">
                        {formatFn(activeSum.cash)}
                      </strong>
                      <div className="admin-groww-actions">
                        <button type="button" className="admin-add-funds-btn" onClick={() => { handleAddFunds(detailUser.user); }}>
                          <FiPlusCircle /> Add Funds
                        </button>
                        <button type="button" className="admin-reset-margin-btn" onClick={() => { handleResetAccount(detailUser.user); }} title="Reset account to standard initial capital (₹1L / $10k)">
                          <FiRefreshCw /> Reset Account
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ASSETS / HOLDINGS IN ACCOUNT */}
                  <div className="admin-modal-section">
                    <div className="admin-modal-sec-header">
                      <h3>Assets in Account ({filteredHoldings.length})</h3>
                      <span className="admin-subtext">Live Valuations & Cost Basis</span>
                    </div>

                    {filteredHoldings.length === 0 ? (
                      <div className="admin-empty-box">No active positions in this market.</div>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="admin-table-wrap admin-modal-table-desktop">
                          <table className="admin-modal-table">
                            <thead>
                              <tr>
                                <th>Asset / Stock</th>
                                <th className="num-col">Shares</th>
                                <th className="num-col">Avg. Cost</th>
                                <th className="num-col">Market Price</th>
                                <th className="num-col">Invested</th>
                                <th className="num-col">Current Value</th>
                                <th className="num-col">Total P&L</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredHoldings.map((h) => (
                                <tr key={h._id || h.symbol}>
                                  <td>
                                    <div className="asset-name-block">
                                      <strong>{h.symbol}</strong>
                                      <span className="asset-sub-name">{h.companyName}</span>
                                    </div>
                                  </td>
                                  <td className="num-col"><strong>{h.quantity}</strong></td>
                                  <td className="num-col">{formatFn(h.avgPrice)}</td>
                                  <td className="num-col"><strong>{formatFn(h.currentPrice)}</strong></td>
                                  <td className="num-col">{formatFn(h.investedValue)}</td>
                                  <td className="num-col"><strong>{formatFn(h.currentValue)}</strong></td>
                                  <td className="num-col">
                                    <span className={h.pnl >= 0 ? "profit-text" : "loss-text"}>
                                      {h.pnl >= 0 ? "+" : "-"}{formatFn(Math.abs(h.pnl))} ({h.pnl >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%)
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Responsive Cards */}
                        <div className="admin-modal-cards-mobile">
                          {filteredHoldings.map((h) => (
                            <div key={h._id || h.symbol} className="admin-modal-holding-card">
                              <div className="admin-mcard-header">
                                <div className="admin-mcard-title-group">
                                  <strong className="admin-mcard-symbol">{h.symbol}</strong>
                                  <span className="admin-mcard-subname">{h.companyName}</span>
                                </div>
                                <div className="admin-mcard-val-group">
                                  <strong className="admin-mcard-val">{formatFn(h.currentValue)}</strong>
                                  <span className={`admin-mcard-pnl ${h.pnl >= 0 ? "profit" : "loss"}`}>
                                    {h.pnl >= 0 ? "+" : "-"}{formatFn(Math.abs(h.pnl))} ({h.pnl >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%)
                                  </span>
                                </div>
                              </div>
                              <div className="admin-mcard-grid">
                                <div className="admin-mcard-cell">
                                  <span className="mcard-lbl">Shares</span>
                                  <strong className="mcard-val">{h.quantity}</strong>
                                </div>
                                <div className="admin-mcard-cell">
                                  <span className="mcard-lbl">Avg. Cost</span>
                                  <span className="mcard-val">{formatFn(h.avgPrice)}</span>
                                </div>
                                <div className="admin-mcard-cell">
                                  <span className="mcard-lbl">Market Price</span>
                                  <strong className="mcard-val">{formatFn(h.currentPrice)}</strong>
                                </div>
                                <div className="admin-mcard-cell">
                                  <span className="mcard-lbl">Invested</span>
                                  <span className="mcard-val">{formatFn(h.investedValue)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* RECENT USER TRANSACTIONS */}
                  <div className="admin-modal-section">
                    <div className="admin-modal-sec-header">
                      <h3>Recent Execution History</h3>
                    </div>
                    {detailUser.recentTransactions.length === 0 ? (
                      <div className="admin-empty-box">No practice orders recorded yet.</div>
                    ) : (
                      <>
                        {/* Desktop Table View */}
                        <div className="admin-table-wrap admin-modal-table-desktop">
                          <table className="admin-modal-table">
                            <thead>
                              <tr>
                                <th>Date & Time</th>
                                <th>Symbol</th>
                                <th>Side</th>
                                <th className="num-col">Shares</th>
                                <th className="num-col">Execution Price</th>
                                <th className="num-col">Total Volume</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailUser.recentTransactions.slice(0, 10).map((t) => {
                                const isTxUS = t.currency === "USD" || (!t.symbol?.endsWith(".NS") && !t.symbol?.endsWith(".BO"));
                                const symFmt = isTxUS ? formatUSD : formatINR;
                                return (
                                  <tr key={t._id}>
                                    <td className="time-col">{formatIST(t.createdAt)}</td>
                                    <td><strong>{t.symbol}</strong></td>
                                    <td>
                                      <span className={`side-badge ${t.type.toLowerCase()}`}>
                                        {t.type}
                                      </span>
                                    </td>
                                    <td className="num-col">{t.quantity}</td>
                                    <td className="num-col">{symFmt(t.price)}</td>
                                    <td className="num-col"><strong>{symFmt(t.quantity * t.price)}</strong></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Execution Cards */}
                        <div className="admin-modal-cards-mobile">
                          {detailUser.recentTransactions.slice(0, 10).map((t) => {
                            const isTxUS = t.currency === "USD" || (!t.symbol?.endsWith(".NS") && !t.symbol?.endsWith(".BO"));
                            const symFmt = isTxUS ? formatUSD : formatINR;
                            return (
                              <div key={t._id} className={`admin-modal-tx-card ${t.type.toLowerCase()}`}>
                                <div className="admin-mtx-header">
                                  <div className="admin-mtx-symbol-row">
                                    <span className={`side-badge ${t.type.toLowerCase()}`}>
                                      {t.type}
                                    </span>
                                    <strong className="admin-mtx-symbol">{t.symbol}</strong>
                                  </div>
                                  <strong className="admin-mtx-total">{symFmt(t.quantity * t.price)}</strong>
                                </div>
                                <div className="admin-mtx-footer">
                                  <span className="admin-mtx-meta">
                                    {t.quantity} {t.quantity === 1 ? "share" : "shares"} @ {symFmt(t.price)}
                                  </span>
                                  <span className="admin-mtx-time">{formatISTShort(t.createdAt)} IST</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

export default UserDetailModal;
