const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { validate, symbolParamSchema } = require("../middleware/validate");
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} = require("../controllers/watchlistController");

router.get("/", protect, getWatchlist);
router.post("/:symbol", protect, validate(symbolParamSchema, "params"), addToWatchlist);
router.delete(
  "/:symbol",
  protect,
  validate(symbolParamSchema, "params"),
  removeFromWatchlist
);

module.exports = router;
