const YahooFinance = require("yahoo-finance2").default;
const ttlCache = require("../utils/ttlCache");

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Symbol aliases for tickers that underwent corporate restructuring or ticker migration
// on Yahoo Finance (e.g. Tata Motors demerger into TMCV, Zomato corporate renaming to Eternal)
const SYMBOL_ALIASES = {
  "TATAMOTORS.NS": "TMCV.NS",
  "TATAMOTORS.BO": "TMCV.BO",
  "ZOMATO.NS": "ETERNAL.NS",
  "ZOMATO.BO": "ETERNAL.BO",
};

const resolveSymbol = (symbol) => {
  if (!symbol) return symbol;
  const upper = String(symbol).toUpperCase().trim();
  return SYMBOL_ALIASES[upper] || upper;
};

// Default quote cache TTL to 60s (can be overridden via env)
const CACHE_TTL_MS = (Number(process.env.QUOTE_CACHE_TTL_SECONDS) || 60) * 1000;

const withTimeout = (promise, ms) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Yahoo Finance request timed out")), ms)
  );
  return Promise.race([promise, timeout]);
};

const YAHOO_TIMEOUT_MS = 15000; // 15 seconds (was 8s — too aggressive)

const fetchQuoteFromYahoo = async (symbol, retries = 2) => {
  const targetSymbol = resolveSymbol(symbol);
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const quote = await withTimeout(yahooFinance.quote(targetSymbol), YAHOO_TIMEOUT_MS);
      if (!quote || quote.regularMarketPrice == null) {
        return null;
      }

      return {
        symbol: symbol, // Retain the caller's requested symbol so client state & IDs match
        shortName: quote.shortName || quote.longName || "",
        currency: quote.currency || "",
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
        previousClose: quote.regularMarketPreviousClose ?? quote.regularMarketPrice,
        open: quote.regularMarketOpen ?? quote.regularMarketPrice,
        high: quote.regularMarketDayHigh ?? quote.regularMarketPrice,
        low: quote.regularMarketDayLow ?? quote.regularMarketPrice,
        volume: quote.regularMarketVolume ?? 0,
        avgVolume: quote.averageDailyVolume3Month ?? quote.regularMarketVolume ?? 0,
        marketCap: quote.marketCap ?? 0,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? quote.regularMarketDayLow ?? quote.regularMarketPrice,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? quote.regularMarketDayHigh ?? quote.regularMarketPrice,
        pe: quote.trailingPE ?? null,
        eps: quote.epsTrailingTwelveMonths ?? null,
        dividendYield: quote.dividendYield ?? null,
        fiftyDayAverage: quote.fiftyDayAverage ?? null,
        twoHundredDayAverage: quote.twoHundredDayAverage ?? null,
      };
    } catch (err) {
      if (attempt <= retries) {
        // Backoff: 1s, 2s before retrying
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      console.log(`Yahoo Error for ${symbol} (target ${targetSymbol}) after ${retries + 1} attempts:`, err.message);
      return null;
    }
  }
};

// Cached + de-duplicated wrapper around the raw Yahoo call.
const getQuote = (symbol) => {
  const key = `quote:${symbol.toUpperCase()}`;
  return ttlCache.getOrSet(key, CACHE_TTL_MS, () => fetchQuoteFromYahoo(symbol));
};

const CHART_CACHE_TTL_MS = 5 * 60 * 1000; // 5m cache for historical charts (cuts API usage by 80%)

const fetchChartFromYahoo = async (symbol, range = "1M") => {
  try {
    const now = new Date();
    let period1;
    let interval = "1d";

    switch (range) {
      case "1D":
        period1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        interval = "15m";
        break;
      case "1W":
        period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = "1h";
        break;
      case "1M":
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = "1d";
        break;
      case "1Y":
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        interval = "1d";
        break;
      case "3Y":
        period1 = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000);
        interval = "1d";
        break;
      case "5Y":
        period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        interval = "1d";
        break;
      default:
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        interval = "1d";
        break;
    }

    const targetSymbol = resolveSymbol(symbol);
    const result = await withTimeout(
      yahooFinance.chart(targetSymbol, {
        period1: period1.toISOString().split("T")[0],
        interval,
      }),
      YAHOO_TIMEOUT_MS
    );

    if (!result || !result.quotes || result.quotes.length === 0) {
      return [];
    }

    return result.quotes
      .filter((q) => q && q.close != null && !Number.isNaN(q.close))
      .map((q) => {
        const d = new Date(q.date);
        return {
          timestamp: d.getTime(),
          date:
            range === "1D"
              ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
              : ["3Y", "5Y"].includes(range)
              ? d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
              : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          fullDate: d.toISOString(),
          price: Number((q.close || 0).toFixed(2)),
          open: Number((q.open || q.close || 0).toFixed(2)),
          high: Number((q.high || q.close || 0).toFixed(2)),
          low: Number((q.low || q.close || 0).toFixed(2)),
          volume: q.volume || 0,
        };
      });
  } catch (err) {
    console.log(`Yahoo Chart Error for ${symbol} (${range}):`, err.message);
    return [];
  }
};

const getHistoricalChart = (symbol, range = "1M") => {
  const normalizedRange = ["1D", "1W", "1M", "1Y", "3Y", "5Y"].includes(range.toUpperCase())
    ? range.toUpperCase()
    : "1M";
  const key = `chart:${symbol.toUpperCase()}:${normalizedRange}`;
  return ttlCache.getOrSet(key, CHART_CACHE_TTL_MS, () =>
    fetchChartFromYahoo(symbol, normalizedRange)
  );
};

const fetchReplayCandles = async (symbol, range = "6M") => {
  try {
    const now = new Date();
    let period1;
    switch (range.toUpperCase()) {
      case "3M":
        period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6M":
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1Y":
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "2Y":
        period1 = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      default:
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
    }

    const targetSymbol = resolveSymbol(symbol);
    const result = await withTimeout(
      yahooFinance.chart(targetSymbol, {
        period1: period1.toISOString().split("T")[0],
        interval: "1d",
      }),
      YAHOO_TIMEOUT_MS
    );

    if (!result || !result.quotes || result.quotes.length === 0) {
      return [];
    }

    return result.quotes
      .filter((q) => q && q.close != null && !Number.isNaN(q.close))
      .map((q) => {
        const d = new Date(q.date);
        return {
          timestamp: d.getTime(),
          date: d.toISOString().split("T")[0],
          displayDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          open: Number((q.open || q.close).toFixed(2)),
          high: Number((q.high || Math.max(q.open || q.close, q.close)).toFixed(2)),
          low: Number((q.low || Math.min(q.open || q.close, q.close)).toFixed(2)),
          close: Number(q.close.toFixed(2)),
          volume: q.volume || 0,
        };
      });
  } catch (err) {
    console.log(`Yahoo Replay Chart Error for ${symbol}:`, err.message);
    return [];
  }
};

const searchAndResolveStock = async (query, exchange = "NSE") => {
  if (!query || !query.trim()) return null;
  const rawQuery = query.trim();
  const exch = (exchange || "NSE").toUpperCase();

  // 1. Try direct quote if it already looks like a valid ticker without spaces
  if (!rawQuery.includes(" ")) {
    let directSymbol = rawQuery.toUpperCase();
    if (exch === "NSE" && !directSymbol.endsWith(".NS")) directSymbol += ".NS";
    if (exch === "BSE" && !directSymbol.endsWith(".BO")) directSymbol += ".BO";

    const directQuote = await getQuote(directSymbol);
    if (directQuote && directQuote.price != null) {
      return {
        resolvedSymbol: directSymbol,
        cleanSymbol: directSymbol.replace(/\.(NS|BO)$/, ""),
        quote: directQuote,
        suggestions: [],
      };
    }
  }

  // 2. Search Yahoo Finance for company name or ticker
  try {
    const searchRes = await withTimeout(yahooFinance.search(rawQuery), YAHOO_TIMEOUT_MS);
    const rawList = (searchRes?.quotes || []).filter(
      (item) => item.symbol && (item.quoteType === "EQUITY" || item.typeDisp === "Equity")
    );

    if (rawList.length === 0) {
      return null;
    }

    // Rank candidates matching the selected exchange
    const ranked = rawList.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (exch === "NSE") {
        if (a.symbol.endsWith(".NS")) scoreA += 10;
        if (b.symbol.endsWith(".NS")) scoreB += 10;
      } else if (exch === "BSE") {
        if (a.symbol.endsWith(".BO")) scoreA += 10;
        if (b.symbol.endsWith(".BO")) scoreB += 10;
      } else if (exch === "NYSE") {
        if (["NYQ", "NYSE"].includes(a.exchange)) scoreA += 10;
        if (["NYQ", "NYSE"].includes(b.exchange)) scoreB += 10;
        if (!a.symbol.includes(".")) scoreA += 5;
        if (!b.symbol.includes(".")) scoreB += 5;
      } else if (exch === "NASDAQ") {
        if (["NMS", "NGS", "NCM", "NASDAQ"].includes(a.exchange)) scoreA += 10;
        if (["NMS", "NGS", "NCM", "NASDAQ"].includes(b.exchange)) scoreB += 10;
        if (!a.symbol.includes(".")) scoreA += 5;
        if (!b.symbol.includes(".")) scoreB += 5;
      }

      return scoreB - scoreA;
    });

    const best = ranked[0];
    let bestSymbol = best.symbol;
    if (exch === "NSE" && !bestSymbol.endsWith(".NS")) bestSymbol += ".NS";
    if (exch === "BSE" && !bestSymbol.endsWith(".BO")) bestSymbol += ".BO";

    let quote = await getQuote(bestSymbol);
    if (!quote || quote.price == null) {
      // If the suffix format didn't return a quote, try raw best.symbol
      quote = await getQuote(best.symbol);
      if (quote && quote.price != null) {
        return {
          resolvedSymbol: best.symbol,
          cleanSymbol: best.symbol.replace(/\.(NS|BO)$/, ""),
          quote,
          suggestions: ranked.slice(0, 4).map((r) => ({
            symbol: r.symbol,
            name: r.shortname || r.longname || r.symbol,
            exchange: r.exchange,
          })),
        };
      }
      return null;
    }

    return {
      resolvedSymbol: bestSymbol,
      cleanSymbol: bestSymbol.replace(/\.(NS|BO)$/, ""),
      quote,
      suggestions: ranked.slice(0, 4).map((r) => ({
        symbol: r.symbol,
        name: r.shortname || r.longname || r.symbol,
        exchange: r.exchange,
      })),
    };
  } catch (err) {
    console.log(`Yahoo Search Error for "${rawQuery}":`, err.message);
    return null;
  }
};

module.exports = { getQuote, getHistoricalChart, fetchReplayCandles, searchAndResolveStock };

