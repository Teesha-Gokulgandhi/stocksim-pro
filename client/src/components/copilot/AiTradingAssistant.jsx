import { useState } from "react";
import { HiSparkles } from "react-icons/hi2";
import { FiTrendingUp, FiFileText, FiInfo, FiBarChart2, FiSend, FiZap, FiGitMerge } from "react-icons/fi";
import "./AiTradingAssistant.css";

export default function AiTradingAssistant({
  symbol = "Market",
  companyName = "",
}) {
  const [customInput, setCustomInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [compareInput, setCompareInput] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  const cleanSymbol = symbol || "Market";
  const displayTitle = companyName ? `${companyName} (${cleanSymbol})` : cleanSymbol;

  const triggerQuery = (query) => {
    window.dispatchEvent(
      new CustomEvent("open-copilot", {
        detail: { query },
      })
    );
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    triggerQuery(customInput.trim());
    setCustomInput("");
    setShowInput(false);
  };

  const handleCompareSubmit = (e) => {
    e.preventDefault();
    if (!compareInput.trim()) return;
    triggerQuery(`${cleanSymbol} vs ${compareInput.trim()}`);
    setCompareInput("");
    setShowCompare(false);
  };

  return (
    <div className="ai-assistant-card">
      <div className="ai-assistant-header">
        <div className="ai-assistant-title-row">
          <HiSparkles className="ai-sparkle-icon" />
          <h4>AI Trading Assistant</h4>
        </div>
        <p className="ai-assistant-subtitle">
          Get instant AI-powered insights about <strong>{cleanSymbol}</strong>
        </p>
      </div>

      {/* 6 Contextual Quick-Action Chips */}
      <div className="ai-chips-grid">
        <button
          type="button"
          className="ai-chip-pill"
          onClick={() =>
            triggerQuery(
              `Explain the key financial stats, valuation multiples, and volume profile for ${displayTitle}.`
            )
          }
        >
          <FiBarChart2 className="chip-ico" />
          <span>Explain the stats</span>
        </button>

        <button
          type="button"
          className="ai-chip-pill"
          onClick={() =>
            triggerQuery(
              `Summarize the latest financial news, quarterly earnings, and fundamental catalysts for ${displayTitle}.`
            )
          }
        >
          <FiFileText className="chip-ico" />
          <span>Summarize news</span>
        </button>

        <button
          type="button"
          className="ai-chip-pill"
          onClick={() =>
            triggerQuery(
              `Analyze the current technical chart trend, moving averages, and key support & resistance levels for ${displayTitle}.`
            )
          }
        >
          <FiTrendingUp className="chip-ico" />
          <span>Show me the trend</span>
        </button>

        <button
          type="button"
          className="ai-chip-pill"
          onClick={() =>
            triggerQuery(
              `Provide a concise company overview, business model breakdown, and competitive moat for ${displayTitle}.`
            )
          }
        >
          <FiInfo className="chip-ico" />
          <span>Tell me about this company</span>
        </button>

        <button
          type="button"
          className="ai-chip-pill accent"
          onClick={() =>
            triggerQuery(`Give complete AI analytics for ${cleanSymbol}`)
          }
        >
          <FiZap className="chip-ico" />
          <span>Momentum Score</span>
        </button>

        <button
          type="button"
          className="ai-chip-pill"
          onClick={() => setShowCompare(true)}
        >
          <FiGitMerge className="chip-ico" />
          <span>Compare with...</span>
        </button>
      </div>

      {/* Compare Input */}
      {showCompare && (
        <form className="ai-custom-form" onSubmit={handleCompareSubmit}>
          <input
            type="text"
            className="ai-custom-input"
            placeholder={`Compare ${cleanSymbol} vs... (e.g. TCS, Apple)`}
            value={compareInput}
            onChange={(e) => setCompareInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="ai-custom-send-btn" disabled={!compareInput.trim()}>
            <FiSend />
          </button>
        </form>
      )}

      {/* Ask Custom Question Input or Button */}
      {showInput ? (
        <form className="ai-custom-form" onSubmit={handleCustomSubmit}>
          <input
            type="text"
            className="ai-custom-input"
            placeholder={`Ask anything about ${cleanSymbol} (e.g. entry targets, risks)...`}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="ai-custom-send-btn" disabled={!customInput.trim()}>
            <FiSend />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="ai-ask-custom-btn"
          onClick={() => setShowInput(true)}
        >
          <HiSparkles className="btn-sparkle" />
          <span>Ask Custom Question</span>
        </button>
      )}
    </div>
  );
}
