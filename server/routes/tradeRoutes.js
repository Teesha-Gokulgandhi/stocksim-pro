const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { validate, tradeSchema, protectionSchema, symbolParamSchema } = require("../middleware/validate");
const { buyStock, sellStock, getHolding } = require("../controllers/tradeController");
const { getProtection, setProtection, deleteProtection } = require("../controllers/protectionController");

router.post("/buy", protect, validate(tradeSchema, "body"), buyStock);
router.post("/sell", protect, validate(tradeSchema, "body"), sellStock);
router.get(
  "/holding/:symbol",
  protect,
  validate(symbolParamSchema, "params"),
  getHolding
);

// Manual take-profit / stop-loss management — separate from buy/sell so a
// repeat purchase of a stock never silently touches the user's protection
// rule for it. See server/services/protectionWorker.js for the automatic
// execution side.
router.get(
  "/protection/:symbol",
  protect,
  validate(symbolParamSchema, "params"),
  getProtection
);
router.put(
  "/protection/:symbol",
  protect,
  validate(symbolParamSchema, "params"),
  validate(protectionSchema, "body"),
  setProtection
);
router.delete(
  "/protection/:symbol",
  protect,
  validate(symbolParamSchema, "params"),
  deleteProtection
);

module.exports = router;
