const mongoose = require("mongoose");

const replayTradeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },
    entryPrice: {
      type: Number,
      required: true,
    },
    exitPrice: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    pnl: {
      type: Number,
      required: true,
    },
    returnPercent: {
      type: Number,
      required: true,
    },
    barsHeld: {
      type: Number,
      default: 1,
    },
    entryDate: {
      type: String,
      default: "",
    },
    exitDate: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const replaySessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    displaySymbol: {
      type: String,
      default: "",
    },
    isBlind: {
      type: Boolean,
      default: false,
    },
    currency: {
      type: String,
      enum: ["INR", "USD"],
      default: "USD",
    },
    initialBalance: {
      type: Number,
      required: true,
    },
    finalBalance: {
      type: Number,
      required: true,
    },
    netPnl: {
      type: Number,
      required: true,
    },
    returnPercent: {
      type: Number,
      required: true,
    },
    winRate: {
      type: Number,
      default: 0,
    },
    tradesCount: {
      type: Number,
      default: 0,
    },
    winningTrades: {
      type: Number,
      default: 0,
    },
    losingTrades: {
      type: Number,
      default: 0,
    },
    profitFactor: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      enum: ["S", "A", "B", "C", "D"],
      default: "B",
    },
    candlesProcessed: {
      type: Number,
      default: 0,
    },
    trades: [replayTradeSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ReplaySession", replaySessionSchema);
