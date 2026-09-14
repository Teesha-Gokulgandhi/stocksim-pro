import { FiToggleLeft, FiToggleRight } from "react-icons/fi";

function MarketEngineTab({
  actionError,
  marketSuccess,
  marketOpen,
  marketMessage,
  setMarketMessage,
  marketOpenIN,
  marketMessageIN,
  setMarketMessageIN,
  marketNoticeModeIN,
  setMarketNoticeModeIN,
  marketOverrideHoursIN,
  setMarketOverrideHoursIN,
  marketOverrideUntilIN,
  marketOpenUS,
  marketMessageUS,
  setMarketMessageUS,
  marketNoticeModeUS,
  setMarketNoticeModeUS,
  marketOverrideHoursUS,
  setMarketOverrideHoursUS,
  marketOverrideUntilUS,
  marketStatusIN,
  marketStatusUS,
  savingMarket,
  toggleMarket,
  saveMarketMessage,
  saveMarketMessageIN,
  saveMarketMessageUS,
}) {
  const effectiveMarketOpenIN =
    marketStatusIN === "ACTIVE" || marketStatusIN === "TIMED_OPEN";
  const effectiveMarketOpenUS =
    marketStatusUS === "ACTIVE" || marketStatusUS === "TIMED_OPEN";

  return (
    <section className="admin-card market-card">
      {actionError && <div className="admin-alert">{actionError}</div>}
      {marketSuccess && <div className="admin-success">{marketSuccess}</div>}
      <div className="market-card-top">
        <div>
          <div className="market-title-row">
            <h2>Market Simulation Engine Control</h2>
            <span className={`market-status-pill ${marketOpen && effectiveMarketOpenIN && effectiveMarketOpenUS ? "open" : "closed"}`}>
              {marketOpen && effectiveMarketOpenIN && effectiveMarketOpenUS
                ? "🟢 BOTH MARKETS ACTIVE"
                : !marketOpen
                ? "🔴 PLATFORM OVERRIDE PAUSED"
                : "🟡 REGIONAL CONTROLS ENGAGED"}
            </span>
          </div>
        </div>
      </div>

      {/* Regional Market Control Cards */}
      <div className="market-desks-control-grid">
        {/* 🇮🇳 Indian Market Desk */}
        <div className="market-desk-box in">
          <div className="market-desk-box-header">
            <div className="market-desk-title-group">
              <span className="desk-flag-icon">🇮🇳</span>
              <div>
                <h3>Indian Market (NSE / BSE)</h3>
                <p>Trading in INR (₹) • 9:15 AM – 3:30 PM IST</p>
              </div>
            </div>

            <div className="market-control-actions">
              <span className={`market-status-pill ${effectiveMarketOpenIN ? "open" : "closed"}`}>
                {effectiveMarketOpenIN ? "OPEN" : "CLOSED"}
              </span>
            </div>
          </div>

          {marketStatusIN === "TIMED_OPEN" && marketOverrideUntilIN && (
            <p className="market-override-note">
              ⏱️ Temporary override active until{" "}
              {new Date(marketOverrideUntilIN).toLocaleString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              . Reverts to the normal schedule automatically.
            </p>
          )}

          <div className="market-message-row">
            <label>Indian market message</label>
            <div className="market-message-input">
              <input
                type="text"
                value={marketMessageIN}
                onChange={(e) => setMarketMessageIN(e.target.value)}
                maxLength={300}
                placeholder="Indian Market (NSE/BSE) trading is currently paused by admin..."
              />
              <button type="button" onClick={saveMarketMessageIN} disabled={savingMarket}>
                {savingMarket ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>

          <div className="market-presets-row">
            <span className="preset-label">Quick Presets:</span>
            <button type="button" className="preset-btn" onClick={() => { setMarketNoticeModeIN("SESSION"); setMarketMessageIN("✅ NSE/BSE maintenance complete. Normal market schedule restored."); }}>
              Resume Market
            </button>
            <button type="button" className="preset-btn" onClick={() => { setMarketNoticeModeIN("HOLIDAY"); setMarketMessageIN("🪔 Market Holiday: NSE & BSE are closed today. Resuming next business day."); }}>
              Indian Holiday
            </button>
            <button type="button" className="preset-btn" onClick={() => { setMarketNoticeModeIN("MAINTENANCE"); setMarketMessageIN("🛠️ NSE/BSE Maintenance: Upgrading live settlement engine."); }}>
              Maintenance
            </button>
            <button type="button" className={`preset-btn ${marketNoticeModeIN === "TIMED_OPEN" ? "active" : ""}`} onClick={() => { setMarketNoticeModeIN("TIMED_OPEN"); setMarketMessageIN(`⏱️ Temporary Open: NSE/BSE trading enabled for ${marketOverrideHoursIN}h outside normal hours.`); }}>
              Temporary Open
            </button>
          </div>

          {marketNoticeModeIN === "TIMED_OPEN" && (
            <div className="market-presets-row">
              <span className="preset-label">Open for:</span>
              {[1, 4, 8, 24].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`preset-btn ${marketOverrideHoursIN === h ? "active" : ""}`}
                  onClick={() => { setMarketOverrideHoursIN(h); setMarketMessageIN(`⏱️ Temporary Open: NSE/BSE trading enabled for ${h}h outside normal hours.`); }}
                >
                  {h}h
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 🇺🇸 US Market Desk */}
        <div className="market-desk-box us">
          <div className="market-desk-box-header">
            <div className="market-desk-title-group">
              <span className="desk-flag-icon">🇺🇸</span>
              <div>
                <h3>US Market (NYSE / NASDAQ)</h3>
                <p>Trading in USD ($) • 9:30 AM – 4:00 PM EST</p>
              </div>
            </div>

            <div className="market-control-actions">
              <span className={`market-status-pill ${effectiveMarketOpenUS ? "open" : "closed"}`}>
                {effectiveMarketOpenUS ? "OPEN" : "CLOSED"}
              </span>
            </div>
          </div>

          {marketStatusUS === "TIMED_OPEN" && marketOverrideUntilUS && (
            <p className="market-override-note">
              ⏱️ Temporary override active until{" "}
              {new Date(marketOverrideUntilUS).toLocaleString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              . Reverts to the normal schedule automatically.
            </p>
          )}

          <div className="market-message-row">
            <label>US market message</label>
            <div className="market-message-input">
              <input
                type="text"
                value={marketMessageUS}
                onChange={(e) => setMarketMessageUS(e.target.value)}
                maxLength={300}
                placeholder="US Market (NYSE/Nasdaq) trading is currently paused by admin..."
              />
              <button type="button" onClick={saveMarketMessageUS} disabled={savingMarket}>
                {savingMarket ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>

          <div className="market-presets-row">
            <span className="preset-label">Quick Presets:</span>
            <button type="button" className="preset-btn" onClick={() => { setMarketNoticeModeUS("SESSION"); setMarketMessageUS("✅ US market maintenance complete. Normal market schedule restored."); }}>
              Resume Market
            </button>
            <button type="button" className="preset-btn" onClick={() => { setMarketNoticeModeUS("HOLIDAY"); setMarketMessageUS("🇺🇸 US Bank Holiday: NYSE & NASDAQ are closed today."); }}>
              US Holiday
            </button>
            <button type="button" className="preset-btn" onClick={() => { setMarketNoticeModeUS("MAINTENANCE"); setMarketMessageUS("🛠️ US Market Feed Maintenance: Updating live data stream."); }}>
              Maintenance
            </button>
            <button type="button" className={`preset-btn ${marketNoticeModeUS === "TIMED_OPEN" ? "active" : ""}`} onClick={() => { setMarketNoticeModeUS("TIMED_OPEN"); setMarketMessageUS(`⏱️ Temporary Open: US market trading enabled for ${marketOverrideHoursUS}h outside normal hours.`); }}>
              Temporary Open
            </button>
          </div>

          {marketNoticeModeUS === "TIMED_OPEN" && (
            <div className="market-presets-row">
              <span className="preset-label">Open for:</span>
              {[1, 4, 8, 24].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`preset-btn ${marketOverrideHoursUS === h ? "active" : ""}`}
                  onClick={() => { setMarketOverrideHoursUS(h); setMarketMessageUS(`⏱️ Temporary Open: US market trading enabled for ${h}h outside normal hours.`); }}
                >
                  {h}h
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Master Global Kill Switch Box */}
      <div className="market-desk-box global">
        <div className="market-desk-box-header">
          <div className="market-desk-title-group">
            <span className="desk-flag-icon">🚨</span>
            <div>
              <h3>Master Platform Emergency Kill Switch</h3>
            </div>
          </div>

          <div className="market-kill-actions">
            <span className={`market-status-pill ${marketOpen ? "open" : "closed"}`}>
              {marketOpen ? "🟢 PLATFORM LIVE" : "🔴 PLATFORM OVERRIDE HALTED"}
            </span>
            <button
              type="button"
              className={`desk-toggle-btn ${marketOpen ? "open" : "closed"}`}
              onClick={toggleMarket}
              disabled={savingMarket}
            >
              {marketOpen ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />}
              {savingMarket ? "Updating..." : marketOpen ? "Halt All Trading" : "Resume Global Trading"}
            </button>
          </div>
        </div>

        <div className="market-message-row">
          <label>Global maintenance message</label>
          <div className="market-message-input">
            <input
              type="text"
              value={marketMessage}
              onChange={(e) => setMarketMessage(e.target.value)}
              maxLength={300}
              placeholder="Trading is currently paused by admin. Please check back soon..."
            />
            <button type="button" onClick={saveMarketMessage} disabled={savingMarket}>
              Save Global Message
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MarketEngineTab;
