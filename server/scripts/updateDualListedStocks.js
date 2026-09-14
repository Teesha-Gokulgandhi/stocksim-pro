const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

const Stock = require("../models/Stock");

// Equities known to be listed concurrently on both NSE and BSE
const DUAL_LISTED_ROOT_SYMBOLS = new Set([
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "TATAMOTORS",
  "LT",
  "BHARTIARTL",
  "MARUTI",
  "TITAN",
  "HINDUNILVR",
  "ITC",
  "ZOMATO",
  "ASIANPAINT",
  "AXISBANK",
  "KOTAKBANK",
  "WIPRO",
  "BAJFINANCE",
  "SUNPHARMA",
  "TATASTEEL",
  "NTPC",
  "POWERGRID",
  "M&M",
  "ULTRACEMCO",
  "HCLTECH",
  "ADANIENT",
  "DRREDDY",
  "NESTLEIND",
  "JSWSTEEL",
  "RAYMOND",
  "OLAELEC",
]);

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("Missing MONGO_URI in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for Dual-Listing Migration");

  const allStocks = await Stock.find({});
  console.log(`Found ${allStocks.length} total stocks in database.`);

  let updatedCount = 0;

  for (const stock of allStocks) {
    const rawSym = stock.symbol.toUpperCase();
    const rootSym = rawSym.replace(/\.(NS|BO)$/, "");

    // Check if this stock is an Indian equity listed on both NSE and BSE
    const isIndian =
      stock.country === "IN" ||
      stock.currency === "INR" ||
      rawSym.endsWith(".NS") ||
      rawSym.endsWith(".BO") ||
      stock.exchange === "NSE" ||
      stock.exchange === "BSE";

    if (isIndian && DUAL_LISTED_ROOT_SYMBOLS.has(rootSym)) {
      if (stock.exchange !== "NSE/BSE") {
        stock.exchange = "NSE/BSE";
        stock.country = "IN";
        stock.currency = "INR";
        await stock.save();
        updatedCount++;
        console.log(`Updated ${stock.symbol} (${stock.companyName}) -> exchange: "NSE/BSE"`);
      }
    }
  }

  console.log(`✅ Successfully updated ${updatedCount} stocks to "NSE/BSE" dual listing.`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
