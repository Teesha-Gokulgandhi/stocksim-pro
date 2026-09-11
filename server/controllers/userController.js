const bcrypt = require("bcrypt");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Transaction = require("../models/Transaction");
const Stock = require("../models/Stock");
const TakeProfitStopLoss = require("../models/TakeProfitStopLoss");
const { getQuote } = require("../services/yahooService");
const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const { parsePagination, buildPaginationMeta } = require("../utils/pagination");

exports.getPortfolio = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");

  const holdings = await Holding.find({ user: req.user.id });

  // TP/SL now lives in its own collection (see TakeProfitStopLoss model),
  // not on the holding itself. Attach each holding's ACTIVE rule (if any)
  // so the portfolio table can keep showing TP/SL columns without the
  // client needing a separate request per row.
  const rules = await TakeProfitStopLoss.find({
    user: req.user.id,
    symbol: { $in: holdings.map((h) => h.symbol) },
    status: "ACTIVE",
  });
  const ruleBySymbol = Object.fromEntries(rules.map((r) => [r.symbol, r]));

  const holdingsWithProtection = holdings.map((h) => {
    const rule = ruleBySymbol[h.symbol];
    return {
      ...h.toObject(),
      takeProfit: rule?.takeProfit ?? null,
      stopLoss: rule?.stopLoss ?? null,
    };
  });

  res.json({
    success: true,
    balance: user.balance,
    balanceUSD: user.balanceUSD ?? 10000,
    holdings: holdingsWithProtection,
  });
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [transactions, total] = await Promise.all([
    Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments({ user: req.user.id }),
  ]);

  res.status(200).json({
    success: true,
    transactions,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");

  res.status(200).json({ success: true, user });
});

// Adds virtual funds to the user's own balance. Bounded per-request by
// zod (max ₹5,00,000) and covered by the global rate limiter — it's play
// money, not a real financial transaction, so the goal here is just
// preventing silly/broken values, not fraud prevention.
exports.deposit = asyncHandler(async (req, res) => {
  const { amount } = req.body; // validated by zod

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $inc: { balance: amount } },
    { new: true }
  );
  if (!user) throw new ApiError(404, "User not found");

  // Log deposit to transaction history
  await Transaction.create({
    user: req.user.id,
    symbol: "CASH",
    type: "DEPOSIT",
    quantity: 1,
    price: amount,
  });

  res.status(200).json({
    success: true,
    message: `₹${amount.toLocaleString("en-IN")} added to your balance`,
    balance: user.balance,
  });
});

exports.resetPortfolio = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, "User not found");

  user.balance = 1000000; // Reset virtual INR
  user.balanceUSD = 10000; // Reset virtual USD
  await user.save();

  await Holding.deleteMany({ user: req.user.id });

  await Transaction.create({
    user: req.user.id,
    symbol: "PORTFOLIO",
    type: "RESET",
    quantity: 1,
    price: 1000000,
  });

  res.status(200).json({
    success: true,
    message: "Portfolio reset to ₹10,00,000 INR & $10,000 USD virtual balance",
    balance: user.balance,
    balanceUSD: user.balanceUSD,
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body; // validated by zod

  const user = await User.findById(req.user.id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  if (user.authProvider !== "local") {
    throw new ApiError(
      400,
      "This account uses Google Sign-In and doesn't have a password to change"
    );
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new ApiError(400, "Current password is incorrect");

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.status(200).json({ success: true, message: "Password updated successfully" });
});

exports.getLeaderboard = asyncHandler(async (req, res) => {
  const [users, holdings, allStocks] = await Promise.all([
    User.find({ isActive: true }),
    Holding.find({ quantity: { $gt: 0 } }),
    Stock.find({}),
  ]);

  const stockMap = {};
  allStocks.forEach((s) => {
    stockMap[s.symbol] = s;
  });

  const userHoldingsMap = {};
  holdings.forEach((h) => {
    const uId = h.user.toString();
    if (!userHoldingsMap[uId]) userHoldingsMap[uId] = [];
    userHoldingsMap[uId].push(h);
  });

  const distinctSymbols = [...new Set(holdings.map((h) => h.symbol))];
  const quoteMap = {};
  await Promise.all(
    distinctSymbols.map(async (sym) => {
      try {
        const q = await getQuote(sym);
        if (q) quoteMap[sym] = q.price;
      } catch (e) {}
    })
  );

  const inrParticipants = [];
  const usdParticipants = [];

  for (const u of users) {
    const uHoldings = userHoldingsMap[u._id.toString()] || [];
    let inrInvested = 0;
    let inrCurrent = 0;
    let usdInvested = 0;
    let usdCurrent = 0;
    const inSymbols = [];
    const usSymbols = [];

    for (const h of uHoldings) {
      const isUSD = h.currency === "USD" || (!h.symbol?.endsWith(".NS") && !h.symbol?.endsWith(".BO"));
      const curPrice = quoteMap[h.symbol] ?? h.avgPrice;
      const inv = h.avgPrice * h.quantity;
      const cur = curPrice * h.quantity;

      if (isUSD) {
        usdInvested += inv;
        usdCurrent += cur;
        usSymbols.push(h.symbol);
      } else {
        inrInvested += inv;
        inrCurrent += cur;
        inSymbols.push(h.symbol);
      }
    }

    const inrCash = u.balance || 0;
    const inrTotalNetWorth = inrCash + inrCurrent;
    const inrProfit = inrTotalNetWorth - 100000;
    const inrRoi = ((inrTotalNetWorth - 100000) / 100000) * 100;
    const inrUtil = Math.round((inrCurrent / (inrTotalNetWorth || 1)) * 100);

    const usdCash = u.balanceUSD ?? 10000;
    const usdTotalNetWorth = usdCash + usdCurrent;
    const usdProfit = usdTotalNetWorth - 10000;
    const usdRoi = ((usdTotalNetWorth - 10000) / 10000) * 100;
    const usdUtil = Math.round((usdCurrent / (usdTotalNetWorth || 1)) * 100);

    inrParticipants.push({
      userId: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      joinedDate: u.createdAt,
      totalNetWorth: inrTotalNetWorth,
      netWorth: inrTotalNetWorth,
      invested: inrInvested,
      cash: inrCash,
      profit: inrProfit,
      overallPL: inrProfit,
      roi: inrRoi,
      utilization: inrUtil,
      capitalUtilization: inrUtil,
      stocksCount: inSymbols.length,
      topHoldings: inSymbols.slice(0, 3),
    });

    usdParticipants.push({
      userId: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      joinedDate: u.createdAt,
      totalNetWorth: usdTotalNetWorth,
      netWorth: usdTotalNetWorth,
      invested: usdInvested,
      cash: usdCash,
      profit: usdProfit,
      overallPL: usdProfit,
      roi: usdRoi,
      utilization: usdUtil,
      capitalUtilization: usdUtil,
      stocksCount: usSymbols.length,
      topHoldings: usSymbols.slice(0, 3),
    });
  }

  inrParticipants.sort((a, b) => b.roi - a.roi);
  usdParticipants.sort((a, b) => b.roi - a.roi);

  inrParticipants.forEach((p, idx) => (p.rank = idx + 1));
  usdParticipants.forEach((p, idx) => (p.rank = idx + 1));

  res.status(200).json({
    success: true,
    inrLeague: inrParticipants,
    usdLeague: usdParticipants,
  });
});
