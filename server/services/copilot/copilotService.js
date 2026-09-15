const User = require("../../models/User");
const Holding = require("../../models/Holding");
const { getQuote } = require("../yahooService");
const { askGrok } = require("./grokProvider");
const { askGemini } = require("./geminiProvider");

/**
 * Institutional System Prompt for Market Copilot
 */
const SYSTEM_PROMPT = `You are the Senior Financial Market Analyst & AI Copilot for StockSim Pro — a high-performance virtual trading and market analytics platform.

### Core Directives:
1. Direct Answers: Answer the user's specific question directly, concisely, and conversationally. Do not include boilerplate introductory greetings or filler text.
2. Market Intelligence: Explain core business drivers, competitive moat, revenue streams, and sector dynamics clearly when asked about any stock or sector.
3. Cross-Market Fluency: Seamlessly cover both Indian equities (NSE/BSE) and US equities (NYSE/NASDAQ), adapting currency (₹ vs $) dynamically based on the context.
4. Real Portfolio Awareness: When the user asks about their portfolio, holdings, or P&L, reference the real-time holdings data provided in the live context.
5. Structured Markdown: Format responses using crisp GitHub markdown (headers, bullet points, bold key figures, small tables when comparing).`;

/**
 * Format currency numbers cleanly
 */
const formatCurrency = (val, isIndian = true) => {
  if (val == null || isNaN(val)) return "0.00";
  const num = Number(val);
  if (isIndian) {
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Core Market Copilot Orchestrator Pipeline
 * Directly passes questions to Grok (Primary) with automatic Gemini failover.
 */
const askMarketCopilot = async (params = {}) => {
  // Support userQuery, query, or message transparently
  const rawQuery = params.userQuery || params.query || params.message || "";
  const userQuery = typeof rawQuery === "string" ? rawQuery.trim() : "";

  if (!userQuery) {
    return {
      text: "### 👋 How can I help?\nPlease enter a stock symbol, market question, or comparison to analyze.",
      source: "system",
    };
  }

  const { marketContext, userId } = params;

  const safeContext = {
    market: marketContext?.market === "US" ? "US" : "IN",
    currency: marketContext?.market === "US" ? "USD" : "INR",
    balance: Number(marketContext?.balance) || 100000,
    activeStock: marketContext?.activeStock || null,
    holdingsCount: Number(marketContext?.holdingsCount) || 0,
  };

  const isIndian = safeContext.market !== "US";
  const curSym = isIndian ? "₹" : "$";

  // 1. Pre-fetch real user portfolio from MongoDB if authenticated
  let userHoldingsSummary = "";
  let portfolioStats = {
    totalInvested: 0,
    totalCurrent: 0,
    totalPnl: 0,
    pnlPct: "0.00",
  };

  if (userId) {
    try {
      const [u, rawHoldings] = await Promise.all([
        User.findById(userId).lean(),
        Holding.find({ user: userId, quantity: { $gt: 0 } }).lean(),
      ]);

      if (u) {
        safeContext.balance = isIndian ? (u.balance ?? 100000) : (u.balanceUSD ?? 10000);
      }

      if (rawHoldings && rawHoldings.length > 0) {
        const activeHoldings = rawHoldings.filter((h) =>
          isIndian
            ? h.currency === "INR" || h.symbol.endsWith(".NS") || h.symbol.endsWith(".BO")
            : h.currency === "USD" || (!h.symbol.endsWith(".NS") && !h.symbol.endsWith(".BO"))
        );

        safeContext.holdingsCount = activeHoldings.length;

        const evaluated = await Promise.all(
          activeHoldings.map(async (h) => {
            let quote = null;
            try { quote = await getQuote(h.symbol); } catch {}
            const currentPrice = quote?.price || h.avgPrice;
            const invested = h.avgPrice * h.quantity;
            const curVal = currentPrice * h.quantity;
            const pnl = curVal - invested;
            const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
            return {
              symbol: h.symbol,
              quantity: h.quantity,
              avgPrice: h.avgPrice,
              currentPrice,
              invested,
              curVal,
              pnl,
              pnlPct,
            };
          })
        );

        const totalInvested = evaluated.reduce((s, h) => s + h.invested, 0);
        const totalCurrent = evaluated.reduce((s, h) => s + h.curVal, 0);
        const totalPnl = totalCurrent - totalInvested;
        const pnlPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(2) : "0.00";

        portfolioStats = { totalInvested, totalCurrent, totalPnl, pnlPct };

        if (evaluated.length > 0) {
          userHoldingsSummary = evaluated
            .map(
              (h) =>
                `- ${h.symbol}: ${h.quantity} shares @ avg ${curSym}${formatCurrency(h.avgPrice, isIndian)} (Current: ${curSym}${formatCurrency(h.currentPrice, isIndian)}) | Invested: ${curSym}${formatCurrency(h.invested, isIndian)} | Value: ${curSym}${formatCurrency(h.curVal, isIndian)} | P&L: ${h.pnl >= 0 ? "+" : ""}${curSym}${formatCurrency(Math.abs(h.pnl), isIndian)} (${h.pnl >= 0 ? "+" : ""}${h.pnlPct.toFixed(2)}%)`
            )
            .join("\n");
        }
      }
    } catch (dbErr) {
      console.error("Copilot Portfolio Context Error:", dbErr.message);
    }
  }

  // 2. Fetch live quote if active stock is selected
  let activeStockInfo = "None (General Market Browsing)";
  if (safeContext.activeStock?.symbol) {
    try {
      const q = await getQuote(safeContext.activeStock.symbol);
      if (q) {
        activeStockInfo = `${q.symbol} (${q.shortName || q.symbol}) | Price: ${curSym}${formatCurrency(q.price, isIndian)} | Change: ${q.changePercent ? q.changePercent.toFixed(2) : "0.00"}% | Day Range: ${curSym}${formatCurrency(q.low, isIndian)} - ${curSym}${formatCurrency(q.high, isIndian)} | P/E: ${q.pe || "—"} | 50-DMA: ${q.fiftyDayAverage || "—"}`;
      }
    } catch {}
  }

  // 3. Assemble clean context block (passed into AI system context)
  const portfolioBlock = userId
    ? `Trader Portfolio Context:
- Available Cash Balance: ${curSym}${formatCurrency(safeContext.balance, isIndian)}
- Active Equity Positions: ${safeContext.holdingsCount} stocks
- Total Invested: ${curSym}${formatCurrency(portfolioStats.totalInvested, isIndian)}
- Portfolio Value: ${curSym}${formatCurrency(portfolioStats.totalCurrent, isIndian)}
- Unrealized P&L: ${portfolioStats.totalPnl >= 0 ? "+" : ""}${curSym}${formatCurrency(Math.abs(portfolioStats.totalPnl), isIndian)} (${portfolioStats.totalPnl >= 0 ? "+" : ""}${portfolioStats.pnlPct}%)
- Holdings Breakdown:
${userHoldingsSummary || "No active equity positions in this market."}`
    : `Trader Status: Guest (Not Logged In)`;

  const contextBlock = `- Market Mode: ${safeContext.market === "US" ? "US Equities (NYSE / NASDAQ - USD)" : "Indian Equities (NSE / BSE - INR)"}
- Terminal Active Stock: ${activeStockInfo}
${portfolioBlock}`;

  // 4. Primary Provider: Grok / Groq LPU High-Speed Engine
  try {
    const grokResult = await askGrok({
      systemPrompt: SYSTEM_PROMPT,
      contextBlock,
      userQuery,
    });
    if (grokResult && grokResult.text && grokResult.text.trim().length > 0) {
      return grokResult;
    }
  } catch (grokErr) {
    console.warn("Primary Grok engine error, falling back to Gemini:", grokErr.message);
  }

  // 5. Automatic Failover: Google Gemini AI Pool
  try {
    const geminiResult = await askGemini({
      systemPrompt: SYSTEM_PROMPT,
      contextBlock,
      userQuery,
    });
    if (geminiResult && geminiResult.text && geminiResult.text.trim().length > 0) {
      return geminiResult;
    }
  } catch (geminiErr) {
    console.warn("Gemini failover error:", geminiErr.message);
  }

  // Pure clean fallback message if both APIs are down
  return {
    text: "### ⚠️ AI Engine Busy\nBoth Grok and Gemini AI services are momentarily experiencing high traffic. Please submit your question again in a moment.",
    source: "ai-error",
  };
};

module.exports = { askMarketCopilot, SYSTEM_PROMPT };
