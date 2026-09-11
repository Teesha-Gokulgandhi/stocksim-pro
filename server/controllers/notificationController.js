const Notification = require("../models/Notification");
const AdminAuditLog = require("../models/AdminAuditLog");
const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");
const { buildPaginationMeta } = require("../utils/pagination");

// ================= ADMIN: create / list / delete =================

exports.createNotification = asyncHandler(async (req, res) => {
  const { title, message, type } = req.body; // length/enum validated by zod

  const notification = await Notification.create({
    title,
    message,
    type,
    createdBy: req.user.id,
  });

  await AdminAuditLog.create({
    actor: req.user.id,
    actorEmail: req.user.email,
    action: "NOTIFICATION_SENT",
    targetType: "MARKET", // broadcast, not tied to one user
    targetLabel: title,
    details: `Sent "${title}" (${type}) to all users`,
  });

  res.status(201).json({ success: true, message: "Notification sent", notification });
});

exports.getAllNotificationsAdmin = asyncHandler(async (req, res) => {
  const { page, limit } = req.validatedQuery;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    notifications,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findByIdAndDelete(id);
  if (!notification) throw new ApiError(404, "Notification not found");

  await AdminAuditLog.create({
    actor: req.user.id,
    actorEmail: req.user.email,
    action: "NOTIFICATION_DELETED",
    targetType: "MARKET",
    targetLabel: notification.title,
    details: `Deleted notification "${notification.title}"`,
  });

  res.status(200).json({ success: true, message: "Notification deleted" });
});

// ================= USER: read own notifications =================

exports.getMyNotifications = asyncHandler(async (req, res) => {
  const { page, limit } = req.validatedQuery;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(),
  ]);

  // Compute `read` per-item for this user rather than exposing the full
  // readBy array to every user (that would leak who-else-has-read-it,
  // which nobody asked for and isn't this feature's business).
  const shaped = notifications.map((n) => ({
    _id: n._id,
    title: n.title,
    message: n.message,
    type: n.type,
    createdAt: n.createdAt,
    read: n.readBy.some((u) => u.toString() === req.user.id),
  }));

  res.status(200).json({
    success: true,
    notifications: shaped,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    readBy: { $ne: req.user.id },
  });
  res.status(200).json({ success: true, unreadCount: count });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // $addToSet is idempotent and atomic — safe even if called twice
  // concurrently (e.g. a double-click), never produces duplicate entries.
  const notification = await Notification.findByIdAndUpdate(
    id,
    { $addToSet: { readBy: req.user.id } },
    { new: true }
  );
  if (!notification) throw new ApiError(404, "Notification not found");

  res.status(200).json({ success: true, message: "Marked as read" });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { readBy: { $ne: req.user.id } },
    { $addToSet: { readBy: req.user.id } }
  );
  res.status(200).json({ success: true, message: "All notifications marked as read" });
});
