const Watchlist = require("../models/Watchlist");
const asyncHandler = require("../middleware/asyncHandler");

exports.getWatchlist = asyncHandler(async (req, res) => {
  const items = await Watchlist.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, symbols: items.map((i) => i.symbol) });
});

exports.addToWatchlist = asyncHandler(async (req, res) => {
  const { symbol } = req.params; // normalized to uppercase by zod

  // Atomic upsert avoids the earlier find-then-create race and the
  // duplicate-key error it could throw under concurrent requests.
  await Watchlist.findOneAndUpdate(
    { user: req.user.id, symbol },
    { user: req.user.id, symbol },
    { upsert: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ success: true, message: "Added to watchlist" });
});

exports.removeFromWatchlist = asyncHandler(async (req, res) => {
  const { symbol } = req.params;
  await Watchlist.deleteOne({ user: req.user.id, symbol });
  res.status(200).json({ success: true, message: "Removed from watchlist" });
});
