const express = require("express");
const router = express.Router();

const { protect, requireAdmin } = require("../middleware/authMiddleware");
const {
  validate,
  marketStatusSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  resetBalanceSchema,
  mongoIdParamSchema,
  adminUserQuerySchema,
  adminLogQuerySchema,
  createNotificationSchema,
  notificationQuerySchema,
  createStockSchema,
  updateStockSchema,
} = require("../middleware/validate");
const {
  getMarketStatus,
  updateMarketStatus,
  getStats,
  getUsers,
  getUserDetail,
  updateUserRole,
  updateUserStatus,
  resetUserBalance,
  deleteUser,
  getAuditLog,
  createStock,
  updateStock,
  deleteStock,
  verifyStockSymbol,
} = require("../controllers/adminController");
const {
  createNotification,
  getAllNotificationsAdmin,
  deleteNotification,
} = require("../controllers/notificationController");

// Public: any page can check whether trading is open right now.
router.get("/market-status", getMarketStatus);

// Everything below is admin-only.
router.put(
  "/market-status",
  protect,
  requireAdmin,
  validate(marketStatusSchema),
  updateMarketStatus
);

router.get("/stats", protect, requireAdmin, getStats);

router.get(
  "/audit-log",
  protect,
  requireAdmin,
  validate(adminLogQuerySchema, "query"),
  getAuditLog
);

router.get("/users", protect, requireAdmin, validate(adminUserQuerySchema, "query"), getUsers);

router.get(
  "/users/:id",
  protect,
  requireAdmin,
  validate(mongoIdParamSchema, "params"),
  getUserDetail
);

router.put(
  "/users/:id/role",
  protect,
  requireAdmin,
  validate(mongoIdParamSchema, "params"),
  validate(updateUserRoleSchema, "body"),
  updateUserRole
);

router.put(
  "/users/:id/status",
  protect,
  requireAdmin,
  validate(mongoIdParamSchema, "params"),
  validate(updateUserStatusSchema, "body"),
  updateUserStatus
);

router.put(
  "/users/:id/balance",
  protect,
  requireAdmin,
  validate(mongoIdParamSchema, "params"),
  validate(resetBalanceSchema, "body"),
  resetUserBalance
);

router.delete(
  "/users/:id",
  protect,
  requireAdmin,
  validate(mongoIdParamSchema, "params"),
  deleteUser
);

// -------- Notifications (broadcast) --------
router.post(
  "/notifications",
  protect,
  requireAdmin,
  validate(createNotificationSchema),
  createNotification
);

router.get(
  "/notifications",
  protect,
  requireAdmin,
  validate(notificationQuerySchema, "query"),
  getAllNotificationsAdmin
);

router.delete(
  "/notifications/:id",
  protect,
  requireAdmin,
  validate(mongoIdParamSchema, "params"),
  deleteNotification
);

// -------- Stock management --------
router.get("/stocks/verify/:symbol", protect, requireAdmin, verifyStockSymbol);
router.post("/stocks", protect, requireAdmin, validate(createStockSchema), createStock);

router.put(
  "/stocks/:id",
  protect,
  requireAdmin,
  validate(mongoIdParamSchema, "params"),
  validate(updateStockSchema, "body"),
  updateStock
);

router.delete(
  "/stocks/:id",
  protect,
  requireAdmin,
  validate(mongoIdParamSchema, "params"),
  deleteStock
);

module.exports = router;
