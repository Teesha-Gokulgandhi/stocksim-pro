const mongoose = require("mongoose");

const holdingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    avgPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["INR", "USD"],
      default: "INR",
    },

    // takeProfit / stopLoss used to live here, but that meant buying more
    // of a stock the user already held silently overwrote their protection
    // settings. They now live in their own document per (user, symbol) in
    // the TakeProfitStopLoss collection — see that model and
    // scripts/migrateProtectionRules.js for the one-time migration of any
    // pre-existing values.
  },
  {
    timestamps: true,
  }
);

// Without this, two concurrent buy requests for a symbol the user
// doesn't already hold could each pass the "no existing document" check
// and both insert — a transaction alone doesn't prevent this, since
// there's no existing document for the two writes to conflict over.
// A unique index makes the database itself reject the second insert.
holdingSchema.index({ user: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model("Holding", holdingSchema);