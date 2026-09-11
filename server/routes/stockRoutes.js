const express = require("express");
const router = express.Router();

const {
  getAllStocks,
  getLiveStocks,
  getStockBySymbol,
  getStockHistory,
} = require("../controllers/stockController");
const { validate, symbolParamSchema } = require("../middleware/validate");

router.get("/", getAllStocks);
router.get("/live", getLiveStocks);
router.get("/:symbol/history", validate(symbolParamSchema, "params"), getStockHistory);
router.get("/:symbol", validate(symbolParamSchema, "params"), getStockBySymbol);

module.exports = router;
