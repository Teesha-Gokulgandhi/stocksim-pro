const mongoose = require("mongoose");

const watchlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
}, { timestamps: true });

watchlistSchema.index({ user: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model("Watchlist", watchlistSchema);