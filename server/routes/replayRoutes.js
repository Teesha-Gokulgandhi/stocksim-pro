const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  getReplayCandles,
  saveReplaySession,
  getReplayHistory,
  getReplayLeaderboard,
} = require("../controllers/replayController");

router.get("/candles", protect, getReplayCandles);
router.post("/session", protect, saveReplaySession);
router.get("/history", protect, getReplayHistory);
router.get("/leaderboard", protect, getReplayLeaderboard);

module.exports = router;
