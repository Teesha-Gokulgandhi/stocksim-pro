import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  FiZap,
  FiX,
  FiMinus,
  FiSend,
  FiTrash2,
  FiCopy,
  FiCheck,
  FiShield,
  FiTrendingUp,
  FiDollarSign,
  FiActivity,
  FiMaximize2,
} from "react-icons/fi";
import API from "../../services/api";
import { useMarket } from "../../context/MarketContext";
import "./FloatingCopilot.css";

// Safe, sanitized markdown formatter (Anti-XSS: no dangerouslySetInnerHTML with raw tags)
function FormattedMessage({ text }) {
  if (!text) return null;

  // Split into lines
  const lines = text.split("\n");

  return (
    <div className="copilot-formatted-content">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="copilot-line-break" />;
        }

        // H3 Header
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="copilot-h3">
              {renderInlineStyles(trimmed.slice(4))}
            </h4>
          );
        }

        // H4 Header
        if (trimmed.startsWith("#### ")) {
          return (
            <h5 key={idx} className="copilot-h4">
              {renderInlineStyles(trimmed.slice(5))}
            </h5>
          );
        }

        // Bullet point (- or *)
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={idx} className="copilot-bullet-item">
              <span className="bullet-dot">•</span>
              <span>{renderInlineStyles(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="copilot-numbered-item">
              <span className="bullet-num">{numMatch[1]}.</span>
              <span>{renderInlineStyles(numMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="copilot-para">
            {renderInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Inline formatter for bold, code, highlights
function renderInlineStyles(rawText) {
  // Strip any raw HTML tags to prevent XSS
  const sanitized = rawText.replace(/<[^>]*>?/gm, "");

  // Match **bold** and `code`
  const parts = [];
  let remaining = sanitized;
  let key = 0;

  while (remaining.length > 0) {
    // Bold match **...**
    const boldIndex = remaining.indexOf("**");
    const codeIndex = remaining.indexOf("`");

    if (boldIndex === -1 && codeIndex === -1) {
      parts.push(<span key={key}>{remaining}</span>);
      break;
    }

    // Bold is earlier
    if (boldIndex !== -1 && (codeIndex === -1 || boldIndex < codeIndex)) {
      if (boldIndex > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldIndex)}</span>);
      }
      const endBold = remaining.indexOf("**", boldIndex + 2);
      if (endBold !== -1) {
        parts.push(
          <strong key={key++} className="copilot-bold">
            {remaining.slice(boldIndex + 2, endBold)}
          </strong>
        );
        remaining = remaining.slice(endBold + 2);
      } else {
        parts.push(<span key={key}>{remaining.slice(boldIndex)}</span>);
        break;
      }
    } else {
      // Code is earlier
      if (codeIndex > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, codeIndex)}</span>);
      }
      const endCode = remaining.indexOf("`", codeIndex + 1);
      if (endCode !== -1) {
        parts.push(
          <code key={key++} className="copilot-code">
            {remaining.slice(codeIndex + 1, endCode)}
          </code>
        );
        remaining = remaining.slice(endCode + 1);
      } else {
        parts.push(<span key={key}>{remaining.slice(codeIndex)}</span>);
        break;
      }
    }
  }

  return parts;
}

let msgCounter = 0;
function generateMessageId() {
  return `msg_${Date.now()}_${++msgCounter}`;
}

function getCurrentTimeString() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function FloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const { selectedMarket, currency, currencySymbol } = useMarket();
  const location = useLocation();
  const messagesEndRef = useRef(null);

  // Detect active stock from URL if on /market/:symbol
  const urlStockMatch = location.pathname.match(/\/market\/([A-Za-z0-9._-]+)/);
  const activeStockSymbol = urlStockMatch ? urlStockMatch[1] : null;

  // Initial welcome message
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: `### ⚡ StockSim Pro Market Copilot
Hello! I am your real-time **Financial Market Copilot**.

Type any stock name or symbol (e.g., **SUNPHARMA**, **RELIANCE**, **TCS**, **AAPL**, **NVDA**) to receive an instant real-time tear sheet with **50/200 DMA trends, P/E multiples, and support/resistance zones**.`,
    },
  ]);

  // Fetch live user balance on mount or open
  useEffect(() => {
    if (isOpen && !userProfile) {
      API.get("/user/profile")
        .then((res) => {
          if (res.data?.user) {
            setUserProfile(res.data.user);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, userProfile]);

  // Scroll to bottom of message thread
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Send query to backend copilot service
  const handleSendMessage = async (textToSend = null) => {
    const rawText = textToSend || inputVal;
    if (!rawText || !rawText.trim() || loading) return;

    const userText = rawText.trim();
    setInputVal("");

    const userMsg = {
      id: generateMessageId(),
      role: "user",
      timestamp: getCurrentTimeString(),
      text: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const activeBalance =
        selectedMarket === "US"
          ? (userProfile?.balanceUSD ?? 10000)
          : (userProfile?.balance ?? 100000);

      const payload = {
        message: userText,
        marketContext: {
          market: selectedMarket,
          currency,
          balance: activeBalance,
          activeStock: activeStockSymbol ? { symbol: activeStockSymbol } : null,
          holdingsCount: userProfile?.holdings?.length || 0,
        },
      };

      const res = await API.post("/copilot/chat", payload);

      if (res.data?.success) {
        const botMsg = {
          id: generateMessageId(),
          role: "assistant",
          timestamp: getCurrentTimeString(),
          text: res.data.answer,
          source: res.data.source,
          notice: res.data.notice,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(res.data?.message || "Failed to fetch response");
      }
    } catch (err) {
      const errMsg = {
        id: generateMessageId(),
        role: "assistant",
        timestamp: getCurrentTimeString(),
        text: `### ⚠️ Copilot Notice
${err.response?.data?.message || "Unable to reach the AI engine right now. Please verify your connection or try again in a moment."}`,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (idx, text) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: `### 🔄 Session Cleared
Ready for fresh market analysis. Type any stock name (e.g. SUNPHARMA, RELIANCE, AAPL) to inspect real data.`,
      },
    ]);
  };

  const handleSendMessageRef = useRef(handleSendMessage);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  // Global listener for opening copilot with a custom query
  useEffect(() => {
    const handleOpenCopilot = (e) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e.detail?.query) {
        handleSendMessageRef.current?.(e.detail.query);
      }
    };
    window.addEventListener("open-copilot", handleOpenCopilot);
    return () => window.removeEventListener("open-copilot", handleOpenCopilot);
  }, []);

  // Single clean action option per user request
  const suggestionChips = activeStockSymbol
    ? [
        {
          label: `⚡ AI Analytics: ${activeStockSymbol}`,
          query: `Give complete AI analytics for ${activeStockSymbol}`,
        },
      ]
    : [
        {
          label: "📈 Live Market Pulse & Setups",
          query: "What is the dominant trend across the benchmark indices and where are key support levels?",
        },
      ];

  return (
    <div className="floating-copilot-container" id="trade-copilot">
      {/* Right-sized Circular Floating Logo Button (Per User Request) */}
      {!isOpen && (
        <button
          type="button"
          className="copilot-launcher-circle"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          title="AI Trading Copilot"
          aria-label="Open AI Trading Copilot"
        >
          <div className="copilot-circle-glow" />
          <div className="copilot-circle-inner">
            <svg
              className="copilot-circle-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
        </button>
      )}

      {/* Floating Copilot Modal / Drawer */}
      {isOpen && (
        <div className={`copilot-window ${isMinimized ? "minimized" : ""}`}>
          {/* Header */}
          <div className="copilot-header">
            <div className="copilot-header-title">
              <div className="copilot-icon-badge">
                <FiZap />
              </div>
              <div className="copilot-name-row">
                <h3>Market Copilot</h3>
                {activeStockSymbol && (
                  <span className="stock-context-pill">
                    <FiActivity /> {activeStockSymbol}
                  </span>
                )}
              </div>
            </div>

            <div className="copilot-header-actions">
              <button
                type="button"
                className="copilot-icon-btn"
                onClick={handleClearChat}
                title="Clear Conversation"
              >
                <FiTrash2 />
              </button>
              <button
                type="button"
                className="copilot-icon-btn"
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <FiMaximize2 /> : <FiMinus />}
              </button>
              <button
                type="button"
                className="copilot-icon-btn close"
                onClick={() => setIsOpen(false)}
                title="Close Copilot"
              >
                <FiX />
              </button>
            </div>
          </div>

          {/* Minimized Bar Summary */}
          {isMinimized ? (
            <div className="copilot-minimized-strip" onClick={() => setIsMinimized(false)}>
              <span className="pulse-dot" />
              <span>Copilot Minimized • Click to expand</span>
              <FiMaximize2 />
            </div>
          ) : (
            <>
              {/* Chat Message Thread */}
              <div className="copilot-messages-container">
                {messages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`copilot-message-row ${msg.role}`}>
                    <div className="copilot-bubble">
                      <div className="copilot-bubble-header">
                        <span className="copilot-bubble-author">
                          {msg.role === "user" ? "You" : "Market Copilot"}
                        </span>
                        <div className="copilot-bubble-meta">
                          <span className="copilot-time">{msg.timestamp}</span>
                          {msg.role === "assistant" && (
                            <button
                              type="button"
                              className="copilot-copy-btn"
                              onClick={() => handleCopy(idx, msg.text)}
                              title="Copy Answer"
                            >
                              {copiedIdx === idx ? <FiCheck className="copied" /> : <FiCopy />}
                            </button>
                          )}
                        </div>
                      </div>

                      <FormattedMessage text={msg.text} />

                      {msg.notice && (
                        <div className="copilot-bubble-notice">
                          <span>💡 {msg.notice}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading Indicator */}
                {loading && (
                  <div className="copilot-message-row assistant">
                    <div className="copilot-bubble loading">
                      <div className="copilot-bubble-author">Market Copilot is analyzing...</div>
                      <div className="copilot-typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Action Suggestion Chips */}
              <div className="copilot-chips-row">
                {suggestionChips.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    className="copilot-chip-btn"
                    onClick={() => handleSendMessage(chip.query)}
                    disabled={loading}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="copilot-input-area">
                <div className="copilot-input-wrap">
                  <textarea
                    rows={1}
                    className="copilot-textarea"
                    placeholder={`Ask about ${activeStockSymbol || "market opportunities"}, setups, or risk...`}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value.slice(0, 500))}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                  />
                  <span className={`char-counter ${inputVal.length > 450 ? "warn" : ""}`}>
                    {inputVal.length}/500
                  </span>
                </div>

                <button
                  type="button"
                  className="copilot-send-btn"
                  onClick={() => handleSendMessage()}
                  disabled={!inputVal.trim() || loading}
                  title="Send Query (Enter)"
                >
                  <FiSend />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
