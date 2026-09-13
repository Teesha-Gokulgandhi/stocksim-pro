const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Holding = require("../models/Holding");
const Stock = require("../models/Stock");
const AppSettings = require("../models/AppSettings");
const AdminAuditLog = require("../models/AdminAuditLog");
const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const { escapeRegex } = require("../utils/escapeRegex");
const { getQuote, searchAndResolveStock } = require("../services/yahooService");
const { buildPaginationMeta } = require("../utils/pagination");
const { getExchangeHoursStatus, resolveRegionalStatus } = require("../utils/marketAccess");

// Shared helper so every sensitive admin action leaves the same shape of
// record. `details` is always built from known, server-controlled values
// (never raw user input) so the audit log itself can't be used to store
// an XSS payload that later renders in the admin table.
const logAdminAction = async (req, { action, targetType, targetId, targetLabel, details }) => {
  await AdminAuditLog.create({
    actor: req.user.id,
    actorEmail: req.user.email,
    action,
    targetType,
    targetId,
    targetLabel,
    details,
  });
};

// ================= MARKET STATUS =================
// GET is intentionally public (no `protect`) — every page that shows a
// Buy/Sell button needs to know this, not just admins.
exports.getMarketStatus = asyncHandler(async (req, res) => {
  const settings = await AppSettings.getSingleton();
  await AppSettings.applyAutomaticHolidayResume(settings);
  const exchangeStatus = getExchangeHoursStatus();
  const marketOpenIN = settings.marketOpenIN ?? true;
  const marketOpenUS = settings.marketOpenUS ?? true;
  const indianStatus = resolveRegionalStatus({
    globalOpen: settings.marketOpen,
    marketOpen: marketOpenIN,
    pauseReason: settings.marketPauseReasonIN,
    overrideUntil: settings.marketOverrideUntilIN,
    sessionOpen: exchangeStatus.isIndianSessionOpen,
    marketLabel: "Indian Market (NSE/BSE)",
    schedule: "09:15-15:30 IST, Monday-Friday",
    message: settings.marketClosedMessageIN,
  });
  const usStatus = resolveRegionalStatus({
    globalOpen: settings.marketOpen,
    marketOpen: marketOpenUS,
    pauseReason: settings.marketPauseReasonUS,
    overrideUntil: settings.marketOverrideUntilUS,
    sessionOpen: exchangeStatus.isUSSessionOpen,
    marketLabel: "US Market (NYSE/Nasdaq)",
    schedule: "09:30-16:00 New York time, Monday-Friday",
    message: settings.marketClosedMessageUS,
  });
  res.status(200).json({
    success: true,
    marketOpen: settings.marketOpen,
    marketClosedMessage: settings.marketClosedMessage,
    marketOpenIN,
    marketPauseReasonIN: settings.marketPauseReasonIN,
    marketClosedMessageIN: settings.marketClosedMessageIN || "Indian Market (NSE/BSE) trading is currently paused by admin.",
    marketOverrideUntilIN: settings.marketOverrideUntilIN,
    marketOpenUS,
    marketPauseReasonUS: settings.marketPauseReasonUS,
    marketClosedMessageUS: settings.marketClosedMessageUS || "US Market (NYSE/Nasdaq) trading is currently paused by admin.",
    marketOverrideUntilUS: settings.marketOverrideUntilUS,
    exchangeStatus,
    effectiveMarketOpenIN: indianStatus.tradingAllowed,
    marketStatusIN: indianStatus.status,
    marketReasonIN: indianStatus.reason,
    marketStatusMessageIN: indianStatus.message,
    effectiveMarketOpenUS: usStatus.tradingAllowed,
    marketStatusUS: usStatus.status,
    marketReasonUS: usStatus.reason,
    marketStatusMessageUS: usStatus.message,
    updatedAt: settings.updatedAt,
  });
});

// PUT is admin-only — this is the actual kill switch for trading.
exports.updateMarketStatus = asyncHandler(async (req, res) => {
  const {
    marketOpen,
    marketClosedMessage,
    marketOpenIN,
    marketClosedMessageIN,
    marketOpenUS,
    marketClosedMessageUS,
    marketPauseReasonIN,
    marketPauseReasonUS,
    marketOverrideHoursIN,
    marketOverrideHoursUS,
  } = req.body;

  const settings = await AppSettings.getSingleton();
  await AppSettings.applyAutomaticHolidayResume(settings);
  const wasOpen = settings.marketOpen;
  const wasOpenIN = settings.marketOpenIN ?? true;
  const wasOpenUS = settings.marketOpenUS ?? true;
  const previousPauseReasonIN = settings.marketPauseReasonIN;
  const previousPauseReasonUS = settings.marketPauseReasonUS;
  const previousMessage = settings.marketClosedMessage;
  const previousMessageIN = settings.marketClosedMessageIN;
  const previousMessageUS = settings.marketClosedMessageUS;

  if (marketOpen !== undefined) {
    settings.marketOpen = marketOpen;
  }
  if (marketClosedMessage !== undefined) {
    settings.marketClosedMessage = marketClosedMessage;
  }

  if (marketOpenIN !== undefined) {
    settings.marketOpenIN = marketOpenIN;
    if (marketOpenIN) {
      settings.marketPauseReasonIN = null;
      settings.marketPauseStartedAtIN = null;
      // Resuming normal schedule control cancels any leftover timed
      // override too, unless this same request is applying a new one.
      if (marketOverrideHoursIN === undefined) settings.marketOverrideUntilIN = null;
    } else {
      const nextReason = marketPauseReasonIN || previousPauseReasonIN || "MAINTENANCE";
      settings.marketPauseReasonIN = nextReason;
      settings.marketOverrideUntilIN = null;
      if (wasOpenIN || previousPauseReasonIN !== nextReason) settings.marketPauseStartedAtIN = new Date();
    }
  }
  if (marketPauseReasonIN !== undefined && marketOpenIN === false) {
    settings.marketPauseReasonIN = marketPauseReasonIN;
  }
  if (marketClosedMessageIN !== undefined) {
    settings.marketClosedMessageIN = marketClosedMessageIN;
  }
  // Temporary Open: explicit admin decision to trade now, so it wins over
  // any pause reason set above in this same request (a stale Maintenance
  // pause should not be able to block an admin who just chose to open it).
  if (marketOverrideHoursIN !== undefined && marketOverrideHoursIN !== null) {
    settings.marketOpenIN = true;
    settings.marketPauseReasonIN = null;
    settings.marketPauseStartedAtIN = null;
    settings.marketOverrideUntilIN = new Date(Date.now() + marketOverrideHoursIN * 60 * 60 * 1000);
  }

  if (marketOpenUS !== undefined) {
    settings.marketOpenUS = marketOpenUS;
    if (marketOpenUS) {
      settings.marketPauseReasonUS = null;
      settings.marketPauseStartedAtUS = null;
      if (marketOverrideHoursUS === undefined) settings.marketOverrideUntilUS = null;
    } else {
      const nextReason = marketPauseReasonUS || previousPauseReasonUS || "MAINTENANCE";
      settings.marketPauseReasonUS = nextReason;
      settings.marketOverrideUntilUS = null;
      if (wasOpenUS || previousPauseReasonUS !== nextReason) settings.marketPauseStartedAtUS = new Date();
    }
  }
  if (marketPauseReasonUS !== undefined && marketOpenUS === false) {
    settings.marketPauseReasonUS = marketPauseReasonUS;
  }
  if (marketClosedMessageUS !== undefined) {
    settings.marketClosedMessageUS = marketClosedMessageUS;
  }
  if (marketOverrideHoursUS !== undefined && marketOverrideHoursUS !== null) {
    settings.marketOpenUS = true;
    settings.marketPauseReasonUS = null;
    settings.marketPauseStartedAtUS = null;
    settings.marketOverrideUntilUS = new Date(Date.now() + marketOverrideHoursUS * 60 * 60 * 1000);
  }

  settings.updatedBy = req.user.id;
  await settings.save();

  if (marketOpen !== undefined && wasOpen !== marketOpen) {
    await logAdminAction(req, {
      action: "MARKET_STATUS_CHANGED",
      targetType: "MARKET",
      targetLabel: "Global Market",
      details: `Global Market set to ${marketOpen ? "OPEN" : "PAUSED"}`,
    });
  }

  if (marketOverrideHoursIN !== undefined && marketOverrideHoursIN !== null) {
    await logAdminAction(req, {
      action: "INDIAN_MARKET_STATUS_CHANGED",
      targetType: "MARKET_IN",
      targetLabel: "Indian Market (NSE/BSE)",
      details: `Indian Market (NSE/BSE) set to TIMED_OPEN until ${settings.marketOverrideUntilIN.toISOString()}`,
    });
  } else if (marketOpenIN !== undefined && wasOpenIN !== marketOpenIN) {
    await logAdminAction(req, {
      action: "INDIAN_MARKET_STATUS_CHANGED",
      targetType: "MARKET_IN",
      targetLabel: "Indian Market (NSE/BSE)",
      details: `Indian Market (NSE/BSE) set to ${marketOpenIN ? "OPEN" : "PAUSED"}`,
    });
  }

  if (marketOverrideHoursUS !== undefined && marketOverrideHoursUS !== null) {
    await logAdminAction(req, {
      action: "US_MARKET_STATUS_CHANGED",
      targetType: "MARKET_US",
      targetLabel: "US Market (NYSE/Nasdaq)",
      details: `US Market (NYSE/Nasdaq) set to TIMED_OPEN until ${settings.marketOverrideUntilUS.toISOString()}`,
    });
  } else if (marketOpenUS !== undefined && wasOpenUS !== marketOpenUS) {
    await logAdminAction(req, {
      action: "US_MARKET_STATUS_CHANGED",
      targetType: "MARKET_US",
      targetLabel: "US Market (NYSE/Nasdaq)",
      details: `US Market (NYSE/Nasdaq) set to ${marketOpenUS ? "OPEN" : "PAUSED"}`,
    });
  }

  if (marketClosedMessage !== undefined && previousMessage !== marketClosedMessage) {
    await logAdminAction(req, {
      action: "MARKET_MESSAGE_UPDATED",
      targetType: "MARKET",
      targetLabel: "Global Market",
      details: "Global market announcement message updated",
    });
  }

  if (marketClosedMessageIN !== undefined && previousMessageIN !== marketClosedMessageIN) {
    await logAdminAction(req, {
      action: "INDIAN_MARKET_MESSAGE_UPDATED",
      targetType: "MARKET_IN",
      targetLabel: "Indian Market (NSE/BSE)",
      details: "Indian Market (NSE/BSE) announcement message updated",
    });
  }

  if (marketClosedMessageUS !== undefined && previousMessageUS !== marketClosedMessageUS) {
    await logAdminAction(req, {
      action: "US_MARKET_MESSAGE_UPDATED",
      targetType: "MARKET_US",
      targetLabel: "US Market (NYSE/Nasdaq)",
      details: "US Market (NYSE/Nasdaq) announcement message updated",
    });
  }

  const exchangeStatus = getExchangeHoursStatus();
  const indianStatus = resolveRegionalStatus({
    globalOpen: settings.marketOpen,
    marketOpen: settings.marketOpenIN ?? true,
    pauseReason: settings.marketPauseReasonIN,
    overrideUntil: settings.marketOverrideUntilIN,
    sessionOpen: exchangeStatus.isIndianSessionOpen,
    marketLabel: "Indian Market (NSE/BSE)",
    schedule: "09:15-15:30 IST, Monday-Friday",
    message: settings.marketClosedMessageIN,
  });
  const usStatus = resolveRegionalStatus({
    globalOpen: settings.marketOpen,
    marketOpen: settings.marketOpenUS ?? true,
    pauseReason: settings.marketPauseReasonUS,
    overrideUntil: settings.marketOverrideUntilUS,
    sessionOpen: exchangeStatus.isUSSessionOpen,
    marketLabel: "US Market (NYSE/Nasdaq)",
    schedule: "09:30-16:00 New York time, Monday-Friday",
    message: settings.marketClosedMessageUS,
  });

  res.status(200).json({
    success: true,
    message: "Market status settings updated successfully",
    marketOpen: settings.marketOpen,
    marketClosedMessage: settings.marketClosedMessage,
    marketOpenIN: settings.marketOpenIN ?? true,
    marketPauseReasonIN: settings.marketPauseReasonIN,
    marketClosedMessageIN: settings.marketClosedMessageIN,
    marketOverrideUntilIN: settings.marketOverrideUntilIN,
    marketOpenUS: settings.marketOpenUS ?? true,
    marketPauseReasonUS: settings.marketPauseReasonUS,
    marketClosedMessageUS: settings.marketClosedMessageUS,
    marketOverrideUntilUS: settings.marketOverrideUntilUS,
    exchangeStatus,
    effectiveMarketOpenIN: indianStatus.tradingAllowed,
    marketStatusIN: indianStatus.status,
    marketReasonIN: indianStatus.reason,
    marketStatusMessageIN: indianStatus.message,
    effectiveMarketOpenUS: usStatus.tradingAllowed,
    marketStatusUS: usStatus.status,
    marketReasonUS: usStatus.reason,
    marketStatusMessageUS: usStatus.message,
    updatedAt: settings.updatedAt,
  });
});

// ================= PLATFORM STATS =================
exports.getStats = asyncHandler(async (req, res) => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    adminCount,
    totalStocks,
    totalStocksIN,
    totalStocksUS,
    totalHoldingsPositions,
    txAgg,
    txLast24h,
    balanceAgg,
    balanceUSDAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: "admin" }),
    Stock.countDocuments(),
    Stock.countDocuments({ country: "IN" }),
    Stock.countDocuments({ country: "US" }),
    Holding.countDocuments({ quantity: { $gt: 0 } }),
    Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          totalVolume: { $sum: { $multiply: ["$quantity", "$price"] } },
        },
      },
    ]),
    Transaction.countDocuments({ createdAt: { $gte: since24h } }),
    User.aggregate([{ $group: { _id: null, totalBalance: { $sum: "$balance" } } }]),
    User.aggregate([{ $group: { _id: null, totalBalanceUSD: { $sum: "$balanceUSD" } } }]),
  ]);

  const mostTraded = await Transaction.aggregate([
    { $group: { _id: "$symbol", trades: { $sum: 1 } } },
    { $sort: { trades: -1 } },
    { $limit: 5 },
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalUsers,
      activeUsers,
      suspendedUsers: totalUsers - activeUsers,
      adminCount,
      totalStocks,
      totalStocksIN,
      totalStocksUS,
      openPositions: totalHoldingsPositions,
      totalTrades: txAgg[0]?.totalTrades || 0,
      totalVolume: Math.round((txAgg[0]?.totalVolume || 0) * 100) / 100,
      tradesLast24h: txLast24h,
      totalVirtualBalanceInPlay: Math.round((balanceAgg[0]?.totalBalance || 0) * 100) / 100,
      totalVirtualBalanceUSDInPlay: Math.round((balanceUSDAgg[0]?.totalBalanceUSD || 0) * 100) / 100,
      mostTradedSymbols: mostTraded.map((m) => ({ symbol: m._id, trades: m.trades })),
    },
  });
});

// ================= USER MANAGEMENT =================
exports.getUsers = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.validatedQuery;
  const skip = (page - 1) * limit;

  const filter = search
    ? {
        $or: [
          { name: { $regex: escapeRegex(search), $options: "i" } },
          { email: { $regex: escapeRegex(search), $options: "i" } },
        ],
      }
    : {};

  const [users, total, allHoldings] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
    Holding.find({ quantity: { $gt: 0 } }),
  ]);

  const distinctSymbols = [...new Set(allHoldings.map((h) => h.symbol))];
  const quoteMap = {};
  await Promise.all(
    distinctSymbols.map(async (sym) => {
      try {
        const q = await getQuote(sym);
        if (q) quoteMap[sym] = q.price;
      } catch (e) {}
    })
  );

  const userHoldingsMap = {};
  allHoldings.forEach((h) => {
    const uId = h.user.toString();
    if (!userHoldingsMap[uId]) userHoldingsMap[uId] = [];
    userHoldingsMap[uId].push(h);
  });

  const enrichedUsers = users.map((u) => {
    const uObj = u.toObject();
    const uHoldings = userHoldingsMap[u._id.toString()] || [];
    let inrInvested = 0;
    let inrCurrent = 0;
    let usdInvested = 0;
    let usdCurrent = 0;
    let inCount = 0;
    let usCount = 0;

    for (const h of uHoldings) {
      const isUSD = h.currency === "USD" || (!h.symbol?.endsWith(".NS") && !h.symbol?.endsWith(".BO"));
      const curPrice = quoteMap[h.symbol] ?? h.avgPrice;
      const inv = h.avgPrice * h.quantity;
      const cur = curPrice * h.quantity;
      if (isUSD) {
        usdInvested += inv;
        usdCurrent += cur;
        usCount++;
      } else {
        inrInvested += inv;
        inrCurrent += cur;
        inCount++;
      }
    }

    const inrNetWorth = (u.balance || 0) + inrCurrent;
    const usdNetWorth = (u.balanceUSD ?? 10000) + usdCurrent;

    const inrProfit = Math.round((inrCurrent - inrInvested) * 100) / 100;
    const inrRoi = inrInvested > 0 ? Math.round(((inrCurrent - inrInvested) / inrInvested) * 10000) / 100 : 0;
    const usdProfit = Math.round((usdCurrent - usdInvested) * 100) / 100;
    const usdRoi = usdInvested > 0 ? Math.round(((usdCurrent - usdInvested) / usdInvested) * 10000) / 100 : 0;

    uObj.portfolioStats = {
      inr: {
        invested: inrInvested,
        currentHoldings: inrCurrent,
        netWorth: inrNetWorth,
        profit: inrProfit,
        roi: inrRoi,
        utilization: Math.round((inrCurrent / (inrNetWorth || 1)) * 100),
        stocksCount: inCount,
      },
      usd: {
        invested: usdInvested,
        currentHoldings: usdCurrent,
        netWorth: usdNetWorth,
        profit: usdProfit,
        roi: usdRoi,
        utilization: Math.round((usdCurrent / (usdNetWorth || 1)) * 100),
        stocksCount: usCount,
      },
    };

    return uObj;
  });

  res.status(200).json({
    success: true,
    users: enrichedUsers,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// Support/investigation view — a single user's balance, holdings, and
// recent trades in one place, e.g. to answer "why does this account look
// wrong". Deliberately read-only; changes happen through the dedicated
// role/status/balance endpoints below, each of which is audit-logged.
exports.getUserDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  const [holdings, recentTransactions, allStocks] = await Promise.all([
    Holding.find({ user: id, quantity: { $gt: 0 } }),
    Transaction.find({ user: id }).sort({ createdAt: -1 }).limit(20),
    Stock.find({}),
  ]);

  const stockMap = {};
  allStocks.forEach((s) => {
    stockMap[s.symbol] = s;
  });

  const enrichedHoldings = [];
  let inrInvested = 0;
  let inrCurrent = 0;
  let usdInvested = 0;
  let usdCurrent = 0;

  for (const h of holdings) {
    const isUSD = h.currency === "USD" || (!h.symbol?.endsWith(".NS") && !h.symbol?.endsWith(".BO"));
    const stockInfo = stockMap[h.symbol];
    let liveQuote = null;
    try {
      liveQuote = await getQuote(h.symbol);
    } catch (e) {}

    const curPrice = liveQuote?.price ?? h.avgPrice;
    const invested = h.avgPrice * h.quantity;
    const current = curPrice * h.quantity;
    const pl = current - invested;
    const plPercent = invested > 0 ? (pl / invested) * 100 : 0;

    if (isUSD) {
      usdInvested += invested;
      usdCurrent += current;
    } else {
      inrInvested += invested;
      inrCurrent += current;
    }

    enrichedHoldings.push({
      _id: h._id,
      symbol: h.symbol,
      companyName: stockInfo?.companyName || h.symbol,
      sector: stockInfo?.sector || "General",
      currency: isUSD ? "USD" : "INR",
      quantity: h.quantity,
      avgPrice: h.avgPrice,
      currentPrice: curPrice,
      investedValue: invested,
      currentValue: current,
      pnl: pl,
      pnlPercent: plPercent,
    });
  }

  const inrCash = user.balance || 0;
  const usdCash = user.balanceUSD ?? 10000;
  const inrNetWorth = inrCash + inrCurrent;
  const usdNetWorth = usdCash + usdCurrent;

  const inrProfit = Math.round((inrCurrent - inrInvested) * 100) / 100;
  const inrRoi = inrInvested > 0 ? Math.round(((inrCurrent - inrInvested) / inrInvested) * 10000) / 100 : 0;
  const usdProfit = Math.round((usdCurrent - usdInvested) * 100) / 100;
  const usdRoi = usdInvested > 0 ? Math.round(((usdCurrent - usdInvested) / usdInvested) * 10000) / 100 : 0;

  const portfolioSummary = {
    inr: {
      cash: inrCash,
      invested: inrInvested,
      currentHoldings: inrCurrent,
      totalNetWorth: inrNetWorth,
      overallPL: inrProfit,
      overallPLPercent: inrRoi,
    },
    usd: {
      cash: usdCash,
      invested: usdInvested,
      currentHoldings: usdCurrent,
      totalNetWorth: usdNetWorth,
      overallPL: usdProfit,
      overallPLPercent: usdRoi,
    },
  };

  res.status(200).json({
    success: true,
    user,
    holdings: enrichedHoldings,
    recentTransactions,
    portfolioSummary,
  });
});

exports.updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (id === req.user.id && role !== "admin") {
    throw new ApiError(400, "You can't remove your own admin access");
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true });
  if (!user) throw new ApiError(404, "User not found");

  await logAdminAction(req, {
    action: "USER_ROLE_CHANGED",
    targetType: "USER",
    targetId: user._id,
    targetLabel: user.email,
    details: `Role changed to ${role}`,
  });

  res.status(200).json({ success: true, message: `Role updated to ${role}`, user });
});

exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (id === req.user.id && !isActive) {
    throw new ApiError(400, "You can't suspend your own account");
  }

  const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!user) throw new ApiError(404, "User not found");

  await logAdminAction(req, {
    action: "USER_STATUS_CHANGED",
    targetType: "USER",
    targetId: user._id,
    targetLabel: user.email,
    details: isActive ? "Account reactivated" : "Account suspended",
  });

  res.status(200).json({
    success: true,
    message: isActive ? "User reactivated" : "User suspended",
    user,
  });
});

// Resets a user's virtual balance to a specific amount. This is play
// money, not a real financial transaction, but it's still audit-logged
// like every other admin write — an unexplained balance jump is exactly
// the kind of thing a user might (rightly) ask support about later.
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    throw new ApiError(400, "You cannot delete your own admin account");
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  await Promise.all([
    User.findByIdAndDelete(id),
    Holding.deleteMany({ user: id }),
    Transaction.deleteMany({ user: id }),
  ]);

  await logAdminAction(req, {
    action: "USER_DELETED",
    targetType: "USER",
    targetId: id,
    targetLabel: user.email,
    details: `Deleted user ${user.name} (${user.email}) and associated holdings/transactions`,
  });

  res.status(200).json({ success: true, message: `User ${user.email} deleted successfully` });
});

exports.resetUserBalance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { balance, balanceUSD, addBalance, addBalanceUSD, fullReset, resetHoldings } = req.body;

  if (fullReset) {
    const user = await User.findByIdAndUpdate(
      id,
      { balance: 100000, balanceUSD: 10000 },
      { new: true }
    );
    if (!user) throw new ApiError(404, "User not found");

    await Promise.all([
      Holding.deleteMany({ user: id }),
      Transaction.deleteMany({ user: id }),
      TakeProfitStopLoss.deleteMany({ user: id }),
    ]);

    await logAdminAction(req, {
      action: "USER_BALANCE_RESET",
      targetType: "USER",
      targetId: user._id,
      targetLabel: user.email,
      details: "Full A-to-Z Account Reset: Holdings & transactions cleared, balance restored to ₹1,00,000 INR & $10,000 USD",
    });

    return res.status(200).json({
      success: true,
      message: `Full A-to-Z reset complete for ${user.email}`,
      user,
    });
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  const detailsList = [];

  if (addBalance !== undefined && addBalance > 0) {
    user.balance = Math.max(0, (user.balance || 0) + Number(addBalance));
    detailsList.push(`Added ₹${Number(addBalance).toLocaleString("en-IN")} INR cash margin (New balance: ₹${user.balance.toLocaleString("en-IN")})`);
  } else if (balance !== undefined) {
    user.balance = Number(balance);
    detailsList.push(`INR margin set to ₹${user.balance.toLocaleString("en-IN")}`);
  }

  if (addBalanceUSD !== undefined && addBalanceUSD > 0) {
    user.balanceUSD = Math.max(0, (user.balanceUSD ?? 10000) + Number(addBalanceUSD));
    detailsList.push(`Added $${Number(addBalanceUSD).toLocaleString("en-US")} USD cash margin (New balance: $${user.balanceUSD.toLocaleString("en-US")})`);
  } else if (balanceUSD !== undefined) {
    user.balanceUSD = Number(balanceUSD);
    detailsList.push(`USD margin set to $${user.balanceUSD.toLocaleString("en-US")}`);
  }

  await user.save();

  if (resetHoldings) {
    await Holding.deleteMany({ user: id });
    detailsList.push("all stock positions cleared");
  }

  await logAdminAction(req, {
    action: "USER_BALANCE_RESET",
    targetType: "USER",
    targetId: user._id,
    targetLabel: user.email,
    details: detailsList.join(", ") || "Margin updated",
  });

  res.status(200).json({ success: true, message: "Margin updated successfully", user });
});

// ================= AUDIT LOG =================
exports.getAuditLog = asyncHandler(async (req, res) => {
  const { page, limit } = req.validatedQuery;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AdminAuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    AdminAuditLog.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    logs,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// ================= STOCK MANAGEMENT =================
// Deliberately separate from the public /api/stocks routes — those are
// read-only for everyone; these are the write path and admin-only.
exports.verifyStockSymbol = asyncHandler(async (req, res) => {
  let { symbol } = req.params;
  const exchange = (req.query.exchange || "NSE").toUpperCase();
  symbol = decodeURIComponent(symbol).trim();

  const searchResult = await searchAndResolveStock(symbol, exchange);
  if (!searchResult || !searchResult.quote || searchResult.quote.price == null) {
    return res.status(200).json({
      success: false,
      symbol,
      message: `Could not find live quote or matching company on Yahoo Finance for "${symbol}". Try entering the exact ticker symbol (e.g. SNOW, AAPL, TATAPOWER) or company name.`,
    });
  }

  const { resolvedSymbol, cleanSymbol, quote, suggestions } = searchResult;
  const isAutoResolved =
    resolvedSymbol.toUpperCase() !== symbol.toUpperCase() &&
    cleanSymbol.toUpperCase() !== symbol.toUpperCase();

  return res.status(200).json({
    success: true,
    symbol: resolvedSymbol,
    cleanSymbol,
    autoResolved: isAutoResolved,
    originalInput: symbol,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    shortName: quote.shortName || quote.longName || cleanSymbol,
    currency: quote.currency || (resolvedSymbol.endsWith(".NS") || resolvedSymbol.endsWith(".BO") ? "INR" : "USD"),
    high: quote.high,
    low: quote.low,
    open: quote.open,
    previousClose: quote.previousClose,
    volume: quote.volume,
    marketCap: quote.marketCap,
    suggestions: suggestions || [],
  });
});

exports.createStock = asyncHandler(async (req, res) => {
  let { symbol, companyName, sector, exchange, country, currency, logo } = req.body;

  exchange = (exchange || "NSE").toUpperCase();
  symbol = symbol.trim().toUpperCase();

  // If the admin typed a company name or query with spaces, resolve it automatically
  if (symbol.includes(" ")) {
    const resolved = await searchAndResolveStock(symbol, exchange);
    if (resolved && resolved.resolvedSymbol) {
      symbol = resolved.resolvedSymbol;
      if (!companyName && resolved.quote?.shortName) {
        companyName = resolved.quote.shortName;
      }
    }
  }

  if (exchange === "NSE" && !symbol.endsWith(".NS")) {
    symbol = `${symbol}.NS`;
  } else if (exchange === "BSE" && !symbol.endsWith(".BO")) {
    symbol = `${symbol}.BO`;
  }

  if (!country) {
    country = exchange === "NSE" || exchange === "BSE" ? "IN" : "US";
  }
  if (!currency) {
    currency = country === "IN" ? "INR" : "USD";
  }

  const existing = await Stock.findOne({ symbol });
  if (existing) {
    throw new ApiError(409, `${symbol} is already listed on ${existing.exchange}`);
  }

  const stock = await Stock.create({ symbol, companyName, sector, exchange, country, currency, logo });

  await logAdminAction(req, {
    action: "STOCK_CREATED",
    targetType: "STOCK",
    targetLabel: symbol,
    details: `Listed ${symbol} (${companyName}) on ${exchange} [${country}/${currency}]`,
  });

  res.status(201).json({ success: true, message: `${symbol} successfully added to the market`, stock });
});

exports.updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body; // validated by zod, all fields optional

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  // If the symbol itself is being changed, make sure it doesn't collide
  // with another stock's symbol.
  if (updates.symbol) {
    const clash = await Stock.findOne({ symbol: updates.symbol, _id: { $ne: id } });
    if (clash) throw new ApiError(409, `${updates.symbol} is already listed`);
  }

  const stock = await Stock.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
  if (!stock) throw new ApiError(404, "Stock not found");

  await logAdminAction(req, {
    action: "STOCK_UPDATED",
    targetType: "STOCK",
    targetId: stock._id,
    targetLabel: stock.symbol,
    details: `Updated ${Object.keys(updates).join(", ")}`,
  });

  res.status(200).json({ success: true, message: "Stock updated", stock });
});

exports.deleteStock = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const stock = await Stock.findById(id);
  if (!stock) throw new ApiError(404, "Stock not found");

  // Deleting the listing doesn't touch existing holdings/transactions —
  // those are historical records of trades that already happened, and
  // removing a stock from the tradable list shouldn't rewrite history or
  // silently vanish someone's portfolio position.
  const openPositions = await Holding.countDocuments({
    symbol: stock.symbol,
    quantity: { $gt: 0 },
  });
  if (openPositions > 0) {
    throw new ApiError(
      409,
      `${stock.symbol} has ${openPositions} open user position(s) — can't delist it while users are still holding it.`
    );
  }

  await Stock.deleteOne({ _id: id });

  await logAdminAction(req, {
    action: "STOCK_DELETED",
    targetType: "STOCK",
    targetId: stock._id,
    targetLabel: stock.symbol,
    details: `Delisted ${stock.symbol}`,
  });

  res.status(200).json({ success: true, message: `${stock.symbol} removed` });
});
