const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Holding = require("../models/Holding");
const Transaction = require("../models/Transaction");
const Stock = require("../models/Stock");
const TakeProfitStopLoss = require("../models/TakeProfitStopLoss");
const ReplaySession = require("../models/ReplaySession");

async function seedTraders() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/stocksim-pro";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("Password123", salt);

    // 1. Ensure admin@stocksim.com exists and is preserved
    let admin = await User.findOne({ email: "admin@stocksim.com" });
    if (!admin) {
      admin = await User.create({
        name: "System Admin",
        email: "admin@stocksim.com",
        password: passwordHash,
        role: "admin",
        balance: 31020,
        balanceUSD: 3673,
        isActive: true,
        createdAt: new Date("2026-08-01T08:00:00.000Z"),
      });
      console.log("Created admin@stocksim.com");
    } else {
      admin.role = "admin";
      admin.isActive = true;
      await admin.save();
      console.log("Preserved existing admin@stocksim.com");
    }

    // 2. Clean only non-admin data (preserving admin's holdings, transactions & user-created replay sessions)
    const deletedUsers = await User.deleteMany({ _id: { $ne: admin._id } });
    console.log(`Deleted ${deletedUsers.deletedCount} old/extra users.`);

    const deletedHoldings = await Holding.deleteMany({ user: { $ne: admin._id } });
    const deletedTx = await Transaction.deleteMany({ user: { $ne: admin._id } });
    const deletedRules = await TakeProfitStopLoss.deleteMany({ user: { $ne: admin._id } });
    const deletedReplay = await ReplaySession.deleteMany({ user: { $ne: admin._id } });

    console.log(`Cleaned non-admin records: ${deletedHoldings.deletedCount} holdings, ${deletedTx.deletedCount} txs, ${deletedRules.deletedCount} TP/SL rules, ${deletedReplay.deletedCount} replay sessions.`);

    // 3. Define 10 realistic competitor traders with realistic asymmetric market cross-performance:
    // - 2 traders profiting in BOTH markets (Aarav, Rohan)
    // - 3 traders profiting in INR, losing in USD (Priya, Vikram, Sarah)
    // - 3 traders losing in INR, profiting in USD (Michael, Elena, Neha)
    // - 2 traders losing in BOTH markets (David, Emily)
    // Base capital: ₹100,000 INR and $10,000 USD
    const tradersData = [
      // ── CATEGORY A: BOTH MARKETS PROFITING ──
      {
        name: "Aarav Sharma",
        email: "aarav.sharma@gmail.com",
        createdAt: new Date("2026-08-02T09:30:00.000Z"),
        // Strategy: High Growth Momentum (BOTH GREEN: ~+8.5% INR, ~+11.3% USD)
        // Invested INR: 27,500 + 23,520 + 15,000 = 66,020 -> Cash: 33,980
        // Invested USD: 2,590 + 2,150 + 2,320 = 7,060 -> Cash: 2,940
        cashINR: 33980,
        cashUSD: 2940,
        inHoldings: [
          { symbol: "ZOMATO.NS", qty: 100, avg: 275.0, date: "2026-08-12T10:00:00Z", takeProfit: 350.0, stopLoss: 250.0 },
          { symbol: "BHARTIARTL.NS", qty: 14, avg: 1680.0, date: "2026-08-18T14:30:00Z", takeProfit: 1950.0, stopLoss: 1550.0 },
          { symbol: "ICICIBANK.NS", qty: 12, avg: 1250.0, date: "2026-08-22T09:45:00Z", takeProfit: 1450.0, stopLoss: 1180.0 },
        ],
        usHoldings: [
          { symbol: "NVDA", qty: 14, avg: 185.0, date: "2026-08-15T19:30:00Z", takeProfit: 245.0, stopLoss: 172.0 },
          { symbol: "AMD", qty: 5, avg: 430.0, date: "2026-08-20T20:00:00Z", takeProfit: 550.0, stopLoss: 390.0 },
          { symbol: "AAPL", qty: 8, avg: 290.0, date: "2026-08-25T21:15:00Z" },
        ],
      },
      {
        name: "Rohan Mehta",
        email: "rohan.mehta@yahoo.com",
        createdAt: new Date("2026-08-04T11:00:00.000Z"),
        // Strategy: Banking & Tech Core (BOTH GREEN: ~+4.3% INR, ~+5.9% USD)
        // Invested INR: 25,600 + 23,125 + 9,500 = 58,225 -> Cash: 41,775
        // Invested USD: 2,400 + 2,320 + 940 = 5,660 -> Cash: 4,340
        cashINR: 41775,
        cashUSD: 4340,
        inHoldings: [
          { symbol: "ICICIBANK.NS", qty: 20, avg: 1280.0, date: "2026-08-15T09:30:00Z", takeProfit: 1450.0, stopLoss: 1200.0 },
          { symbol: "SBIN.NS", qty: 25, avg: 925.0, date: "2026-08-19T10:15:00Z", takeProfit: 1050.0, stopLoss: 875.0 },
          { symbol: "TITAN.NS", qty: 2, avg: 4750.0, date: "2026-08-23T14:00:00Z", takeProfit: 5300.0, stopLoss: 4450.0 },
        ],
        usHoldings: [
          { symbol: "GOOGL", qty: 8, avg: 300.0, date: "2026-08-17T20:15:00Z", takeProfit: 360.0, stopLoss: 280.0 },
          { symbol: "META", qty: 4, avg: 580.0, date: "2026-08-22T21:00:00Z", takeProfit: 680.0, stopLoss: 540.0 },
          { symbol: "AMZN", qty: 4, avg: 235.0, date: "2026-08-29T19:30:00Z" },
        ],
      },

      // ── CATEGORY B: PROFITING IN INR, LOSING IN USD ──
      {
        name: "Priya Patel",
        email: "priya.patel@outlook.com",
        createdAt: new Date("2026-08-03T10:15:00.000Z"),
        // Strategy: Indian Bluechips Winner, US Tech Pullback (INR GREEN +6.8%, USD RED -3.4%)
        // Invested INR: 29,000 + 22,575 + 22,900 = 74,475 -> Cash: 25,525
        // Invested USD: 4,120 + 2,680 = 6,800 -> Cash: 3,200
        cashINR: 25525,
        cashUSD: 3200,
        inHoldings: [
          { symbol: "RELIANCE.NS", qty: 25, avg: 1160.0, date: "2026-08-14T10:30:00Z", takeProfit: 1350.0, stopLoss: 1100.0 },
          { symbol: "HDFCBANK.NS", qty: 35, avg: 645.0, date: "2026-08-16T11:00:00Z", takeProfit: 760.0, stopLoss: 610.0 },
          { symbol: "TITAN.NS", qty: 5, avg: 4580.0, date: "2026-08-20T14:00:00Z", takeProfit: 5350.0, stopLoss: 4350.0 },
        ],
        usHoldings: [
          { symbol: "MSFT", qty: 8, avg: 515.0, date: "2026-08-16T19:45:00Z", takeProfit: 540.0, stopLoss: 470.0 },
          { symbol: "AMZN", qty: 10, avg: 268.0, date: "2026-08-21T20:30:00Z" },
        ],
      },
      {
        name: "Vikram Malhotra",
        email: "vikram.malhotra@rediffmail.com",
        createdAt: new Date("2026-08-06T10:30:00.000Z"),
        // Strategy: Heavy Domestic Infra, US High Beta Drawdown (INR GREEN +5.1%, USD RED -4.2%)
        // Invested INR: 28,800 + 19,800 + 9,760 = 58,360 -> Cash: 41,640
        // Invested USD: 3,880 + 1,920 = 5,800 -> Cash: 4,200
        cashINR: 41640,
        cashUSD: 4200,
        inHoldings: [
          { symbol: "LT.NS", qty: 8, avg: 3600.0, date: "2026-08-17T09:45:00Z", takeProfit: 4200.0, stopLoss: 3450.0 },
          { symbol: "BHARTIARTL.NS", qty: 12, avg: 1650.0, date: "2026-08-21T11:20:00Z", takeProfit: 1950.0, stopLoss: 1550.0 },
          { symbol: "RELIANCE.NS", qty: 8, avg: 1220.0, date: "2026-08-27T14:00:00Z" },
        ],
        usHoldings: [
          { symbol: "TSLA", qty: 10, avg: 388.0, date: "2026-08-19T20:15:00Z", stopLoss: 345.0 },
          { symbol: "NVDA", qty: 8, avg: 240.0, date: "2026-08-24T21:00:00Z", stopLoss: 205.0 },
        ],
      },
      {
        name: "Sarah Jenkins",
        email: "sarah.jenkins@gmail.com",
        createdAt: new Date("2026-08-05T13:45:00.000Z"),
        // Strategy: Indian Consumer Gain, US Media/Retail Pullback (INR GREEN +3.1%, USD RED -2.6%)
        // Invested INR: 32,900 + 17,000 = 49,900 -> Cash: 50,100
        // Invested USD: 3,400 + 1,344 = 4,744 -> Cash: 5,256
        cashINR: 50100,
        cashUSD: 5256,
        inHoldings: [
          { symbol: "ASIANPAINT.NS", qty: 14, avg: 2350.0, date: "2026-08-16T11:30:00Z", takeProfit: 2650.0, stopLoss: 2200.0 },
          { symbol: "SUNPHARMA.NS", qty: 10, avg: 1700.0, date: "2026-08-20T10:45:00Z", takeProfit: 1950.0, stopLoss: 1600.0 },
        ],
        usHoldings: [
          { symbol: "AAPL", qty: 10, avg: 340.0, date: "2026-08-18T20:00:00Z", stopLoss: 310.0 },
          { symbol: "NFLX", qty: 16, avg: 84.0, date: "2026-08-23T21:30:00Z" },
        ],
      },

      // ── CATEGORY C: LOSING IN INR, PROFITING IN USD ──
      {
        name: "Michael Chang",
        email: "michael.chang@gmail.com",
        createdAt: new Date("2026-08-08T09:00:00.000Z"),
        // Strategy: US Tech Winner, Indian Auto/IT Loss (INR RED -3.6%, USD GREEN +6.3%)
        // Invested INR: 28,200 + 23,500 = 51,700 -> Cash: 48,300
        // Invested USD: 3,510 + 2,250 = 5,760 -> Cash: 4,240
        cashINR: 48300,
        cashUSD: 4240,
        inHoldings: [
          { symbol: "TATAMOTORS.NS", qty: 60, avg: 470.0, date: "2026-08-19T10:00:00Z", stopLoss: 410.0 },
          { symbol: "TCS.NS", qty: 10, avg: 2350.0, date: "2026-08-23T11:45:00Z", stopLoss: 2100.0 },
        ],
        usHoldings: [
          { symbol: "META", qty: 6, avg: 585.0, date: "2026-08-21T20:15:00Z", takeProfit: 680.0, stopLoss: 540.0 },
          { symbol: "AMZN", qty: 10, avg: 225.0, date: "2026-08-27T21:30:00Z", takeProfit: 275.0, stopLoss: 210.0 },
        ],
      },
      {
        name: "Elena Rostova",
        email: "elena.rostova@proton.me",
        createdAt: new Date("2026-08-07T14:15:00.000Z"),
        // Strategy: US Value/Conglomerate Profit, Indian FMCG Drag (INR RED -2.9%, USD GREEN +4.5%)
        // Invested INR: 22,400 + 27,250 = 49,650 -> Cash: 50,350
        // Invested USD: 2,400 + 1,840 = 4,240 -> Cash: 5,760
        cashINR: 50350,
        cashUSD: 5760,
        inHoldings: [
          { symbol: "ITC.NS", qty: 80, avg: 280.0, date: "2026-08-18T10:15:00Z", stopLoss: 245.0 },
          { symbol: "INFY.NS", qty: 25, avg: 1090.0, date: "2026-08-22T13:30:00Z", stopLoss: 990.0 },
        ],
        usHoldings: [
          { symbol: "GOOGL", qty: 8, avg: 300.0, date: "2026-08-20T19:30:00Z", takeProfit: 360.0, stopLoss: 280.0 },
          { symbol: "BRK-B", qty: 4, avg: 460.0, date: "2026-08-26T20:45:00Z", takeProfit: 530.0, stopLoss: 440.0 },
        ],
      },
      {
        name: "Neha Verma",
        email: "neha.verma@gmail.com",
        createdAt: new Date("2026-08-09T11:20:00.000Z"),
        // Strategy: US Enterprise Cloud Gainer, Indian Paint/Bank Dip (INR RED -4.7%, USD GREEN +3.5%)
        // Invested INR: 41,920 + 27,125 = 69,045 -> Cash: 30,955
        // Invested USD: 2,730 + 880 = 3,610 -> Cash: 6,390
        cashINR: 30955,
        cashUSD: 6390,
        inHoldings: [
          { symbol: "ASIANPAINT.NS", qty: 16, avg: 2620.0, date: "2026-08-20T09:30:00Z", stopLoss: 2380.0 },
          { symbol: "HDFCBANK.NS", qty: 35, avg: 775.0, date: "2026-08-25T11:15:00Z", stopLoss: 680.0 },
        ],
        usHoldings: [
          { symbol: "MSFT", qty: 6, avg: 455.0, date: "2026-08-22T19:45:00Z", takeProfit: 520.0, stopLoss: 430.0 },
          { symbol: "AMD", qty: 2, avg: 440.0, date: "2026-08-28T21:00:00Z", takeProfit: 540.0, stopLoss: 410.0 },
        ],
      },

      // ── CATEGORY D: BOTH MARKETS LOSING ──
      {
        name: "David Miller",
        email: "david.miller@fastmail.com",
        createdAt: new Date("2026-08-10T14:00:00.000Z"),
        // Strategy: Momentum Peak Buyer (BOTH RED: ~-3.8% INR, ~-4.9% USD)
        // Invested INR: 34,740 + 23,750 = 58,490 -> Cash: 41,510
        // Invested USD: 4,656 + 2,380 = 7,036 -> Cash: 2,964
        cashINR: 41510,
        cashUSD: 2964,
        inHoldings: [
          { symbol: "BHARTIARTL.NS", qty: 18, avg: 1930.0, date: "2026-08-21T10:15:00Z", stopLoss: 1780.0 },
          { symbol: "TATAMOTORS.NS", qty: 50, avg: 475.0, date: "2026-08-26T11:30:00Z", stopLoss: 410.0 },
        ],
        usHoldings: [
          { symbol: "TSLA", qty: 12, avg: 388.0, date: "2026-08-23T20:30:00Z", stopLoss: 340.0 },
          { symbol: "NVDA", qty: 10, avg: 238.0, date: "2026-08-29T21:45:00Z", stopLoss: 205.0 },
        ],
      },
      {
        name: "Emily Davis",
        email: "emily.davis@gmail.com",
        createdAt: new Date("2026-08-11T12:30:00.000Z"),
        // Strategy: Aggressive High-Chaser Drawdown (BOTH RED: ~-5.6% INR, ~-5.7% USD)
        // Invested INR: 42,400 + 38,000 = 80,400 -> Cash: 19,600
        // Invested USD: 4,224 + 4,208 = 8,432 -> Cash: 1,568
        cashINR: 19600,
        cashUSD: 1568,
        inHoldings: [
          { symbol: "ASIANPAINT.NS", qty: 16, avg: 2650.0, date: "2026-08-22T09:45:00Z", stopLoss: 2380.0 },
          { symbol: "TCS.NS", qty: 16, avg: 2375.0, date: "2026-08-27T14:20:00Z", stopLoss: 2150.0 },
        ],
        usHoldings: [
          { symbol: "AAPL", qty: 12, avg: 352.0, date: "2026-08-24T19:30:00Z", stopLoss: 310.0 },
          { symbol: "MSFT", qty: 8, avg: 526.0, date: "2026-08-30T21:15:00Z", stopLoss: 475.0 },
        ],
      },
    ];

    for (const t of tradersData) {
      const newUser = await User.create({
        name: t.name,
        email: t.email,
        password: passwordHash,
        role: "user",
        balance: t.cashINR,
        balanceUSD: t.cashUSD,
        isActive: true,
        createdAt: t.createdAt,
      });

      // Insert Indian Holdings, Transactions & TakeProfitStopLoss
      for (const h of t.inHoldings) {
        await Holding.create({
          user: newUser._id,
          symbol: h.symbol,
          quantity: h.qty,
          avgPrice: h.avg,
          currency: "INR",
          createdAt: new Date(h.date),
        });

        await Transaction.create({
          user: newUser._id,
          symbol: h.symbol,
          type: "BUY",
          quantity: h.qty,
          price: h.avg,
          currency: "INR",
          createdAt: new Date(h.date),
        });

        if (h.takeProfit || h.stopLoss) {
          await TakeProfitStopLoss.create({
            user: newUser._id,
            symbol: h.symbol,
            currency: "INR",
            takeProfit: h.takeProfit || null,
            stopLoss: h.stopLoss || null,
            status: "ACTIVE",
          });
        }
      }

      // Insert US Holdings, Transactions & TakeProfitStopLoss
      for (const h of t.usHoldings) {
        await Holding.create({
          user: newUser._id,
          symbol: h.symbol,
          quantity: h.qty,
          avgPrice: h.avg,
          currency: "USD",
          createdAt: new Date(h.date),
        });

        await Transaction.create({
          user: newUser._id,
          symbol: h.symbol,
          type: "BUY",
          quantity: h.qty,
          price: h.avg,
          currency: "USD",
          createdAt: new Date(h.date),
        });

        if (h.takeProfit || h.stopLoss) {
          await TakeProfitStopLoss.create({
            user: newUser._id,
            symbol: h.symbol,
            currency: "USD",
            takeProfit: h.takeProfit || null,
            stopLoss: h.stopLoss || null,
            status: "ACTIVE",
          });
        }
      }

      console.log(`Seeded user: ${t.name} (${t.email}) | INR cash: ₹${t.cashINR}, USD cash: $${t.cashUSD}`);
    }

    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: "admin" });
    const holdingsCount = await Holding.countDocuments();
    const txCount = await Transaction.countDocuments();
    const rulesCount = await TakeProfitStopLoss.countDocuments();
    const replayCount = await ReplaySession.countDocuments();

    console.log("=========================================");
    console.log(`Done! Total users: ${totalUsers} (Admins: ${adminCount})`);
    console.log(`Holdings: ${holdingsCount}`);
    console.log(`Transactions: ${txCount}`);
    console.log(`TakeProfitStopLoss rules: ${rulesCount}`);
    console.log(`ReplaySessions (admin only preserved): ${replayCount}`);
    console.log("=========================================");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seedTraders();
