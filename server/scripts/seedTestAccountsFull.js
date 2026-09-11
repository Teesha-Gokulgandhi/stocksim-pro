// Comprehensive seed script for two specific test accounts:
//   admin@stocksim.com   (existing admin login)
//   user2@stocksim.com   (created if it doesn't exist)
//
// Unlike the older seed scripts (seedAdminPracticeData.js,
// seedRealisticTradersAndCleanUsers.js) which hardcode buy/sell prices
// from memory, this script pulls REAL, live prices through the exact same
// getQuote() function the live app uses for buy/sell — so every avgPrice,
// sell price, and TP/SL value is priced off the actual current market,
// not a guess. That also means results will differ slightly every time
// you run it (prices move) — that's expected and correct.
//
// It seeds, per user:
//   - A handful of OPEN holdings (Holding collection)
//   - The matching BUY transaction history (Transaction collection)
//   - A couple of CLOSED positions with realized P&L, one profitable
//     and one a loss, with proper netPnl/returnPercent/referenceAvgPrice/
//     exitReason (Transaction collection)
//   - Active TP/SL rules on a couple of the still-open holdings
//     (TakeProfitStopLoss collection), priced above/below the live quote
//     so they'd pass the same validation the real "Save Protection" UI
//     enforces
//   - A cash balance (balance / balanceUSD) computed by actually
//     replaying the trades against a fixed starting balance, not
//     hardcoded — so it's always internally consistent no matter what
//     the live prices turn out to be on the day you run this
//
// Run with:
//   node server/scripts/seedTestAccountsFull.js
//
// Safe to re-run: each run WIPES this script's target users' existing
// holdings/transactions/protection rules first (see WIPE_EXISTING below)
// and reseeds from scratch. It never touches any other user's data.
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Holding = require("../models/Holding");
const Transaction = require("../models/Transaction");
const TakeProfitStopLoss = require("../models/TakeProfitStopLoss");
const { getQuote, getHistoricalChart } = require("../services/yahooService");

const WIPE_EXISTING = true; // set false to add on top of existing data instead of replacing it

const STARTING_BALANCE_INR = 100000;
const STARTING_BALANCE_USD = 10000;
const DEFAULT_PASSWORD = "Password123";

const isUSDSymbol = (symbol) => !symbol.endsWith(".NS") && !symbol.endsWith(".BO");

// Each user gets: a few OPEN positions (currently held) and a couple of
// CLOSED round-trips (bought then fully sold — one winner, one loser) so
// every part of the P&L pipeline (unrealized + realized, profit + loss)
// has real data to show.
const ACCOUNTS = [
  {
    email: "admin@stocksim.com",
    name: "System Admin",
    role: "admin",
    openINR: [
      { symbol: "RELIANCE.NS", qty: 10, buyDiscount: 0.06, daysAgo: 18 },
      { symbol: "TCS.NS", qty: 5, buyDiscount: 0.04, daysAgo: 16 },
      { symbol: "HDFCBANK.NS", qty: 12, buyDiscount: 0.03, daysAgo: 14 },
    ],
    openUSD: [
      { symbol: "AAPL", qty: 4, buyDiscount: 0.05, daysAgo: 15 },
      { symbol: "MSFT", qty: 2, buyDiscount: 0.04, daysAgo: 13 },
    ],
    closedINR: [
      { symbol: "ZOMATO.NS", qty: 30, buyDiscount: 0.10, sellPremium: 0.08, buyDaysAgo: 20, sellDaysAgo: 6 }, // profit
      { symbol: "ITC.NS", qty: 40, buyDiscount: -0.03, sellPremium: -0.01, buyDaysAgo: 17, sellDaysAgo: 4 }, // loss (bought above what it later sold for)
    ],
    closedUSD: [
      { symbol: "TSLA", qty: 3, buyDiscount: 0.09, sellPremium: 0.06, buyDaysAgo: 19, sellDaysAgo: 5 }, // profit
      { symbol: "NFLX", qty: 4, buyDiscount: -0.02, sellPremium: -0.015, buyDaysAgo: 16, sellDaysAgo: 3 }, // loss
    ],
    protection: [
      { symbol: "RELIANCE.NS", tpMargin: 0.15, slMargin: 0.10 },
      { symbol: "AAPL", tpMargin: 0.18, slMargin: 0.12 },
    ],
  },
  {
    email: "user2@stocksim.com",
    name: "Test User Two",
    role: "user",
    openINR: [
      { symbol: "INFY.NS", qty: 8, buyDiscount: 0.05, daysAgo: 12 },
      { symbol: "ICICIBANK.NS", qty: 6, buyDiscount: 0.03, daysAgo: 10 },
    ],
    openUSD: [
      { symbol: "GOOGL", qty: 3, buyDiscount: 0.06, daysAgo: 11 },
      { symbol: "NVDA", qty: 5, buyDiscount: 0.07, daysAgo: 9 },
    ],
    closedINR: [
      { symbol: "TATAMOTORS.NS", qty: 20, buyDiscount: 0.08, sellPremium: 0.07, buyDaysAgo: 14, sellDaysAgo: 4 }, // profit
    ],
    closedUSD: [
      { symbol: "AMD", qty: 6, buyDiscount: -0.03, sellPremium: -0.02, buyDaysAgo: 13, sellDaysAgo: 2 }, // loss
    ],
    protection: [
      { symbol: "INFY.NS", tpMargin: 0.14, slMargin: 0.09 },
      { symbol: "NVDA", tpMargin: 0.20, slMargin: 0.12 },
    ],
  },
];

const daysAgoDate = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// Real historical price lookup — finds the actual closing price closest to
// a target date, using the same chart data the app's own price-history
// chart uses (getHistoricalChart), rather than guessing a past price by
// discounting today's price. "1M" covers the last ~30 days, which covers
// every daysAgo value used below (max 20).
async function getHistoricalPrice(symbol, targetDate) {
  try {
    const candles = await getHistoricalChart(symbol, "1M");
    if (!candles || candles.length === 0) return null;

    const targetTime = targetDate.getTime();
    let closest = candles[0];
    let closestDiff = Math.abs(closest.timestamp - targetTime);
    for (const candle of candles) {
      const diff = Math.abs(candle.timestamp - targetTime);
      if (diff < closestDiff) {
        closest = candle;
        closestDiff = diff;
      }
    }
    // If the closest candle is more than 4 days off (e.g. thin history,
    // a recent IPO, or a data gap), it's not a reliable stand-in for
    // "the price on that specific day" — better to fall back than seed a
    // misleading number.
    const fourDaysMs = 4 * 24 * 60 * 60 * 1000;
    if (closestDiff > fourDaysMs) return null;

    return closest.price;
  } catch (err) {
    return null;
  }
}

async function ensureUser(account) {
  // Every run forces a KNOWN, predictable login for these 2 accounts —
  // password reset to DEFAULT_PASSWORD, role set to what's specified
  // below, account active, and authProvider forced to "local" (password
  // login is rejected for authProvider "google" — see authController.js
  // login()). This applies whether the user already existed or not, so
  // you always know exactly what to log in with after running this.
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

  let user = await User.findOne({ email: account.email });

  if (!user) {
    user = await User.create({
      name: account.name,
      email: account.email,
      password: passwordHash,
      role: account.role,
      authProvider: "local",
      balance: STARTING_BALANCE_INR,
      balanceUSD: STARTING_BALANCE_USD,
      isActive: true,
    });
    console.log(`Created ${account.email} — role: ${account.role}, password: ${DEFAULT_PASSWORD}`);
  } else {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          role: account.role,
          password: passwordHash,
          authProvider: "local",
          isActive: true,
        },
      }
    );
    user = await User.findById(user._id);
    console.log(`Reset existing ${account.email} — role: ${account.role}, password: ${DEFAULT_PASSWORD}`);
  }
  return user;
}

async function seedAccount(account) {
  const user = await ensureUser(account);

  if (WIPE_EXISTING) {
    await Holding.deleteMany({ user: user._id });
    await Transaction.deleteMany({ user: user._id });
    await TakeProfitStopLoss.deleteMany({ user: user._id });
    console.log(`  Cleared previous holdings/transactions/protection for ${account.email}`);
  }

  let cashINR = STARTING_BALANCE_INR;
  let cashUSD = STARTING_BALANCE_USD;
  const livePrices = {}; // symbol -> live quote price, reused for protection rules below

  // ---- Open positions ----
  for (const spec of [...account.openINR, ...account.openUSD]) {
    const quote = await getQuote(spec.symbol);
    if (!quote?.price) {
      console.warn(`  ! Skipping ${spec.symbol} — couldn't fetch a live quote`);
      continue;
    }
    livePrices[spec.symbol] = quote.price;
    const currency = isUSDSymbol(spec.symbol) ? "USD" : "INR";
    const buyDate = daysAgoDate(spec.daysAgo);

    // Real historical close price for that day, wherever available —
    // falls back to a live-price approximation only if history doesn't
    // cover it (e.g. thin/gappy data for that symbol).
    let avgPrice = await getHistoricalPrice(spec.symbol, buyDate);
    let priceSource = "historical";
    if (avgPrice == null) {
      avgPrice = Number((quote.price * (1 - spec.buyDiscount)).toFixed(2));
      priceSource = "approximated (no historical data)";
    }

    const cost = Number((avgPrice * spec.qty).toFixed(2));

    await Holding.create({
      user: user._id,
      symbol: spec.symbol,
      quantity: spec.qty,
      avgPrice,
      currency,
      createdAt: buyDate,
      updatedAt: buyDate,
    });

    await Transaction.create({
      user: user._id,
      symbol: spec.symbol,
      type: "BUY",
      quantity: spec.qty,
      price: avgPrice,
      currency,
      netPnl: 0,
      returnPercent: 0,
      notes: "",
      createdAt: buyDate,
      updatedAt: buyDate,
    });

    if (currency === "USD") cashUSD -= cost;
    else cashINR -= cost;

    console.log(`  Open: ${spec.qty} ${spec.symbol} @ ${currency === "USD" ? "$" : "₹"}${avgPrice} [${priceSource}] (live now: ${quote.price})`);
  }

  // ---- Closed round-trips (buy then full sell), one profit + one loss per currency ----
  for (const spec of [...account.closedINR, ...account.closedUSD]) {
    const quote = await getQuote(spec.symbol);
    if (!quote?.price) {
      console.warn(`  ! Skipping ${spec.symbol} — couldn't fetch a live quote`);
      continue;
    }
    const currency = isUSDSymbol(spec.symbol) ? "USD" : "INR";
    const buyDate = daysAgoDate(spec.buyDaysAgo);
    const sellDate = daysAgoDate(spec.sellDaysAgo);

    let buyPrice = await getHistoricalPrice(spec.symbol, buyDate);
    let sellPrice = await getHistoricalPrice(spec.symbol, sellDate);
    let priceSource = "historical";
    if (buyPrice == null) {
      buyPrice = Number((quote.price * (1 - spec.buyDiscount)).toFixed(2));
      priceSource = "approximated";
    }
    if (sellPrice == null) {
      sellPrice = Number((quote.price * (1 + spec.sellPremium)).toFixed(2));
      priceSource = "approximated";
    }

    const cost = Number((buyPrice * spec.qty).toFixed(2));
    const proceeds = Number((sellPrice * spec.qty).toFixed(2));
    const netPnl = Number((spec.qty * (sellPrice - buyPrice)).toFixed(2));
    const returnPercent = Number(((netPnl / (spec.qty * buyPrice)) * 100).toFixed(2));

    await Transaction.create({
      user: user._id,
      symbol: spec.symbol,
      type: "BUY",
      quantity: spec.qty,
      price: buyPrice,
      currency,
      netPnl: 0,
      returnPercent: 0,
      notes: "",
      createdAt: buyDate,
      updatedAt: buyDate,
    });

    await Transaction.create({
      user: user._id,
      symbol: spec.symbol,
      type: "SELL",
      quantity: spec.qty,
      price: sellPrice,
      currency,
      netPnl,
      returnPercent,
      referenceAvgPrice: buyPrice,
      exitReason: "MANUAL",
      notes: "Manual sell",
      createdAt: sellDate,
      updatedAt: sellDate,
    });

    if (currency === "USD") cashUSD += proceeds - cost;
    else cashINR += proceeds - cost;

    console.log(
      `  Closed: ${spec.qty} ${spec.symbol} bought @ ${buyPrice} sold @ ${sellPrice} [${priceSource}] → ${netPnl >= 0 ? "+" : ""}${netPnl} (${returnPercent}%)`
    );
  }

  // ---- Active protection rules on a couple of the still-open holdings ----
  for (const spec of account.protection) {
    const price = livePrices[spec.symbol];
    if (!price) {
      console.warn(`  ! Skipping protection rule for ${spec.symbol} — no live price captured`);
      continue;
    }
    const currency = isUSDSymbol(spec.symbol) ? "USD" : "INR";
    const takeProfit = Number((price * (1 + spec.tpMargin)).toFixed(2));
    const stopLoss = Number((price * (1 - spec.slMargin)).toFixed(2));

    await TakeProfitStopLoss.create({
      user: user._id,
      symbol: spec.symbol,
      currency,
      takeProfit,
      stopLoss,
      status: "ACTIVE",
    });

    console.log(`  Protection: ${spec.symbol} TP ${takeProfit} / SL ${stopLoss} (live ${price})`);
  }

  user.balance = Number(cashINR.toFixed(2));
  user.balanceUSD = Number(cashUSD.toFixed(2));
  await user.save();

  console.log(
    `  Final cash — INR: ₹${user.balance.toLocaleString("en-IN")} | USD: $${user.balanceUSD.toLocaleString("en-US")}`
  );
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.\n");

  for (const account of ACCOUNTS) {
    console.log(`=== ${account.email} ===`);
    await seedAccount(account);
    console.log("");
  }

  console.log("Done. Log in as either account to see the seeded portfolio, transaction history, and TP/SL rules.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
