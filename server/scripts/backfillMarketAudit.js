const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

const AppSettings = require("../models/AppSettings");
const AdminAuditLog = require("../models/AdminAuditLog");
const User = require("../models/User");

const BACKFILL_MARKER = "[backfill:market-settings-2026-09-11]";

async function backfillMarketAudit() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Check server/.env.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const settings = await AppSettings.getSingleton();
  const admin = settings.updatedBy
    ? await User.findById(settings.updatedBy).select("email")
    : await User.findOne({ role: "admin" }).sort({ createdAt: 1 }).select("_id email");

  if (!admin) {
    throw new Error("No admin user found to attach to the audit records.");
  }

  const records = [
    {
      action: "MARKET_STATUS_CHANGED",
      targetType: "MARKET",
      targetLabel: "Global Market",
      details: `${BACKFILL_MARKER} Global Market is currently ${settings.marketOpen ? "OPEN" : "PAUSED"}`,
    },
    {
      action: "INDIAN_MARKET_STATUS_CHANGED",
      targetType: "MARKET_IN",
      targetLabel: "Indian Market (NSE/BSE)",
      details: `${BACKFILL_MARKER} Indian Market (NSE/BSE) is currently ${settings.marketOpenIN ? "OPEN" : "PAUSED"}`,
    },
    {
      action: "US_MARKET_STATUS_CHANGED",
      targetType: "MARKET_US",
      targetLabel: "US Market (NYSE/Nasdaq)",
      details: `${BACKFILL_MARKER} US Market (NYSE/Nasdaq) is currently ${settings.marketOpenUS ? "OPEN" : "PAUSED"}`,
    },
  ];

  let inserted = 0;
  for (const record of records) {
    const exists = await AdminAuditLog.exists({
      action: record.action,
      targetType: record.targetType,
      details: record.details,
    });

    if (!exists) {
      await AdminAuditLog.create({
        ...record,
        actor: admin._id,
        actorEmail: admin.email,
      });
      inserted += 1;
    }
  }

  console.log(`Market audit backfill complete: inserted ${inserted}, skipped ${records.length - inserted}.`);
  await mongoose.disconnect();
}

backfillMarketAudit().catch(async (error) => {
  console.error("Market audit backfill failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
