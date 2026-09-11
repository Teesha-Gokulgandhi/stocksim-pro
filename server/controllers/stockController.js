const Stock = require("../models/Stock");
const { getQuote, getHistoricalChart } = require("../services/yahooService");
const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const { parsePagination, buildPaginationMeta } = require("../utils/pagination");

// ================= GET ALL STOCKS (no live prices) =================
exports.getAllStocks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 100);
  const filter = {};
  if (req.query.country) {
    filter.country = req.query.country.toUpperCase();
  }

  const [stocks, total] = await Promise.all([
    Stock.find(filter).sort({ companyName: 1 }).skip(skip).limit(limit),
    Stock.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: stocks.length,
    stocks,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// ================= GET LIVE STOCKS (with Yahoo quotes) =================
exports.getLiveStocks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 100);
  const filter = {};
  if (req.query.country) {
    filter.country = req.query.country.toUpperCase();
  }

  const [stocks, total] = await Promise.all([
    Stock.find(filter).sort({ companyName: 1 }).skip(skip).limit(limit),
    Stock.countDocuments(filter),
  ]);

  // Quotes are cached (see yahooService), so this is cheap on cache hits.
  // allSettled means one slow/broken symbol can't take down the whole page.
  const settled = await Promise.allSettled(
    stocks.map(async (stock) => {
      const quote = await getQuote(stock.symbol);

      return {
        _id: stock._id,
        symbol: stock.symbol,
        companyName: stock.companyName,
        sector: stock.sector,
        exchange: stock.exchange,
        country:
          stock.country ||
          (["NSE", "BSE"].includes(stock.exchange) || stock.symbol.endsWith(".NS") || stock.symbol.endsWith(".BO")
            ? "IN"
            : "US"),
        currency:
          stock.currency ||
          (["NSE", "BSE"].includes(stock.exchange) || stock.symbol.endsWith(".NS") || stock.symbol.endsWith(".BO")
            ? "INR"
            : "USD"),
        logo: stock.logo,
        currentPrice: quote ? quote.price : (stock.currentPrice || 0),
        change: quote ? quote.change : 0,
        changePercent: quote ? quote.changePercent : 0,
        open: quote ? quote.open : (stock.currentPrice || 0),
        high: quote ? quote.high : (stock.currentPrice || 0),
        low: quote ? quote.low : (stock.currentPrice || 0),
        previousClose: quote ? quote.previousClose : (stock.currentPrice || 0),
        volume: quote ? quote.volume : 0,
        avgVolume: quote ? quote.avgVolume : (quote ? quote.volume : 0),
        marketCap: quote ? quote.marketCap : 0,
        fiftyTwoWeekLow: quote ? quote.fiftyTwoWeekLow : (quote ? quote.low : (stock.currentPrice || 0)),
        fiftyTwoWeekHigh: quote ? quote.fiftyTwoWeekHigh : (quote ? quote.high : (stock.currentPrice || 0)),
        pe: quote ? quote.pe : null,
        eps: quote ? quote.eps : null,
        dividendYield: quote ? quote.dividendYield : null,
        fiftyDayAverage: quote ? quote.fiftyDayAverage : null,
        twoHundredDayAverage: quote ? quote.twoHundredDayAverage : null,
      };
    })
  );

  const liveStocks = settled
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value);

  res.status(200).json({
    success: true,
    count: liveStocks.length,
    stocks: liveStocks,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// ================= GET SINGLE STOCK =================
exports.getStockBySymbol = asyncHandler(async (req, res) => {
  const { symbol } = req.params; // normalized to uppercase by zod

  const stock = await Stock.findOne({ symbol });
  if (!stock) {
    throw new ApiError(404, "Stock not found");
  }

  const quote = await getQuote(symbol);
  if (!quote) {
    throw new ApiError(404, "Live market data not available");
  }

  res.status(200).json({
    success: true,
    stock: {
      _id: stock._id,
      symbol: stock.symbol,
      companyName: stock.companyName,
      sector: stock.sector,
      exchange: stock.exchange,
      country:
        stock.country ||
        (["NSE", "BSE"].includes(stock.exchange) || stock.symbol.endsWith(".NS") || stock.symbol.endsWith(".BO")
          ? "IN"
          : "US"),
      currency:
        stock.currency ||
        (["NSE", "BSE"].includes(stock.exchange) || stock.symbol.endsWith(".NS") || stock.symbol.endsWith(".BO")
          ? "INR"
          : "USD"),
      logo: stock.logo,
      currentPrice: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      previousClose: quote.previousClose,
      volume: quote.volume,
      avgVolume: quote.avgVolume || quote.volume || 0,
      marketCap: quote.marketCap,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? quote.low ?? quote.price,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? quote.high ?? quote.price,
      pe: quote.pe,
      eps: quote.eps,
      dividendYield: quote.dividendYield,
      fiftyDayAverage: quote.fiftyDayAverage,
      twoHundredDayAverage: quote.twoHundredDayAverage,
    },
  });
});

// ================= GET STOCK HISTORY (Chart data) =================
exports.getStockHistory = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  const range = (req.query.range || "1M").toUpperCase();

  const stock = await Stock.findOne({ symbol });
  if (!stock) {
    throw new ApiError(404, "Stock not found");
  }

  const data = await getHistoricalChart(symbol, range);

  res.status(200).json({
    success: true,
    symbol,
    range,
    data,
  });
});

