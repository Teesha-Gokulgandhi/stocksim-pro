const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { validate, mongoIdParamSchema, notificationQuerySchema } = require("../middleware/validate");
const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.get("/", protect, validate(notificationQuerySchema, "query"), getMyNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.put("/read-all", protect, markAllAsRead);
router.put("/:id/read", protect, validate(mongoIdParamSchema, "params"), markAsRead);

module.exports = router;
