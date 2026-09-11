const Holding = require("../models/Holding");
const Stock = require("../models/Stock");
const TakeProfitStopLoss = require("../models/TakeProfitStopLoss");
const { getQuote } = require("../services/yahooService");
const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");

const resolveCurrency = (symbol, stockDoc) =>
  stockDoc?.currency === "USD" || (!symbol.endsWith(".NS") && !symbol.endsWith(".BO")) ? "USD" : "INR";

// ======================= GET PROTECTION RULE =======================
exports.getProtection = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  const rule = await TakeProfitStopLoss.findOne({
    user: req.user.id,
    symbol,
    status: "ACTIVE",
  });

  res.status(200).json({
    success: true,
    protection: rule || null,
  });
});

// ======================= CREATE OR UPDATE PROTECTION RULE =======================
// PUT /api/trade/protection/:symbol
// Body: { takeProfit?, stopLoss? } — already checked for "at least one
// present" by protectionSchema. Every other rule (holding must exist,
// prices on the correct side of the entry price, positivity) is
// server-validated here, since the client-side form is UX only.
exports.setProtection = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const { takeProfit, stopLoss } = req.body;

  const holding = await Holding.findOne({ user: req.user.id, symbol });
  if (!holding || holding.quantity <= 0) {
    throw new ApiError(400, "Buy shares before setting protection.");
  }

  const stockDoc = await Stock.findOne({ symbol });
  const currency = resolveCurrency(symbol, stockDoc);

  // The reference price for validating TP/SL direction must be the live
  // quote — Stock documents don't store a price field at all (quotes are
  // fetched live from Yahoo on every request, same as buy/sell), so this
  // used to silently fall back to avgPrice and validate against the wrong
  // number. Falls back to avgPrice only if the live feed is briefly down.
  let referencePrice = holding.avgPrice;
  try {
    const quote = await getQuote(symbol);
    if (quote?.price) referencePrice = quote.price;
  } catch (_) {
    // live feed unavailable this instant — fall back to avgPrice above
  }

  if (takeProfit != null && takeProfit <= referencePrice) {
    throw new ApiError(400, "Take profit must be above the current price.");
  }
  if (stopLoss != null && stopLoss >= referencePrice) {
    throw new ApiError(400, "Stop loss must be below the current price.");
  }

  const update = {
    user: req.user.id,
    symbol,
    currency,
    status: "ACTIVE",
    triggerReason: null,
    triggeredAt: null,
  };
  // Only overwrite a side the caller actually sent — sending just
  // { stopLoss } shouldn't clear an existing takeProfit, and vice versa.
  if (takeProfit !== undefined) update.takeProfit = takeProfit ?? null;
  if (stopLoss !== undefined) update.stopLoss = stopLoss ?? null;

  const rule = await TakeProfitStopLoss.findOneAndUpdate(
    { user: req.user.id, symbol },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    success: true,
    message: "Protection settings saved.",
    protection: rule,
  });
});

// ======================= REMOVE PROTECTION RULE =======================
exports.deleteProtection = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  await TakeProfitStopLoss.deleteOne({ user: req.user.id, symbol });

  res.status(200).json({
    success: true,
    message: "Protection rule removed.",
  });
});
