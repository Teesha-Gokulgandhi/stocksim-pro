import { FiClock, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { formatIST, formatISTShort, formatAuditDetails } from "../utils/formatters";

function AuditTrailTab({
  auditLogs,
  auditPage,
  setAuditPage,
  auditPagination,
}) {
  return (
    <section className="admin-card">
      <div className="admin-card-top">
        <div>
          <h2>
            <FiClock style={{ verticalAlign: "-2px", marginRight: 8 }} />
            Admin Audit Trail
          </h2>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="admin-table-wrap admin-audit-table-desktop">
        <table className="admin-table admin-audit-table">
          <thead>
            <tr>
              <th style={{ minWidth: 200 }}>When (IST)</th>
              <th style={{ minWidth: 180 }}>Admin Actor</th>
              <th style={{ minWidth: 160 }}>Action</th>
              <th style={{ minWidth: 180 }}>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log._id}>
                <td className="audit-when-col">{formatIST(log.createdAt)}</td>
                <td className="audit-actor-col">{log.actorEmail || "System Admin"}</td>
                <td className="audit-action-col">
                  <span className="audit-action-tag">{log.action.replaceAll("_", " ")}</span>
                </td>
                <td className="audit-target-col">
                  <strong>
                    {log.targetLabel ||
                      ({
                        MARKET: "Global Market",
                        MARKET_IN: "Indian Market (NSE/BSE)",
                        MARKET_US: "US Market (NYSE/Nasdaq)",
                      }[log.targetType] || "—")}
                  </strong>
                </td>
                <td className="audit-details-col">{formatAuditDetails(log.details)}</td>
              </tr>
            ))}
            {auditLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No admin actions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Audit Cards */}
      <div className="admin-audit-cards-mobile">
        {auditLogs.map((log) => {
          const actionName = (log.action || "").toUpperCase();
          let actionClass = "default";
          if (actionName.includes("DELETE") || actionName.includes("HALT")) {
            actionClass = "danger";
          } else if (actionName.includes("CREATE") || actionName.includes("RESUME") || actionName.includes("OPEN")) {
            actionClass = "success";
          } else if (actionName.includes("RESET") || actionName.includes("STATUS") || actionName.includes("ROLE")) {
            actionClass = "warning";
          }

          const targetText =
            log.targetLabel ||
            ({
              MARKET: "Global Market",
              MARKET_IN: "Indian Market (NSE/BSE)",
              MARKET_US: "US Market (NYSE/Nasdaq)",
            }[log.targetType] || "—");

          return (
            <div key={log._id} className="admin-audit-card">
              <div className="admin-audit-card-top">
                <span className={`audit-action-tag ${actionClass}`}>
                  {log.action?.replaceAll("_", " ")}
                </span>
                <span className="admin-audit-time">
                  <FiClock size={12} />
                  {formatISTShort(log.createdAt)} IST
                </span>
              </div>

              <div className="admin-audit-card-body">
                <div className="admin-audit-row">
                  <span className="audit-meta-lbl">Target:</span>
                  <strong className="admin-audit-target">{targetText}</strong>
                </div>
                <div className="admin-audit-row">
                  <span className="audit-meta-lbl">Admin:</span>
                  <span className="admin-audit-actor">{log.actorEmail || "System Admin"}</span>
                </div>
              </div>

              {log.details && (
                <div className="admin-audit-details-strip">
                  <p>{formatAuditDetails(log.details)}</p>
                </div>
              )}
            </div>
          );
        })}
        {auditLogs.length === 0 && (
          <div className="admin-empty-box">
            No admin actions recorded yet.
          </div>
        )}
      </div>

      {auditPagination && auditPagination.totalPages > 1 && (
        <div className="admin-pagination">
          <button type="button" className="pagination-btn" disabled={auditPage <= 1} onClick={() => setAuditPage((p) => Math.max(1, p - 1))}>
            <FiChevronLeft /> Previous
          </button>
          <span className="pagination-text">
            Page <strong>{auditPagination.page}</strong> of <strong>{auditPagination.totalPages}</strong>
          </span>
          <button type="button" className="pagination-btn" disabled={auditPage >= auditPagination.totalPages} onClick={() => setAuditPage((p) => p + 1)}>
            Next <FiChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}

export default AuditTrailTab;
