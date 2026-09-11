/**
 * Financial Trade Statement Exporter Utility
 * Generates institutional exports in:
 * 1. CSV (.csv) for Excel & Sheets
 * 2. PDF (.pdf) via zero-popup invisible iframe print engine
 * 3. Word Document (.doc) compatible with Microsoft Word & Google Docs
 */

export const exportToCSV = (
  transactions = [],
  { filename = "trade_statement", currency = "INR" } = {}
) => {
  if (!transactions || transactions.length === 0) return;

  const headers = [
    "Order ID",
    "Symbol",
    "Type",
    "Shares",
    `Execution Price (${currency})`,
    `Total Value (${currency})`,
    "Execution Timestamp",
  ];

  const rows = transactions.map((t) => [
    `"${t._id || "N/A"}"`,
    `"${t.symbol || "N/A"}"`,
    `"${t.type || "BUY"}"`,
    t.quantity || 1,
    Number(t.price || 0).toFixed(2),
    Number((t.price || 0) * (t.quantity || 1)).toFixed(2),
    `"${new Date(t.createdAt || Date.now()).toLocaleString("en-IN")}"`,
  ]);

  const csvContent = "\ufeff" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToWord = (
  transactions = [],
  {
    filename = "trade_statement",
    title = "Order Execution Statement",
    user = {},
    currency = "INR",
    currencySymbol = "₹",
  } = {}
) => {
  if (!transactions || transactions.length === 0) return;

  const totalVolume = transactions.reduce(
    (acc, t) => acc + (t.price || 0) * (t.quantity || 1),
    0
  );
  const dateStr = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1e293b; }
        .header-box { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { color: #0f172a; margin: 0 0 6px 0; font-size: 22px; }
        .sub { color: #64748b; font-size: 13px; margin: 0; }
        .meta-table { width: 100%; margin-bottom: 20px; font-size: 13px; }
        .meta-table td { padding: 4px 8px; }
        .meta-label { color: #64748b; font-weight: bold; width: 140px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
        .data-table th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-weight: bold; }
        .data-table td { border: 1px solid #e2e8f0; padding: 8px 10px; }
        .buy-badge { color: #059669; font-weight: bold; }
        .sell-badge { color: #e11d48; font-weight: bold; }
        .total-row { background-color: #f8fafc; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header-box">
        <h1>StockSim Pro • Institutional Financial Statement</h1>
        <p class="sub">${title} | Generated: ${dateStr}</p>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Trader Account:</td>
          <td>${user?.name || "Trader"} (${user?.email || "Virtual Account"})</td>
          <td class="meta-label">Total Executions:</td>
          <td>${transactions.length} Orders</td>
        </tr>
        <tr>
          <td class="meta-label">Settlement Base:</td>
          <td>${currency} (${currencySymbol})</td>
          <td class="meta-label">Total Traded Volume:</td>
          <td>${currencySymbol}${totalVolume.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Asset Symbol</th>
            <th>Order Type</th>
            <th>Quantity</th>
            <th>Execution Price</th>
            <th>Total Value</th>
            <th>Execution Timestamp</th>
          </tr>
        </thead>
        <tbody>
          ${transactions
            .map(
              (t, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${t.symbol || "—"}</strong></td>
              <td class="${t.type === "BUY" ? "buy-badge" : "sell-badge"}">${t.type || "BUY"}</td>
              <td>${t.quantity || 1}</td>
              <td>${currencySymbol}${Number(t.price || 0).toFixed(2)}</td>
              <td>${currencySymbol}${Number((t.price || 0) * (t.quantity || 1)).toFixed(2)}</td>
              <td>${new Date(t.createdAt || Date.now()).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}</td>
            </tr>
          `
            )
            .join("")}
          <tr class="total-row">
            <td colspan="5" style="text-align: right; padding-right: 15px;">Total Executed Value:</td>
            <td colspan="2">${currencySymbol}${totalVolume.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        StockSim Pro Virtual Market Trading Simulator • Electronic Audit Ledger • Confidential Record
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", htmlContent], {
    type: "application/msword",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${Date.now()}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = (
  transactions = [],
  {
    title = "Order Execution Statement",
    user = {},
    currency = "INR",
    currencySymbol = "₹",
  } = {}
) => {
  if (!transactions || transactions.length === 0) return;

  const totalVolume = transactions.reduce(
    (acc, t) => acc + (t.price || 0) * (t.quantity || 1),
    0
  );
  const dateStr = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - StockSim Pro</title>
      <meta charset="utf-8" />
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 15px; color: #0f172a; background: #ffffff; line-height: 1.4; }
        .statement-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
        .logo-title h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.03em; }
        .logo-title p { margin: 3px 0 0 0; font-size: 11px; color: #64748b; }
        .doc-meta { text-align: right; }
        .doc-badge { display: inline-block; background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 3px; }
        .doc-date { font-size: 11px; color: #64748b; }
        .account-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; }
        .summary-item span { display: block; font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .summary-item strong { display: block; font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
        .table-wrap { width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        thead tr { background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
        th { text-align: left; padding: 8px 10px; font-weight: 700; color: #334155; font-size: 10px; text-transform: uppercase; }
        tbody tr { border-bottom: 1px solid #f1f5f9; }
        tbody tr:nth-child(even) { background: #fafafa; }
        td { padding: 7px 10px; color: #1e293b; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
        td.sym { font-family: inherit; font-weight: 700; color: #0f172a; }
        .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .badge.buy { background: #dcfce7; color: #15803d; }
        .badge.sell { background: #ffe4e6; color: #be123c; }
        .total-footer { background: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1; }
        .statement-footer { margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="statement-header">
        <div class="logo-title">
          <h1>StockSim Pro</h1>
          <p>Institutional Trading Terminal • Electronic Trade Execution Ledger</p>
        </div>
        <div class="doc-meta">
          <div class="doc-badge">${currency} Statement</div>
          <div class="doc-date">${dateStr}</div>
        </div>
      </div>

      <div class="account-summary">
        <div class="summary-item">
          <span>Trader</span>
          <strong>${user?.name || "Trader"}</strong>
        </div>
        <div class="summary-item">
          <span>Currency</span>
          <strong>${currency} (${currencySymbol})</strong>
        </div>
        <div class="summary-item">
          <span>Total Executions</span>
          <strong>${transactions.length} Filled Orders</strong>
        </div>
        <div class="summary-item">
          <span>Total Traded Volume</span>
          <strong>${currencySymbol}${totalVolume.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</strong>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Asset</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Execution Price</th>
              <th>Total Value</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map(
                (t, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="sym">${t.symbol || "—"}</td>
                <td><span class="badge ${t.type ? t.type.toLowerCase() : "buy"}">${t.type || "BUY"}</span></td>
                <td>${t.quantity || 1}</td>
                <td>${currencySymbol}${Number(t.price || 0).toFixed(2)}</td>
                <td>${currencySymbol}${Number((t.price || 0) * (t.quantity || 1)).toFixed(2)}</td>
                <td>${new Date(t.createdAt || Date.now()).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</td>
              </tr>
            `
              )
              .join("")}
            <tr class="total-footer">
              <td colspan="5" style="text-align: right; font-family: inherit;">Consolidated Turnover:</td>
              <td colspan="2">${currencySymbol}${totalVolume.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="statement-footer">
        Generated by StockSim Pro Trading Terminal • Official paper-trading audit statement.
      </div>
    </body>
    </html>
  `;

  // Zero popup-blocker iframe print implementation
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(pdfHtml);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 250);
  } catch (err) {
    console.error("PDF Print Error:", err);
    // Fallback in case iframe print is restricted
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(pdfHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }
};
