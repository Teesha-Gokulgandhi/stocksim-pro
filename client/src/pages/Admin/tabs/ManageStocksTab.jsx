import { useState } from "react";
import {
  FiSearch,
  FiX,
  FiEdit2,
  FiExternalLink,
  FiTrash2,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertTriangle,
  FiZap,
} from "react-icons/fi";
import { EXCHANGES, SECTOR_PRESETS, getFormattedSymbol } from "../constants/exchanges";
import API from "../../../services/api";

function ManageStocksTab({
  stocks,
  actionError,
  setActionError,
  fetchStocks,
  fetchOverview,
  fetchAuditLog,
}) {
  const [stockExchangeFilter, setStockExchangeFilter] = useState("ALL");
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [verifyingSymbol, setVerifyingSymbol] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [isCustomSector, setIsCustomSector] = useState(false);
  const [customSectorInput, setCustomSectorInput] = useState("");
  const [stockForm, setStockForm] = useState({
    symbol: "",
    companyName: "",
    sector: SECTOR_PRESETS[0],
    exchange: "NSE/BSE",
    country: "IN",
    currency: "INR",
    logo: "",
  });
  const [editingStockId, setEditingStockId] = useState(null);
  const [savingStock, setSavingStock] = useState(false);
  const [stockSuccess, setStockSuccess] = useState("");

  const handleSelectExchange = (exchId) => {
    const isIN = exchId === "NSE" || exchId === "BSE" || exchId === "NSE/BSE";
    setStockForm((prev) => ({
      ...prev,
      exchange: exchId,
      country: isIN ? "IN" : "US",
      currency: isIN ? "INR" : "USD",
    }));
    setVerifyResult(null);
  };

  const handleVerifySymbol = async () => {
    const rawInput = stockForm.symbol.trim();
    if (!rawInput) {
      setActionError("Enter a symbol or company name first to verify with Yahoo Finance");
      return;
    }
    setVerifyingSymbol(true);
    setVerifyResult(null);
    setActionError("");
    try {
      const lookupExchange = stockForm.exchange === "NSE/BSE" ? "NSE" : stockForm.exchange;
      const { data } = await API.get(`/admin/stocks/verify/${encodeURIComponent(rawInput)}`, {
        params: { exchange: lookupExchange },
      });
      setVerifyResult(data);
      if (data.success) {
        const bestSymbol = data.cleanSymbol || data.symbol;
        setStockForm((prev) => ({
          ...prev,
          symbol: bestSymbol,
          companyName: data.shortName || prev.companyName,
        }));
      }
    } catch (err) {
      setVerifyResult({
        success: false,
        message: err.response?.data?.message || "Failed to verify ticker on Yahoo Finance",
      });
    } finally {
      setVerifyingSymbol(false);
    }
  };

  const resetStockForm = () => {
    setStockForm({
      symbol: "",
      companyName: "",
      sector: SECTOR_PRESETS[0],
      exchange: "NSE/BSE",
      country: "IN",
      currency: "INR",
      logo: "",
    });
    setIsCustomSector(false);
    setCustomSectorInput("");
    setEditingStockId(null);
    setVerifyResult(null);
  };

  const startEditStock = (stock) => {
    setEditingStockId(stock._id);
    const isCustom = !SECTOR_PRESETS.includes(stock.sector);
    setIsCustomSector(isCustom);
    setCustomSectorInput(isCustom ? stock.sector : "");
    setStockForm({
      symbol: stock.symbol,
      companyName: stock.companyName,
      sector: isCustom ? "CUSTOM" : stock.sector,
      exchange: stock.exchange || "NSE/BSE",
      country: stock.country || (stock.exchange === "NSE" || stock.exchange === "BSE" || stock.exchange === "NSE/BSE" ? "IN" : "US"),
      currency: stock.currency || (stock.country === "IN" ? "INR" : "USD"),
      logo: stock.logo || "",
    });
    setVerifyResult(null);
    setStockSuccess("");
    setActionError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    const finalSymbol = editingStockId
      ? stockForm.symbol
      : getFormattedSymbol(stockForm.symbol, stockForm.exchange);
    const finalSector = isCustomSector ? customSectorInput.trim() : stockForm.sector;

    if (!finalSymbol || !stockForm.companyName.trim() || !finalSector) {
      setActionError("Symbol, company name, and sector are required");
      return;
    }

    setSavingStock(true);
    setActionError("");
    setStockSuccess("");
    try {
      const payload = {
        symbol: finalSymbol,
        companyName: stockForm.companyName.trim(),
        sector: finalSector,
        exchange: stockForm.exchange,
        country: stockForm.country,
        currency: stockForm.currency,
        logo: stockForm.logo.trim(),
      };

      if (editingStockId) {
        await API.put(`/admin/stocks/${editingStockId}`, payload);
        setStockSuccess(`${finalSymbol} successfully updated.`);
      } else {
        await API.post("/admin/stocks", payload);
        setStockSuccess(`${finalSymbol} successfully listed on ${stockForm.exchange}.`);
      }
      resetStockForm();
      fetchStocks();
      fetchOverview();
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to save stock");
    } finally {
      setSavingStock(false);
    }
  };

  const handleDeleteStock = async (stock) => {
    setActionError("");
    try {
      await API.delete(`/admin/stocks/${stock._id}`);
      fetchStocks();
      fetchAuditLog();
    } catch (error) {
      setActionError(error.response?.data?.message || "Failed to delete stock");
    }
  };

  const dualCount = stocks.filter((s) => s.exchange === "NSE/BSE").length;
  const nseCount = stocks.filter((s) => s.exchange === "NSE" || s.exchange === "NSE/BSE").length;
  const bseCount = stocks.filter((s) => s.exchange === "BSE" || s.exchange === "NSE/BSE").length;
  const nyseCount = stocks.filter((s) => s.exchange === "NYSE").length;
  const nasdaqCount = stocks.filter((s) => s.exchange === "NASDAQ").length;

  const filteredStocks = stocks.filter((s) => {
    if (stockExchangeFilter === "NSE") {
      if (s.exchange !== "NSE" && s.exchange !== "NSE/BSE") return false;
    } else if (stockExchangeFilter === "BSE") {
      if (s.exchange !== "BSE" && s.exchange !== "NSE/BSE") return false;
    } else if (stockExchangeFilter === "NSE/BSE") {
      if (s.exchange !== "NSE/BSE") return false;
    } else if (stockExchangeFilter !== "ALL" && s.exchange !== stockExchangeFilter) {
      return false;
    }
    if (!stockSearchQuery.trim()) return true;
    const q = stockSearchQuery.toLowerCase().trim();
    return (
      s.symbol.toLowerCase().includes(q) ||
      s.companyName.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q) ||
      (s.exchange && s.exchange.toLowerCase().includes(q))
    );
  });

  const activeExchangeConfig =
    EXCHANGES.find((e) => e.id === stockForm.exchange) || EXCHANGES[0];
  const liveFormattedPreview = getFormattedSymbol(stockForm.symbol, stockForm.exchange);

  return (
    <section className="admin-card new-stock-listing-card">
      {actionError && <div className="admin-alert">{actionError}</div>}
      {/* Header Bar */}
      <div className="listing-console-header">
        <div className="listing-title-group">
          <h2>{editingStockId ? "Edit Listed Equity" : "List New Stock on Exchange"}</h2>
        </div>

        <div className="listing-header-aside">
          <div className="live-engine-status-chip">
            <span className="pulse-dot green" />
            <div className="engine-status-text">
              <span className="engine-status-sub">Data Feed Engine</span>
              <strong>Yahoo Finance Live</strong>
            </div>
          </div>
          {editingStockId && (
            <button type="button" className="studio-cancel-edit-btn" onClick={resetStockForm}>
              Cancel Editing
            </button>
          )}
        </div>
      </div>

      {stockSuccess && <div className="admin-success">{stockSuccess}</div>}

      {/* Unified Provisioning Form */}
      <form className="listing-workbench-form" onSubmit={handleStockSubmit}>
        {/* Step 1: Market & Exchange Selection */}
        <div className="listing-step-block">
          <div className="listing-step-heading">
            <span className="step-num">01</span>
            <div>
              <h3>Select Target Market & Exchange</h3>
              <p>Choose the target jurisdiction and underlying exchange for this asset.</p>
            </div>
          </div>

          <div className="market-choice-grid">
            {/* Indian Market Choice Card */}
            <div
              className={`market-choice-card ${stockForm.country === "IN" ? "active" : ""}`}
              onClick={() => handleSelectExchange("NSE/BSE")}
            >
              <div className="market-choice-top">
                <div className="market-flag-title">
                  <span className="choice-flag">🇮🇳</span>
                  <div>
                    <strong>Indian Equities</strong>
                    <span className="choice-sub">NSE & BSE • INR (₹)</span>
                  </div>
                </div>
                {stockForm.country === "IN" && <span className="choice-active-check"><FiCheckCircle /></span>}
              </div>

              <div className="choice-exchange-pills">
                <button
                  type="button"
                  className={`exchange-sub-pill dual ${stockForm.exchange === "NSE/BSE" ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleSelectExchange("NSE/BSE"); }}
                >
                  <strong>NSE & BSE</strong>
                  <span>Dual-Listed (Both)</span>
                </button>
                <button
                  type="button"
                  className={`exchange-sub-pill ${stockForm.exchange === "NSE" ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleSelectExchange("NSE"); }}
                >
                  <strong>NSE</strong>
                  <span>National Stock Exchange (.NS)</span>
                </button>
                <button
                  type="button"
                  className={`exchange-sub-pill ${stockForm.exchange === "BSE" ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleSelectExchange("BSE"); }}
                >
                  <strong>BSE</strong>
                  <span>Bombay Stock Exchange (.BO)</span>
                </button>
              </div>
            </div>

            {/* US Market Choice Card */}
            <div
              className={`market-choice-card ${stockForm.country === "US" ? "active" : ""}`}
              onClick={() => handleSelectExchange("NASDAQ")}
            >
              <div className="market-choice-top">
                <div className="market-flag-title">
                  <span className="choice-flag">🇺🇸</span>
                  <div>
                    <strong>US Equities</strong>
                    <span className="choice-sub">NASDAQ & NYSE • USD ($)</span>
                  </div>
                </div>
                {stockForm.country === "US" && <span className="choice-active-check"><FiCheckCircle /></span>}
              </div>

              <div className="choice-exchange-pills">
                <button
                  type="button"
                  className={`exchange-sub-pill ${stockForm.exchange === "NASDAQ" ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleSelectExchange("NASDAQ"); }}
                >
                  <strong>NASDAQ</strong>
                  <span>Global Tech Market</span>
                </button>
                <button
                  type="button"
                  className={`exchange-sub-pill ${stockForm.exchange === "NYSE" ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleSelectExchange("NYSE"); }}
                >
                  <strong>NYSE</strong>
                  <span>New York Stock Exchange</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Ticker Lookup & 1-Click Yahoo Auto-Fetch */}
        <div className="listing-step-block">
          <div className="listing-step-heading">
            <span className="step-num">02</span>
            <div>
              <h3>Lookup Ticker & Auto-Fetch Live Data</h3>
              <p>Enter the company symbol. Live prices, day high/low, and company name are verified instantly.</p>
            </div>
          </div>

          <div className="ticker-lookup-workbench">
            <div className="ticker-search-field">
              <label className="field-micro-label">
                Stock Symbol or Company Name:
                <span className="field-suffix-note">
                  {stockForm.exchange === "NSE"
                    ? "Enter ticker (TATAPOWER) or name (Tata Power) • .NS auto-appended"
                    : stockForm.exchange === "BSE"
                    ? "Enter ticker or name • .BO auto-appended"
                    : "Enter ticker (SNOW, AAPL) or company name (Snowflake, Apple)"}
                </span>
              </label>
              <div className="ticker-input-row">
                <div className="ticker-input-box">
                  <FiSearch className="ticker-search-icon" />
                  <input
                    type="text"
                    className="symbol-text-input"
                    placeholder={activeExchangeConfig.placeholder}
                    value={stockForm.symbol}
                    onChange={(e) => {
                      setStockForm({ ...stockForm, symbol: e.target.value });
                      setVerifyResult(null);
                    }}
                    maxLength={40}
                    disabled={!!editingStockId}
                  />
                  {stockForm.symbol.trim() && (
                    <div className="ticker-live-pill">
                      <span>Ticker:</span>
                      <strong>{liveFormattedPreview}</strong>
                      <span className="tag-cur">{stockForm.currency}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="auto-fetch-cta-btn"
                  onClick={handleVerifySymbol}
                  disabled={verifyingSymbol || !stockForm.symbol.trim()}
                >
                  <FiRefreshCw className={verifyingSymbol ? "spin-icon" : ""} />
                  {verifyingSymbol ? "Verifying..." : "⚡ Auto-Fetch Details"}
                </button>
              </div>
            </div>

            {/* Live Verified Card Preview */}
            {verifyResult && (
              <div className={`live-quote-card ${verifyResult.success ? "success" : "error"}`}>
                {verifyResult.success ? (
                  <>
                    <div className="live-quote-top">
                      <div className="quote-status-badge">
                        <span className="pulse-dot green" />
                        <strong>Verified Live on Yahoo Finance</strong>
                      </div>
                      <span className="quote-currency-pill">{verifyResult.currency}</span>
                    </div>

                    {verifyResult.autoResolved && (
                      <div
                        className="quote-autoresolve-badge"
                        style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          padding: "8px 12px", background: "var(--accent-primary-subtle)",
                          border: "1px solid var(--accent-primary-border)", borderRadius: "8px",
                          fontSize: "0.83rem", color: "var(--accent-primary)", margin: "8px 0 12px 0",
                        }}
                      >
                        <FiCheckCircle size={16} />
                        <span>
                          Auto-matched company <strong>"{verifyResult.originalInput}"</strong> &rarr; Resolved ticker to{" "}
                          <strong>{verifyResult.cleanSymbol || verifyResult.symbol}</strong>
                        </span>
                      </div>
                    )}

                    <div className="live-quote-main">
                      <div>
                        <h4 className="quote-company-name">
                          {verifyResult.shortName || stockForm.companyName || liveFormattedPreview}
                        </h4>
                        <span className="quote-symbol-code">{verifyResult.symbol} • {stockForm.exchange}</span>
                      </div>
                      <div className="quote-price-wrap">
                        <span className="quote-live-price">
                          {verifyResult.currency === "INR" ? "₹" : "$"}{verifyResult.price?.toFixed(2)}
                        </span>
                        <span className={`quote-change ${(verifyResult.changePercent || 0) >= 0 ? "positive" : "negative"}`}>
                          {(verifyResult.changePercent || 0) >= 0 ? "+" : ""}{verifyResult.change?.toFixed(2)} (
                          {(verifyResult.changePercent || 0) >= 0 ? "+" : ""}{verifyResult.changePercent?.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="live-quote-metrics-strip">
                      <div className="metric-chip">
                        <span className="metric-lbl">Day High</span>
                        <strong>{verifyResult.high ? (verifyResult.currency === "INR" ? "₹" : "$") + verifyResult.high.toFixed(2) : "—"}</strong>
                      </div>
                      <div className="metric-chip">
                        <span className="metric-lbl">Day Low</span>
                        <strong>{verifyResult.low ? (verifyResult.currency === "INR" ? "₹" : "$") + verifyResult.low.toFixed(2) : "—"}</strong>
                      </div>
                      <div className="metric-chip">
                        <span className="metric-lbl">Prev Close</span>
                        <strong>{verifyResult.previousClose ? (verifyResult.currency === "INR" ? "₹" : "$") + verifyResult.previousClose.toFixed(2) : "—"}</strong>
                      </div>
                      <div className="metric-chip">
                        <span className="metric-lbl">Volume</span>
                        <strong>{verifyResult.volume ? verifyResult.volume.toLocaleString() : "—"}</strong>
                      </div>
                      <div className="metric-chip">
                        <span className="metric-lbl">Market Cap</span>
                        <strong>{verifyResult.marketCap ? (verifyResult.currency === "INR" ? "₹" : "$") + (verifyResult.marketCap / 1e9).toFixed(2) + "B" : "—"}</strong>
                      </div>
                    </div>

                    {verifyResult.suggestions && verifyResult.suggestions.length > 1 && (
                      <div
                        className="quote-suggestions-strip"
                        style={{
                          display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
                          marginTop: "12px", paddingTop: "10px",
                          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", opacity: 0.75 }}>Other matches:</span>
                        {verifyResult.suggestions.slice(1).map((sug) => (
                          <button
                            key={sug.symbol}
                            type="button"
                            style={{
                              background: "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                              borderRadius: "14px", padding: "3px 10px",
                              fontSize: "0.75rem", color: "inherit", cursor: "pointer",
                            }}
                            onClick={() => {
                              setStockForm((prev) => ({
                                ...prev,
                                symbol: sug.symbol.replace(/\.(NS|BO)$/, ""),
                                companyName: sug.name,
                              }));
                            }}
                          >
                            <strong>{sug.symbol}</strong> • {sug.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="quote-ready-note">
                      ✅ Live quote verified. Company name has been auto-filled below. Click <strong>"List Stock on Trading Terminal"</strong> to make it active.
                    </p>
                  </>
                ) : (
                  <div className="quote-error-box">
                    <FiAlertTriangle className="verify-icon" />
                    <div>
                      <strong>Yahoo Finance Verification Notice:</strong>
                      <p>{verifyResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Asset Profile & Specifications */}
        <div className="listing-step-block">
          <div className="listing-step-heading">
            <span className="step-num">03</span>
            <div>
              <h3>Asset Profile & Metadata</h3>
              <p>Confirm the company name, sector classification, and optional branding asset.</p>
            </div>
          </div>

          <div className="asset-profile-grid">
            {/* Company Name */}
            <div className="profile-field-item">
              <label className="field-micro-label">Company Name:</label>
              <input
                type="text"
                className="profile-input"
                placeholder="Auto-filled from Yahoo Finance (or edit manually)"
                value={stockForm.companyName}
                onChange={(e) => setStockForm({ ...stockForm, companyName: e.target.value })}
                maxLength={150}
              />
            </div>

            {/* Industry Sector */}
            <div className="profile-field-item">
              <label className="field-micro-label">Industry Sector:</label>
              <select
                className="profile-select"
                value={isCustomSector ? "CUSTOM" : stockForm.sector}
                onChange={(e) => {
                  if (e.target.value === "CUSTOM") {
                    setIsCustomSector(true);
                  } else {
                    setIsCustomSector(false);
                    setStockForm({ ...stockForm, sector: e.target.value });
                  }
                }}
              >
                {SECTOR_PRESETS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
                <option value="CUSTOM">➕ Custom Industry Sector...</option>
              </select>

              {isCustomSector && (
                <input
                  type="text"
                  className="profile-input custom-sector-input"
                  placeholder="Enter custom sector (e.g. Clean Energy, Fintech)"
                  value={customSectorInput}
                  onChange={(e) => setCustomSectorInput(e.target.value)}
                  maxLength={80}
                />
              )}
            </div>

            {/* Logo URL */}
            <div className="profile-field-item">
              <label className="field-micro-label">Logo URL (Optional):</label>
              <input
                type="text"
                className="profile-input"
                placeholder="https://example.com/logo.png"
                value={stockForm.logo}
                onChange={(e) => setStockForm({ ...stockForm, logo: e.target.value })}
                maxLength={500}
              />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="listing-actions-bar">
          <div className="actions-left">
            <button type="submit" className="primary-list-stock-btn" disabled={savingStock}>
              {editingStockId ? <FiEdit2 /> : <FiZap />}
              {savingStock ? "Listing Stock..." : editingStockId ? "Save Stock Updates" : "List Stock on Trading Terminal →"}
            </button>
            {editingStockId && (
              <button type="button" className="studio-cancel-btn" onClick={resetStockForm}>
                Cancel
              </button>
            )}
          </div>

          <div className="actions-hint">
            <span className="instant-trading-indicator">
              <span className="pulse-dot blue" />
              Instant Availability: Tradable immediately upon listing
            </span>
          </div>
        </div>
      </form>

      {/* Integrated Ticker Conventions & Live Data Notice Strip */}
      <div className="listing-rules-footer-strip">
        <span className="rules-strip-badge">💡 Suffix Guide</span>
        <div className="rules-strip-items">
          <span><strong>NSE:</strong> Append <code>.NS</code> (e.g. <code>RELIANCE.NS</code>)</span>
          <span className="dot-sep">•</span>
          <span><strong>BSE:</strong> Append <code>.BO</code> (e.g. <code>500325.BO</code>)</span>
          <span className="dot-sep">•</span>
          <span><strong>US:</strong> Standard ticker (e.g. <code>AAPL</code>, <code>NVDA</code>)</span>
          <span className="dot-sep">•</span>
          <span><strong>100% Real-time:</strong> Quotes, intraday charts, and volume stream live from Yahoo Finance.</span>
        </div>
      </div>

      {/* Tradable Universe Directory */}
      <div className="stocks-directory-header">
        <div>
          <h3>Tradable Universe Directory ({stocks.length})</h3>
          <p className="admin-subtext">Filter and search all active stocks currently listed across all markets.</p>
        </div>

        <div className="stocks-search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Filter by symbol, company, or sector..."
            value={stockSearchQuery}
            onChange={(e) => setStockSearchQuery(e.target.value)}
          />
          {stockSearchQuery && (
            <button type="button" className="clear-search-btn" onClick={() => setStockSearchQuery("")}>
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Exchange Filter Tabs */}
      <div className="stock-exchange-filter-bar">
        <button type="button" className={`exch-filter-btn ${stockExchangeFilter === "ALL" ? "active" : ""}`} onClick={() => setStockExchangeFilter("ALL")}>
          All Listed ({stocks.length})
        </button>
        <button type="button" className={`exch-filter-btn ${stockExchangeFilter === "NSE/BSE" ? "active" : ""}`} onClick={() => setStockExchangeFilter("NSE/BSE")}>
          🇮🇳 NSE & BSE Dual ({dualCount})
        </button>
        <button type="button" className={`exch-filter-btn ${stockExchangeFilter === "NSE" ? "active" : ""}`} onClick={() => setStockExchangeFilter("NSE")}>
          🇮🇳 NSE ({nseCount})
        </button>
        <button type="button" className={`exch-filter-btn ${stockExchangeFilter === "BSE" ? "active" : ""}`} onClick={() => setStockExchangeFilter("BSE")}>
          🇮🇳 BSE ({bseCount})
        </button>
        <button type="button" className={`exch-filter-btn ${stockExchangeFilter === "NYSE" ? "active" : ""}`} onClick={() => setStockExchangeFilter("NYSE")}>
          🇺🇸 NYSE ({nyseCount})
        </button>
        <button type="button" className={`exch-filter-btn ${stockExchangeFilter === "NASDAQ" ? "active" : ""}`} onClick={() => setStockExchangeFilter("NASDAQ")}>
          🇺🇸 NASDAQ ({nasdaqCount})
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="admin-table-wrap admin-stocks-table-desktop">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Company</th>
              <th>Exchange</th>
              <th>Market & Currency</th>
              <th>Sector</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((s) => {
              const isIN = s.country === "IN" || s.exchange === "NSE" || s.exchange === "BSE";
              return (
                <tr key={s._id}>
                  <td>
                    <div className="stock-symbol-cell">
                      <strong className="stock-symbol-code">{s.symbol}</strong>
                      <span className={`market-flag-tag ${isIN ? "in" : "us"}`}>
                        {isIN ? "🇮🇳 IN" : "🇺🇸 US"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="stock-company-cell">
                      {s.logo ? (
                        <img src={s.logo} alt={s.symbol} className="stock-thumb-logo" onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <span className="stock-initials-badge">{s.symbol.slice(0, 2)}</span>
                      )}
                      <span className="stock-company-title">{s.companyName}</span>
                    </div>
                  </td>
                  <td>
                    {s.exchange === "NSE/BSE" ? (
                      <span className="exchange-pill dual">
                        NSE & BSE
                      </span>
                    ) : (
                      <span className={`exchange-pill ${s.exchange?.toLowerCase()}`}>
                        {s.exchange || (isIN ? "NSE" : "NASDAQ")}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="market-currency-cell">
                      <span className={`cur-tag ${isIN ? "inr" : "usd"}`}>
                        {isIN ? "INR (₹)" : "USD ($)"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="sector-pill">{s.sector}</span>
                  </td>
                  <td className="admin-actions">
                    <a href={`/market/${encodeURIComponent(s.symbol)}`} target="_blank" rel="noopener noreferrer" className="action-btn test-trade" title="Open live trading terminal for this stock">
                      <FiExternalLink /> Test Trade
                    </a>
                    <button type="button" className="action-btn edit" onClick={() => startEditStock(s)} title="Edit Stock Details">
                      <FiEdit2 /> Edit
                    </button>
                    <button type="button" className="action-btn delete" onClick={() => handleDeleteStock(s)} title="Delist Stock from Market">
                      <FiTrash2 /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredStocks.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-empty">
                  {stockSearchQuery
                    ? `No stocks match "${stockSearchQuery}" under this filter.`
                    : "No stocks listed for this exchange."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Stock Cards */}
      <div className="admin-stocks-cards-mobile">
        {filteredStocks.map((s) => {
          const isIN = s.country === "IN" || s.exchange === "NSE" || s.exchange === "BSE";
          return (
            <div key={s._id} className="admin-stock-card">
              <div className="admin-stock-card-top">
                <div className="admin-stock-identity">
                  {s.logo ? (
                    <img src={s.logo} alt={s.symbol} className="admin-stock-card-logo" onError={(e) => { e.target.style.display = "none"; }} />
                  ) : (
                    <span className="admin-stock-card-initials">{s.symbol.slice(0, 2)}</span>
                  )}
                  <div className="admin-stock-symbol-meta">
                    <div className="admin-stock-sym-row">
                      <strong className="admin-stock-symbol">{s.symbol}</strong>
                      <span className={`market-flag-tag ${isIN ? "in" : "us"}`}>
                        {isIN ? "🇮🇳 IN" : "🇺🇸 US"}
                      </span>
                    </div>
                    <span className="admin-stock-company">{s.companyName}</span>
                  </div>
                </div>

                <div className="admin-stock-badges-right">
                  {s.exchange === "NSE/BSE" ? (
                    <span className="exchange-pill dual">
                      NSE & BSE
                    </span>
                  ) : (
                    <span className={`exchange-pill ${s.exchange?.toLowerCase()}`}>
                      {s.exchange || (isIN ? "NSE" : "NASDAQ")}
                    </span>
                  )}
                  <span className={`cur-tag ${isIN ? "inr" : "usd"}`}>
                    {isIN ? "INR (₹)" : "USD ($)"}
                  </span>
                </div>
              </div>

              {s.sector && (
                <div className="admin-stock-card-mid">
                  <span className="sector-pill">{s.sector}</span>
                </div>
              )}

              <div className="admin-stock-card-actions">
                <a href={`/market/${encodeURIComponent(s.symbol)}`} target="_blank" rel="noopener noreferrer" className="action-btn test-trade" title="Open live trading terminal for this stock">
                  <FiExternalLink /> Test Trade
                </a>
                <button
                  type="button"
                  className="action-btn edit"
                  onClick={() => {
                    startEditStock(s);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  title="Edit Stock Details"
                >
                  <FiEdit2 /> Edit
                </button>
                <button type="button" className="action-btn delete" onClick={() => handleDeleteStock(s)} title="Delist Stock from Market">
                  <FiTrash2 /> Delete
                </button>
              </div>
            </div>
          );
        })}
        {filteredStocks.length === 0 && (
          <div className="admin-empty-box">
            {stockSearchQuery
              ? `No stocks match "${stockSearchQuery}" under this filter.`
              : "No stocks listed for this exchange."}
          </div>
        )}
      </div>
    </section>
  );
}

export default ManageStocksTab;
