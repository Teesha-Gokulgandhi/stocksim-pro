const mongoose = require("mongoose");

// Every sensitive admin action writes one of these. Without this, an
// admin account (or a compromised one) could flip the market closed,
// suspend users, or grant itself/others admin access with zero record of
// who did it or when — this is the accountability layer for that.
const adminAuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Denormalized so the log stays readable even if the admin account
    // is later deleted or renamed.
    actorEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: [
        "MARKET_STATUS_CHANGED",
        "INDIAN_MARKET_STATUS_CHANGED",
        "US_MARKET_STATUS_CHANGED",
        "MARKET_MESSAGE_UPDATED",
        "INDIAN_MARKET_MESSAGE_UPDATED",
        "US_MARKET_MESSAGE_UPDATED",
        "USER_ROLE_CHANGED",
        "USER_STATUS_CHANGED",
        "USER_BALANCE_RESET",
        "NOTIFICATION_SENT",
        "NOTIFICATION_DELETED",
        "STOCK_CREATED",
        "STOCK_UPDATED",
        "STOCK_DELETED",
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["USER", "MARKET", "MARKET_IN", "MARKET_US", "STOCK"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    targetLabel: {
      type: String, // e.g. the affected user's email, for quick scanning
      default: "",
    },
    // Short, human-readable summary — NOT free-form user input, always
    // built server-side from known fields (see adminController.js) so
    // this can never become a stored-XSS vector via the admin table.
    details: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
