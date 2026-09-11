require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Transaction = require("../models/Transaction");

async function seedAdminPracticeData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const email = "admin@stocksim.com";
    const admin = await User.findOne({ email });

    if (!admin) {
      console.error("Admin user not found. Please ensure admin@stocksim.com exists.");
      process.exit(1);
    }

    console.log(`Seeding realistic scattered profitable portfolio for: ${admin.email}`);

    // 1. Clear previous test holdings & transactions
    await Holding.deleteMany({ user: admin._id });
    await Transaction.deleteMany({ user: admin._id });
    console.log("Cleared old holdings and transactions for admin.");

    // 2. Realistic Indian Transactions (Scattered buys and profitable exits)
    const inTransactions = [
      {
        user: admin._id,
        symbol: "RELIANCE.NS",
        type: "BUY",
        quantity: 10,
        price: 1270.0,
        currency: "INR",
        createdAt: new Date("2026-08-20T10:15:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "TCS.NS",
        type: "BUY",
        quantity: 5,
        price: 2240.0,
        currency: "INR",
        createdAt: new Date("2026-08-22T11:30:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "INFY.NS",
        type: "BUY",
        quantity: 8,
        price: 1080.0,
        currency: "INR",
        createdAt: new Date("2026-08-24T14:10:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "HDFCBANK.NS",
        type: "BUY",
        quantity: 12,
        price: 680.0,
        currency: "INR",
        createdAt: new Date("2026-08-25T09:45:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "ICICIBANK.NS",
        type: "BUY",
        quantity: 6,
        price: 1365.0,
        currency: "INR",
        createdAt: new Date("2026-08-26T10:05:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "BHARTIARTL.NS",
        type: "BUY",
        quantity: 4,
        price: 1780.0,
        currency: "INR",
        createdAt: new Date("2026-08-27T11:20:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "ASIANPAINT.NS",
        type: "BUY",
        quantity: 3,
        price: 2460.0,
        currency: "INR",
        createdAt: new Date("2026-08-28T13:40:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "ITC.NS",
        type: "BUY",
        quantity: 15,
        price: 254.0,
        currency: "INR",
        createdAt: new Date("2026-08-29T14:25:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "TITAN.NS",
        type: "BUY",
        quantity: 1,
        price: 4160.0,
        currency: "INR",
        createdAt: new Date("2026-08-30T10:50:00+05:30"),
      },
      // Realized Exits (Profits & 1 Controlled Stop Loss)
      {
        user: admin._id,
        symbol: "ZOMATO.NS",
        type: "BUY",
        quantity: 30,
        price: 215.0,
        currency: "INR",
        createdAt: new Date("2026-08-18T10:00:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "ZOMATO.NS",
        type: "SELL",
        quantity: 30,
        price: 255.0,
        currency: "INR",
        createdAt: new Date("2026-08-26T14:15:00+05:30"), // +₹1,200 profit
      },
      {
        user: admin._id,
        symbol: "TATAMOTORS.NS",
        type: "BUY",
        quantity: 10,
        price: 940.0,
        currency: "INR",
        createdAt: new Date("2026-08-21T09:30:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "TATAMOTORS.NS",
        type: "SELL",
        quantity: 10,
        price: 1030.0,
        currency: "INR",
        createdAt: new Date("2026-08-31T11:45:00+05:30"), // +₹900 profit
      },
      {
        user: admin._id,
        symbol: "LT.NS",
        type: "BUY",
        quantity: 2,
        price: 3450.0,
        currency: "INR",
        createdAt: new Date("2026-08-22T12:00:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "LT.NS",
        type: "SELL",
        quantity: 2,
        price: 3680.0,
        currency: "INR",
        createdAt: new Date("2026-09-02T13:10:00+05:30"), // +₹460 profit
      },
      {
        user: admin._id,
        symbol: "MARUTI.NS",
        type: "BUY",
        quantity: 1,
        price: 12100.0,
        currency: "INR",
        createdAt: new Date("2026-08-25T11:00:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "MARUTI.NS",
        type: "SELL",
        quantity: 1,
        price: 11920.0,
        currency: "INR",
        createdAt: new Date("2026-09-03T10:30:00+05:30"), // -₹180 controlled stop loss
      },
    ];

    // 3. Realistic US Transactions (Scattered buys and profitable exits)
    const usTransactions = [
      {
        user: admin._id,
        symbol: "NVDA",
        type: "BUY",
        quantity: 6,
        price: 214.0,
        currency: "USD",
        createdAt: new Date("2026-08-20T19:45:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "AAPL",
        type: "BUY",
        quantity: 4,
        price: 304.0,
        currency: "USD",
        createdAt: new Date("2026-08-21T20:15:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "MSFT",
        type: "BUY",
        quantity: 2,
        price: 478.0,
        currency: "USD",
        createdAt: new Date("2026-08-23T21:00:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "GOOGL",
        type: "BUY",
        quantity: 3,
        price: 324.0,
        currency: "USD",
        createdAt: new Date("2026-08-25T19:30:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "AMZN",
        type: "BUY",
        quantity: 4,
        price: 244.0,
        currency: "USD",
        createdAt: new Date("2026-08-26T20:00:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "META",
        type: "BUY",
        quantity: 1,
        price: 585.0,
        currency: "USD",
        createdAt: new Date("2026-08-27T20:30:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "AMD",
        type: "BUY",
        quantity: 1,
        price: 448.0,
        currency: "USD",
        createdAt: new Date("2026-08-28T21:15:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "BRK-B",
        type: "BUY",
        quantity: 1,
        price: 485.0,
        currency: "USD",
        createdAt: new Date("2026-08-29T19:40:00+05:30"),
      },
      // Realized Exits (Profits & 1 Controlled Stop Loss)
      {
        user: admin._id,
        symbol: "TSLA",
        type: "BUY",
        quantity: 3,
        price: 320.0,
        currency: "USD",
        createdAt: new Date("2026-08-19T20:00:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "TSLA",
        type: "SELL",
        quantity: 3,
        price: 365.0,
        currency: "USD",
        createdAt: new Date("2026-08-28T22:00:00+05:30"), // +$135 profit
      },
      {
        user: admin._id,
        symbol: "NFLX",
        type: "BUY",
        quantity: 8,
        price: 72.0,
        currency: "USD",
        createdAt: new Date("2026-08-22T21:30:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "NFLX",
        type: "SELL",
        quantity: 8,
        price: 81.0,
        currency: "USD",
        createdAt: new Date("2026-08-31T20:45:00+05:30"), // +$72 profit
      },
      {
        user: admin._id,
        symbol: "DIS",
        type: "BUY",
        quantity: 5,
        price: 98.0,
        currency: "USD",
        createdAt: new Date("2026-08-24T20:10:00+05:30"),
      },
      {
        user: admin._id,
        symbol: "DIS",
        type: "SELL",
        quantity: 5,
        price: 94.0,
        currency: "USD",
        createdAt: new Date("2026-09-02T21:20:00+05:30"), // -$20 controlled exit
      },
    ];

    await Transaction.insertMany([...inTransactions, ...usTransactions]);
    console.log(`Inserted ${inTransactions.length} INR and ${usTransactions.length} USD transactions.`);

    // 4. Open Indian Holdings (9 diverse stocks, bought at advantageous entries)
    const inHoldings = [
      {
        user: admin._id,
        symbol: "RELIANCE.NS",
        quantity: 10,
        avgPrice: 1270.0,
        currency: "INR",
      },
      {
        user: admin._id,
        symbol: "TCS.NS",
        quantity: 5,
        avgPrice: 2240.0,
        currency: "INR",
      },
      {
        user: admin._id,
        symbol: "INFY.NS",
        quantity: 8,
        avgPrice: 1080.0,
        currency: "INR",
      },
      {
        user: admin._id,
        symbol: "HDFCBANK.NS",
        quantity: 12,
        avgPrice: 680.0,
        currency: "INR",
      },
      {
        user: admin._id,
        symbol: "ICICIBANK.NS",
        quantity: 6,
        avgPrice: 1365.0,
        currency: "INR",
      },
      {
        user: admin._id,
        symbol: "BHARTIARTL.NS",
        quantity: 4,
        avgPrice: 1780.0,
        currency: "INR",
      },
      {
        user: admin._id,
        symbol: "ASIANPAINT.NS",
        quantity: 3,
        avgPrice: 2460.0,
        currency: "INR",
      },
      {
        user: admin._id,
        symbol: "ITC.NS",
        quantity: 15,
        avgPrice: 254.0,
        currency: "INR",
      },
      {
        user: admin._id,
        symbol: "TITAN.NS",
        quantity: 1,
        avgPrice: 4160.0,
        currency: "INR",
      },
    ];

    // 5. Open US Holdings (8 diverse stocks, bought at advantageous entries)
    const usHoldings = [
      {
        user: admin._id,
        symbol: "NVDA",
        quantity: 6,
        avgPrice: 214.0,
        currency: "USD",
      },
      {
        user: admin._id,
        symbol: "AAPL",
        quantity: 4,
        avgPrice: 304.0,
        currency: "USD",
      },
      {
        user: admin._id,
        symbol: "MSFT",
        quantity: 2,
        avgPrice: 478.0,
        currency: "USD",
      },
      {
        user: admin._id,
        symbol: "GOOGL",
        quantity: 3,
        avgPrice: 324.0,
        currency: "USD",
      },
      {
        user: admin._id,
        symbol: "AMZN",
        quantity: 4,
        avgPrice: 244.0,
        currency: "USD",
      },
      {
        user: admin._id,
        symbol: "META",
        quantity: 1,
        avgPrice: 585.0,
        currency: "USD",
      },
      {
        user: admin._id,
        symbol: "AMD",
        quantity: 1,
        avgPrice: 448.0,
        currency: "USD",
      },
      {
        user: admin._id,
        symbol: "BRK-B",
        quantity: 1,
        avgPrice: 485.0,
        currency: "USD",
      },
    ];

    await Holding.insertMany([...inHoldings, ...usHoldings]);
    console.log(`Inserted ${inHoldings.length} INR and ${usHoldings.length} USD active holdings.`);

    // 6. Update Admin User Cash Balances
    // Indian: Started with ₹1,00,000
    // Total invested in active holdings: ₹71,360
    // Net profit from realized trades: +₹2,380
    // Cash balance remaining (Available to Invest): ₹1,00,000 - ₹71,360 + ₹2,380 = ₹31,020.00
    // Total Indian Net Worth = ₹31,020 (Cash) + ~₹75,200 (Holdings) = ~₹1,06,220 (+6.2% PROFIT!)
    admin.balance = 31020;

    // US: Started with $10,000
    // Total invested in active holdings: $6,514
    // Net profit from realized trades: +$187
    // Cash balance remaining (Available to Invest): $10,000 - $6,514 + $187 = $3,673.00
    // Total US Net Worth = $3,673 (Cash) + ~$7,030 (Holdings) = ~$10,703 (+7.0% PROFIT!)
    admin.balanceUSD = 3673;

    await admin.save();

    console.log("✅ Admin portfolio successfully seeded with realistic positive returns & scattered stocks:");
    console.log(`   - Indian Available to Invest: ₹${admin.balance.toLocaleString("en-IN")} | 9 Holdings across top NSE sectors`);
    console.log(`   - US Available to Invest: $${admin.balanceUSD.toLocaleString()} | 8 Holdings across top US tech/finance`);

    process.exit(0);
  } catch (err) {
    console.error("Error seeding practice data:", err);
    process.exit(1);
  }
}

seedAdminPracticeData();
