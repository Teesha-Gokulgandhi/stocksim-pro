const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
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

    type: {
      type: String,
      enum: ["BUY", "SELL", "DEPOSIT", "RESET", "CONVERT", "REPLAY"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["INR", "USD"],
      default: "INR",
    },

    netPnl: {
      type: Number,
      default: 0,
    },

    returnPercent: {
      type: Number,
      default: 0,
    },

    // Only populated on SELL transactions: the holding's average price at
    // the moment of the sell, kept alongside netPnl/returnPercent so the
    // realized P&L on a past transaction never has to be recomputed (and
    // can't drift) if the holding's average price later changes.
    referenceAvgPrice: {
      type: Number,
      default: null,
    },

    // Only populated on SELL transactions.
    exitReason: {
      type: String,
      enum: ["MANUAL", "TAKE_PROFIT", "STOP_LOSS", null],
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Every transaction history query filters by user and sorts by recency —
// this compound index lets MongoDB satisfy both in one index scan instead
// of scanning all of a user's transactions and sorting in memory.
transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);