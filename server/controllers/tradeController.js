const mongoose = require("mongoose");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Transaction = require("../models/Transaction");
const Stock = require("../models/Stock");
const AppSettings = require("../models/AppSettings");
const TakeProfitStopLoss = require("../models/TakeProfitStopLoss");
const { getQuote } = require("../services/yahooService");
const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const { getExchangeHoursStatus, resolveRegionalStatus } = require("../utils/marketAccess");

// Concurrent buy/sell requests for the same user were previously read the
// balance, then written it back later — two requests in flight could both
// pass the balance check and overdraw the wallet. Everything below uses
// atomic, guarded updates (and a transaction where multiple documents
// change together) so that can't happen anymore.

// Uses the same resolver the admin panel and public status endpoint use
// (server/utils/marketAccess.js), so a Temporary Open override — or any
// future status rule — can never be honored in one place and silently
// ignored in another. A client showing "OPEN" is meaningless if this
// check disagrees; this is what actually decides whether an order executes.
const assertMarketOpen = async (isUSD = false) => {
  const settings = await AppSettings.getSingleton();
  await AppSettings.applyAutomaticHolidayResume(settings);

  if (!settings.marketOpen) {
    throw new ApiError(403, settings.marketClosedMessage);
  }

  const exchangeStatus = getExchangeHoursStatus();
  const regionalStatus = isUSD
    ? resolveRegionalStatus({
        globalOpen: settings.marketOpen,
        marketOpen: settings.marketOpenUS ?? true,
        pauseReason: settings.marketPauseReasonUS,
        overrideUntil: settings.marketOverrideUntilUS,
        sessionOpen: exchangeStatus.isUSSessionOpen,
        marketLabel: "US Market (NYSE/Nasdaq)",
        schedule: "09:30-16:00 New York time, Monday-Friday",
        message:
          settings.marketClosedMessageUS || "US Market (NYSE/Nasdaq) trading is currently paused by admin.",
      })
    : resolveRegionalStatus({
        globalOpen: settings.marketOpen,
        marketOpen: settings.marketOpenIN ?? true,
        pauseReason: settings.marketPauseReasonIN,
        overrideUntil: settings.marketOverrideUntilIN,
        sessionOpen: exchangeStatus.isIndianSessionOpen,
        marketLabel: "Indian Market (NSE/BSE)",
        schedule: "09:15-15:30 IST, Monday-Friday",
        message:
          settings.marketClosedMessageIN || "Indian Market (NSE/BSE) trading is currently paused by admin.",
      });

  if (!regionalStatus.tradingAllowed) {
    throw new ApiError(403, regionalStatus.message || regionalStatus.reason);
  }
};

const withTransactionIfSupported = async (fn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    return await fn(null);
  }

  try {
    let result;
    let success = false;
    try {
      await session.withTransaction(async () => {
        result = await fn(session);
        success = true;
      });
    } catch (txErr) {
      const msg = String(txErr?.message || "");
      if (
        msg.includes("replica set") ||
        msg.includes("Transaction numbers are only allowed") ||
        msg.includes("standalone") ||
        msg.includes("Transaction")
      ) {
        return await fn(null);
      }
      throw txErr;
    }
    if (success) return result;
    return await fn(null);
  } finally {
    if (session) {
      try {
        session.endSession();
      } catch (_) {}
    }
  }
};

// ======================= BUY STOCK =======================
exports.buyStock = asyncHandler(async (req, res) => {
  const { symbol, quantity } = req.body; // already validated + normalized by zod

  const stockDoc = await Stock.findOne({ symbol });
  const isUSD = stockDoc?.currency === "USD" || (!symbol.endsWith(".NS") && !symbol.endsWith(".BO"));

  await assertMarketOpen(isUSD);
  const currency = isUSD ? "USD" : "INR";
  const balanceField = isUSD ? "balanceUSD" : "balance";
  const currencySymbol = isUSD ? "$" : "₹";

  const quote = await getQuote(symbol);
  if (!quote || !quote.price) {
    throw new ApiError(400, "Unable to fetch stock price. Try again shortly.");
  }
  const currentPrice = quote.price;
  const totalCost = Number((currentPrice * quantity).toFixed(2));

  let result;
  try {
    result = await withTransactionIfSupported(async (session) => {
      // Atomic: only deducts appropriate currency balance if it's still sufficient at write time.
      const userUpdateQuery = User.findOneAndUpdate(
        { _id: req.user.id, [balanceField]: { $gte: totalCost } },
        { $inc: { [balanceField]: -totalCost } },
        { new: true }
      );
      if (session) userUpdateQuery.session(session);
      const user = await userUpdateQuery;

      if (!user) {
        const existQuery = User.exists({ _id: req.user.id });
        if (session) existQuery.session(session);
        const exists = await existQuery;
        if (!exists) throw new ApiError(404, "User not found");
        throw new ApiError(400, `Insufficient ${currency} balance. Need ${currencySymbol}${totalCost.toLocaleString()}`);
      }

      const holdingQuery = Holding.findOne({ user: user._id, symbol });
      if (session) holdingQuery.session(session);
      let holding = await holdingQuery;

      if (!holding) {
        holding = new Holding({
          user: user._id,
          symbol,
          quantity,
          avgPrice: currentPrice,
          currency,
        });
      } else {
        const totalQty = holding.quantity + quantity;
        const totalCostInvested = holding.avgPrice * holding.quantity + currentPrice * quantity;
        holding.avgPrice = Number((totalCostInvested / totalQty).toFixed(2));
        holding.quantity = totalQty;
        holding.currency = currency;
      }
      await holding.save(session ? { session } : {});
      // Buying more of a stock never touches an existing protection rule —
      // TP/SL is only ever set from the stock details page (see
      // protectionController). This intentionally does not read or write
      // TakeProfitStopLoss at all.

      const [newTx] = await Transaction.create(
        [{
          user: user._id,
          symbol,
          type: "BUY",
          quantity,
          price: currentPrice,
          currency,
          netPnl: 0,
          returnPercent: 0,
          notes: ""
        }],
        session ? { session } : {}
      );

      return {
        balance: user.balance,
        balanceUSD: user.balanceUSD ?? 10000,
        holding,
        transaction: newTx,
      };
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, "That trade couldn't be completed — please try again.");
    }
    throw err;
  }

  res.status(201).json({
    success: true,
    message: `Purchased ${quantity} shares of ${symbol} for ${currencySymbol}${totalCost.toLocaleString()}`,
    balance: Number(result.balance.toFixed(2)),
    balanceUSD: Number((result.balanceUSD || 0).toFixed(2)),
    currency,
    holding: result.holding,
    transaction: result.transaction,
  });
});

const EXIT_NOTES = {
  MANUAL: "Manual sell",
  TAKE_PROFIT: "Take profit triggered",
  STOP_LOSS: "Stop loss triggered",
};

// Shared by the HTTP sell endpoint (exitReason "MANUAL") and the
// background protection worker (exitReason "TAKE_PROFIT" / "STOP_LOSS").
// Kept outside the HTTP layer so the worker can call it directly without
// going through zod/req/res, using the exact same balance/holding/P&L
// logic either way — one code path, no chance of the two drifting apart.
//
// executionPrice lets the worker pass in the quote it already fetched for
// this poll cycle instead of fetching it again per-holding.
async function performSell({ userId, symbol, quantity, exitReason = "MANUAL", executionPrice = null }) {
  const stockDoc = await Stock.findOne({ symbol });
  const isUSD = stockDoc?.currency === "USD" || (!symbol.endsWith(".NS") && !symbol.endsWith(".BO"));

  await assertMarketOpen(isUSD);
  const currency = isUSD ? "USD" : "INR";
  const balanceField = isUSD ? "balanceUSD" : "balance";

  let currentPrice = executionPrice;
  if (!currentPrice) {
    const quote = await getQuote(symbol);
    if (!quote || !quote.price) {
      throw new ApiError(400, "Unable to fetch stock price. Try again shortly.");
    }
    currentPrice = quote.price;
  }
  const totalAmount = Number((currentPrice * quantity).toFixed(2));

  const result = await withTransactionIfSupported(async (session) => {
    // Atomic: only decrements shares if enough are still held at write time.
    const holdingUpdateQuery = Holding.findOneAndUpdate(
      { user: userId, symbol, quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
      { new: true }
    );
    if (session) holdingUpdateQuery.session(session);
    const holding = await holdingUpdateQuery;

    if (!holding) {
      const ownedQuery = Holding.findOne({ user: userId, symbol });
      if (session) ownedQuery.session(session);
      const owned = await ownedQuery;
      if (!owned) throw new ApiError(404, "You don't own this stock");
      throw new ApiError(400, "Not enough shares to sell");
    }

    // referenceAvgPrice is captured before any deletion below, from the
    // pre-sell average price — the same average is used whether this is a
    // partial or full exit, since remaining shares (if any) keep it too.
    const referenceAvgPrice = holding.avgPrice;
    const netPnl = Number((quantity * (currentPrice - referenceAvgPrice)).toFixed(2));
    const returnPercent =
      referenceAvgPrice > 0 ? Number(((netPnl / (quantity * referenceAvgPrice)) * 100).toFixed(2)) : 0;

    const fullyExited = holding.quantity === 0;
    if (fullyExited) {
      const deleteQuery = Holding.deleteOne({ _id: holding._id });
      if (session) deleteQuery.session(session);
      await deleteQuery;

      // The position this rule was protecting no longer exists — cancel it
      // rather than leaving an orphaned ACTIVE rule the worker would keep
      // polling forever.
      const cancelQuery = TakeProfitStopLoss.updateOne(
        { user: userId, symbol, status: "ACTIVE" },
        { $set: { status: "CANCELLED" } }
      );
      if (session) cancelQuery.session(session);
      await cancelQuery;
    }

    const userUpdateQuery = User.findOneAndUpdate(
      { _id: userId },
      { $inc: { [balanceField]: totalAmount } },
      { new: true }
    );
    if (session) userUpdateQuery.session(session);
    const user = await userUpdateQuery;

    const [sellTx] = await Transaction.create(
      [{
        user: userId,
        symbol,
        type: "SELL",
        quantity,
        price: currentPrice,
        currency,
        netPnl,
        returnPercent,
        referenceAvgPrice,
        exitReason,
        notes: EXIT_NOTES[exitReason] || EXIT_NOTES.MANUAL,
      }],
      session ? { session } : {}
    );

    return {
      balance: user.balance,
      balanceUSD: user.balanceUSD ?? 10000,
      holding: fullyExited ? null : holding,
      transaction: sellTx,
      currency,
      currentPrice,
      totalAmount,
    };
  });

  return result;
}
exports.performSell = performSell;

// ======================= SELL STOCK =======================
exports.sellStock = asyncHandler(async (req, res) => {
  const { symbol, quantity } = req.body;

  const result = await performSell({ userId: req.user.id, symbol, quantity, exitReason: "MANUAL" });
  const currencySymbol = result.currency === "USD" ? "$" : "₹";

  res.status(200).json({
    success: true,
    message: `Sold ${quantity} shares of ${symbol} for ${currencySymbol}${result.totalAmount.toLocaleString()}`,
    balance: Number(result.balance.toFixed(2)),
    balanceUSD: Number((result.balanceUSD || 0).toFixed(2)),
    currency: result.currency,
    holding: result.holding,
    transaction: result.transaction,
  });
});

// ======================= GET HOLDING =======================
exports.getHolding = asyncHandler(async (req, res) => {
  const { symbol } = req.params;

  const holding = await Holding.findOne({
    user: req.user.id,
    symbol: symbol.toUpperCase(),
  });

  res.status(200).json({
    success: true,
    holding: holding || null,
  });
});
