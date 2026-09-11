const mongoose = require("mongoose");

// One document represents one user's protection settings for one stock.
// Kept as its own collection (rather than fields on Holding) so buying more
// of a stock never touches, resets, or duplicates the user's protection
// rule for it — the rule is only ever created/edited from the stock
// details page, and only while an open holding exists.
const takeProfitStopLossSchema = new mongoose.Schema(
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

    currency: {
      type: String,
      enum: ["INR", "USD"],
      default: "INR",
    },

    takeProfit: {
      type: Number,
      min: 0,
      default: null,
    },

    stopLoss: {
      type: Number,
      min: 0,
      default: null,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "TRIGGERED", "CANCELLED"],
      default: "ACTIVE",
    },

    triggerReason: {
      type: String,
      enum: ["TAKE_PROFIT", "STOP_LOSS", null],
      default: null,
    },

    triggeredAt: {
      type: Date,
      default: null,
    },

    lastCheckedPrice: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevents duplicate protection documents for the same user + stock. The
// worker and the PUT endpoint both rely on there being at most one rule
// per (user, symbol) to check/update.
takeProfitStopLossSchema.index({ user: 1, symbol: 1 }, { unique: true });

// The worker's poll loop queries `{ status: "ACTIVE" }` on every cycle
// across all users — index it so that scan stays cheap as the collection
// grows.
takeProfitStopLossSchema.index({ status: 1 });

module.exports = mongoose.model("TakeProfitStopLoss", takeProfitStopLossSchema);
