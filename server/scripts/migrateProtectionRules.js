// One-time migration: copies any pre-existing takeProfit/stopLoss values
// off Holding documents into their own TakeProfitStopLoss document, per
// the plan's step 12 ("Existing data migration").
//
// Run once, after deploying the new TakeProfitStopLoss model/routes/worker
// but before (or right after) the Holding schema's takeProfit/stopLoss
// fields are dropped:
//
//   node server/scripts/migrateProtectionRules.js
//
// Safe to re-run: it upserts on { user, symbol } and skips holdings with
// no TP/SL set or with quantity <= 0, so running it twice does not create
// duplicates or resurrect protection for a position that's since been
// closed.
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const TakeProfitStopLoss = require("../models/TakeProfitStopLoss");
const Stock = require("../models/Stock");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for migration.");

  // Read the raw collection directly rather than through the Holding
  // model — once the Holding schema has had takeProfit/stopLoss removed,
  // Mongoose will silently strip those fields from any document it
  // returns even though they're still physically present in MongoDB.
  const rawHoldings = await mongoose.connection.db
    .collection("holdings")
    .find({
      quantity: { $gt: 0 },
      $or: [{ takeProfit: { $ne: null } }, { stopLoss: { $ne: null } }],
    })
    .toArray();

  console.log(`Found ${rawHoldings.length} holding(s) with legacy TP/SL values.`);

  let migrated = 0;
  let skipped = 0;

  for (const holding of rawHoldings) {
    if (holding.takeProfit == null && holding.stopLoss == null) {
      skipped++;
      continue;
    }

    const stockDoc = await Stock.findOne({ symbol: holding.symbol });
    const currency =
      stockDoc?.currency === "USD" || (!holding.symbol.endsWith(".NS") && !holding.symbol.endsWith(".BO"))
        ? "USD"
        : "INR";

    const result = await TakeProfitStopLoss.updateOne(
      { user: holding.user, symbol: holding.symbol },
      {
        $setOnInsert: {
          user: holding.user,
          symbol: holding.symbol,
          currency,
          takeProfit: holding.takeProfit ?? null,
          stopLoss: holding.stopLoss ?? null,
          status: "ACTIVE",
          triggerReason: null,
          triggeredAt: null,
          lastCheckedPrice: null,
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      migrated++;
    } else {
      // A TakeProfitStopLoss document for this (user, symbol) already
      // exists — leave it alone rather than overwrite anything the user
      // may have already configured through the new UI.
      skipped++;
    }
  }

  console.log(`Migration complete. Migrated: ${migrated}. Skipped (already existed / no TP/SL): ${skipped}.`);
  console.log(
    "Once you've verified this looks correct, it's safe to physically remove the takeProfit/stopLoss fields from existing documents in the 'holdings' collection (optional — Mongoose already ignores them)."
  );

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
