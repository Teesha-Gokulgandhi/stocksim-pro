const Stock = require("../models/Stock");
const User = require("../models/User");
const ReplaySession = require("../models/ReplaySession");
const Transaction = require("../models/Transaction");
const { fetchReplayCandles } = require("../services/yahooService");
const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");

const BLIND_NAMES = [
  "ASSET-ALPHA",
  "ASSET-BETA",
  "ASSET-GAMMA",
  "ASSET-DELTA",
  "ASSET-OMEGA",
  "ASSET-PHOENIX",
  "ASSET-NEXUS",
  "ASSET-TITAN",
  "ASSET-VORTEX",
  "ASSET-SOLARIS",
];

// ================= GET REPLAY CANDLES =================
exports.getReplayCandles = asyncHandler(async (req, res) => {
  let { symbol, range = "6M", isBlind = false, market = "IN" } = req.query;
  isBlind = isBlind === "true" || isBlind === true || symbol === "BLIND";

  let actualSymbol = symbol;
  let companyName = "";
  let currency = market === "IN" ? "INR" : "USD";
  let displaySymbol = symbol;

  if (isBlind || !symbol) {
    // Pick a random stock from seeded collection matching the current market
    const filter = market === "US"
      ? { $or: [{ currency: "USD" }, { country: "US" }] }
      : { $or: [{ currency: "INR" }, { symbol: /\.NS$/ }] };

    let count = await Stock.countDocuments(filter);
    let randomStock = null;

    if (count > 0) {
      const randomIdx = Math.floor(Math.random() * count);
      randomStock = await Stock.findOne(filter).skip(randomIdx);
    }
    if (!randomStock) {
      randomStock = await Stock.findOne();
    }
    if (!randomStock) {
      throw new ApiError(404, "No stocks available for practice session");
    }

    actualSymbol = randomStock.symbol;
    isBlind = true;
    const code = BLIND_NAMES[Math.floor(Math.random() * BLIND_NAMES.length)];
    displaySymbol = `${code} #${Math.floor(100 + Math.random() * 900)}`;
    companyName = "Mystery Technical Asset";
    currency = randomStock.currency || (randomStock.symbol.endsWith(".NS") ? "INR" : "USD");
  } else {
    const stockDoc = await Stock.findOne({ symbol: actualSymbol.toUpperCase() });
    if (stockDoc) {
      companyName = stockDoc.companyName;
      currency = stockDoc.currency || (stockDoc.symbol.endsWith(".NS") ? "INR" : "USD");
    } else {
      companyName = actualSymbol;
      currency = actualSymbol.endsWith(".NS") ? "INR" : "USD";
    }
    displaySymbol = actualSymbol;
  }

  const rawCandles = await fetchReplayCandles(actualSymbol, range);
  if (!rawCandles || rawCandles.length < 15) {
    throw new ApiError(503, "Insufficient historical candle data for this asset. Please select another stock.");
  }

  // If blind, sanitize dates and timestamps so user cannot identify the stock from timestamps
  const candles = isBlind
    ? rawCandles.map((c, idx) => ({
        index: idx,
        date: `Day ${idx + 1}`,
        displayDate: `Day ${idx + 1}`,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }))
    : rawCandles.map((c, idx) => ({
        index: idx,
        timestamp: c.timestamp,
        date: c.date,
        displayDate: c.displayDate,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));

  res.status(200).json({
    success: true,
    symbol: actualSymbol,
    displaySymbol,
    companyName,
    currency,
    isBlind,
    range,
    totalCandles: candles.length,
    initialVisibleCandles: Math.min(25, Math.floor(candles.length * 0.25)),
    candles,
  });
});

// ================= SAVE REPLAY SESSION =================
exports.saveReplaySession = asyncHandler(async (req, res) => {
  const {
    symbol,
    displaySymbol,
    isBlind,
    currency,
    initialBalance,
    finalBalance,
    netPnl,
    returnPercent,
    winRate,
    tradesCount,
    winningTrades,
    losingTrades,
    profitFactor,
    grade,
    candlesProcessed,
    trades,
  } = req.body;

  if (!symbol || initialBalance == null || finalBalance == null) {
    throw new ApiError(400, "Incomplete replay session data");
  }

  const session = await ReplaySession.create({
    user: req.user.id,
    symbol,
    displaySymbol: displaySymbol || symbol,
    isBlind: Boolean(isBlind),
    currency: currency || "USD",
    initialBalance: Number(initialBalance),
    finalBalance: Number(finalBalance),
    netPnl: Number(netPnl || 0),
    returnPercent: Number(returnPercent || 0),
    winRate: Number(winRate || 0),
    tradesCount: Number(tradesCount || 0),
    winningTrades: Number(winningTrades || 0),
    losingTrades: Number(losingTrades || 0),
    profitFactor: Number(profitFactor || 0),
    grade: grade || "B",
    candlesProcessed: Number(candlesProcessed || 0),
    trades: Array.isArray(trades) ? trades : [],
  });

  // Update user's persistent practice balance with the session's net P&L.
  // Using findOneAndUpdate with $inc is atomic — avoids a read-modify-save
  // race where two concurrent replay completions could both read the same
  // stale balance and produce an incorrect final value.
  const pnlNum = Number(netPnl || 0);
  let updatedBalance = finalBalance;
  let updatedUser = null;

  if (pnlNum !== 0) {
    const balanceIncrement =
      currency === "INR" ? { balance: pnlNum } : { balanceUSD: pnlNum };

    updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: balanceIncrement },
      { new: true, runValidators: false }
    );

    if (updatedUser) {
      // Clamp to 0 to prevent negatives that slipped through $inc.
      if (currency === "INR" && updatedUser.balance < 0) {
        updatedUser = await User.findByIdAndUpdate(
          req.user.id,
          { $set: { balance: 0 } },
          { new: true, runValidators: false }
        );
      } else if (currency !== "INR" && updatedUser.balanceUSD < 0) {
        updatedUser = await User.findByIdAndUpdate(
          req.user.id,
          { $set: { balanceUSD: 0 } },
          { new: true, runValidators: false }
        );
      }
      updatedBalance =
        currency === "INR" ? updatedUser.balance : updatedUser.balanceUSD;
    }
  } else {
    updatedUser = await User.findById(req.user.id);
    if (updatedUser) {
      updatedBalance =
        currency === "INR" ? updatedUser.balance : updatedUser.balanceUSD;
    }
  }

  // Create an official Transaction entry so it appears in the Order Book / Transactions page
  let transaction = null;
  try {
    transaction = await Transaction.create({
      user: req.user.id,
      symbol: (displaySymbol || symbol).toUpperCase(),
      type: "REPLAY",
      quantity: Number(tradesCount) || (Array.isArray(trades) ? trades.length : 1),
      price: Number(finalBalance),
      currency: currency || "USD",
      netPnl: Number(netPnl || 0),
      returnPercent: Number(returnPercent || 0),
      notes: `Replay Practice: ${grade || "B"}-Tier (${winRate || 0}% Win Rate, ${(netPnl || 0) >= 0 ? "+" : ""}${Number(netPnl || 0).toFixed(2)})`,
    });
  } catch (err) {
    console.error("Failed to log replay transaction:", err);
  }

  res.status(201).json({
    success: true,
    message: "Replay session saved successfully",
    session,
    transaction,
    updatedBalance,
    user: updatedUser
      ? { id: updatedUser._id, balance: updatedUser.balance, balanceUSD: updatedUser.balanceUSD }
      : null,
  });
});

// ================= GET REPLAY HISTORY =================
exports.getReplayHistory = asyncHandler(async (req, res) => {
  const sessions = await ReplaySession.find({ user: req.user.id }).sort({ createdAt: -1 });
  const user = await User.findById(req.user.id);

  // Calculate cumulative stats
  const totalSessions = sessions.length;
  let totalPnl = 0;
  let totalTrades = 0;
  let totalWins = 0;

  sessions.forEach((s) => {
    totalPnl += s.netPnl;
    totalTrades += s.tradesCount;
    totalWins += s.winningTrades;
  });

  const avgWinRate = totalTrades > 0 ? Number(((totalWins / totalTrades) * 100).toFixed(1)) : 0;

  res.status(200).json({
    success: true,
    stats: {
      totalSessions,
      totalPnl: Number(totalPnl.toFixed(2)),
      totalTrades,
      avgWinRate,
      currentBalanceINR: user?.balance ?? 100000,
      currentBalanceUSD: user?.balanceUSD ?? 10000,
    },
    sessions,
  });
});

// ================= GET REPLAY LEADERBOARD =================
exports.getReplayLeaderboard = asyncHandler(async (req, res) => {
  const topSessions = await ReplaySession.find()
    .sort({ returnPercent: -1 })
    .limit(20)
    .populate("user", "name avatarUrl");

  res.status(200).json({
    success: true,
    leaderboard: topSessions,
  });
});
