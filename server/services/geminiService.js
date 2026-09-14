const axios = require("axios");
const User = require("../models/User");
const Holding = require("../models/Holding");
const { getQuote } = require("./yahooService");

/**
 * Institutional System Prompt for Google Gemini AI Copilot
 */
const SYSTEM_PROMPT = `You are the Senior Financial Market Analyst & AI Copilot for StockSim Pro — a high-performance virtual trading and market analytics platform.

### Core Directives & Persona:
1. Role: You are a sharp, objective, and deeply knowledgeable financial market expert and educator. You help traders analyze equities, understand macroeconomics, interpret technical setups, and structure disciplined risk-reward strategies.
2. Directness: Answer the user's exact question directly and conversationally. Do NOT preach unsolicited 2% risk rules unless specifically asked about position sizing or capital management.
3. Comprehensiveness: When asked about a company (e.g. "what do they do", "real life business", "sector"), explain their real-world operations, core revenue engines, market moat, and competitive standing with clarity and depth.
4. Cross-Market Fluency: Seamlessly analyze both Indian equities (NSE/BSE) and US equities (NYSE/NASDAQ), adapting currency (₹ vs $) and market nuances dynamically based on the active market context.
5. Real Portfolio Awareness: When the user asks about their portfolio, holdings, or P&L, reference the real-time holdings data provided in the <user_portfolio> block. Never hallucinate fake positions when real positions are listed.
6. Clean Safe Markdown: Structure responses with crisp GitHub markdown (headers ###, bullet points, bold key terms). Never output raw HTML tags.
7. Focus: You specialize strictly in financial markets, equities, economics, and trading. If asked off-topic non-financial tasks (like coding algorithms or writing poetry), politely redirect the user back to stock and market analysis.`;

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
 * Direct Google Gemini Market Copilot Transfer
 * Every query is transferred directly to the Gemini API with live context and zero hardcoded replies.
 */
const askMarketCopilot = async ({ userQuery, marketContext, userId }) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.startsWith("CHANGE_ME") || apiKey.trim() === "") {
    return {
      text: "### ⚠️ Gemini API Key Required\nPlease set a valid `GEMINI_API_KEY` in the server environment to enable live AI analysis.",
      source: "system",
    };
  }

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

  // 2. Fetch live quote if active stock is selected or clearly referenced
  let activeStockInfo = "None (General Market Browsing)";
  if (safeContext.activeStock?.symbol) {
    try {
      const q = await getQuote(safeContext.activeStock.symbol);
      if (q) {
        activeStockInfo = `${q.symbol} (${q.shortName || q.symbol}) | Price: ${curSym}${formatCurrency(q.price, isIndian)} | Change: ${q.changePercent ? q.changePercent.toFixed(2) : "0.00"}% | Day Range: ${curSym}${formatCurrency(q.low, isIndian)} - ${curSym}${formatCurrency(q.high, isIndian)} | P/E: ${q.pe || "—"} | 50-DMA: ${q.fiftyDayAverage || "—"}`;
      }
    } catch {}
  }

  // 3. Assemble complete context-grounded prompt for Gemini
  const portfolioBlock = userId
    ? `
<user_portfolio>
- Trader Status: Authenticated User
- Active Market: ${isIndian ? "Indian Market (NSE/BSE)" : "US Market (NYSE/Nasdaq)"}
- Available Cash Balance: ${curSym}${formatCurrency(safeContext.balance, isIndian)}
- Active Equity Holdings: ${safeContext.holdingsCount} stocks
- Total Capital Invested: ${curSym}${formatCurrency(portfolioStats.totalInvested, isIndian)}
- Current Portfolio Market Value: ${curSym}${formatCurrency(portfolioStats.totalCurrent, isIndian)}
- Total Unrealized P&L: ${portfolioStats.totalPnl >= 0 ? "+" : ""}${curSym}${formatCurrency(Math.abs(portfolioStats.totalPnl), isIndian)} (${portfolioStats.totalPnl >= 0 ? "+" : ""}${portfolioStats.pnlPct}%)
- Holdings Breakdown:
${userHoldingsSummary || "No active equity positions in this market."}
</user_portfolio>`
    : `<user_portfolio>
- Trader Status: Guest (Not Logged In)
</user_portfolio>`;

  const contextPrompt = `<market_context>
- Active Platform Market: ${safeContext.market === "US" ? "US Equities (NYSE / NASDAQ - USD)" : "Indian Equities (NSE / BSE - INR)"}
- Active Available Virtual Margin: ${curSym}${formatCurrency(safeContext.balance, isIndian)}
- Currently Selected Stock on Terminal: ${activeStockInfo}
${portfolioBlock}
</market_context>

<user_query>
${userQuery}
</user_query>`;

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: contextPrompt }] }],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 1500,
      topP: 0.9,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  // 4. Direct Transfer to Google Gemini API with automatic model failover
  // Uses verified active Gemini Flash models; if one is temporarily rate-limited, immediately hops to the next.
  const activeModels = [
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.6-flash",
  ];

  let outputText = null;
  let modelSource = null;

  for (const modelName of activeModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await axios.post(endpoint, payload, {
        timeout: 9000,
        headers: { "Content-Type": "application/json" },
      });
      const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText && candidateText.trim().length > 0) {
        outputText = candidateText;
        modelSource = modelName;
        break;
      }
    } catch (err) {
      console.warn(`Gemini model ${modelName} unavailable (${err.response?.status || err.message}), trying next...`);
    }
  }

  if (outputText && outputText.trim().length > 0) {
    return { text: outputText, source: modelSource };
  }

  // Pure error reporting — NO hardcoded canned answers
  return {
    text: "### ⚠️ Gemini AI Service Notice\nUnable to generate a response from the Gemini AI model right now due to network load or API limits. Please verify your connection or try again in a few moments.",
    source: "gemini-error",
  };
};

module.exports = { askMarketCopilot, SYSTEM_PROMPT };
