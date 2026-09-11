const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

const Stock = require("../models/Stock");
const stocks = require("./stocks");
const STOCK_SEED_DATE = new Date("2026-08-01T08:00:00.000Z");

if (!process.env.MONGO_URI) {
  console.error("Seed error: MONGO_URI is missing. Create server/.env from server/.env.example and set MONGO_URI.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");

    for (const s of stocks) {
      await Stock.findOneAndUpdate(
        { symbol: s.symbol },
        {
          $set: {
            ...s,
            createdAt: STOCK_SEED_DATE,
            updatedAt: STOCK_SEED_DATE,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
          timestamps: false,
          overwriteImmutable: true,
        }
      );
    }
    console.log(`✅ Seeded/Updated ${stocks.length} Indian and US stocks successfully`);

    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed error:", err.message);
    process.exit(1);
  });