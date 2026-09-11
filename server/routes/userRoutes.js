const express = require("express");
const router = express.Router();

const {
  getPortfolio,
  getTransactions,
  getProfile,
  changePassword,
  deposit,
  resetPortfolio,
  getLeaderboard,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { validate, changePasswordSchema, depositSchema } = require("../middleware/validate");

router.get("/portfolio", protect, getPortfolio);
router.get("/leaderboard", protect, getLeaderboard);
router.get("/transactions", protect, getTransactions);
router.get("/profile", protect, getProfile);
router.put(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  changePassword
);
router.post("/deposit", protect, validate(depositSchema), deposit);
router.post("/reset-portfolio", protect, resetPortfolio);

module.exports = router;
