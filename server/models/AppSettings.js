const mongoose = require("mongoose");

// A single-document "settings" collection. There is only ever one row,
// found/created via getSingleton() below — this avoids needing a separate
// migration step or a hardcoded ObjectId scattered through the codebase.
const appSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "global",
      unique: true,
    },
    marketOpen: {
      type: Boolean,
      default: true,
    },
    // Shown to users on the frontend when the global market is closed
    marketClosedMessage: {
      type: String,
      default: "Trading is currently paused by the admin. Please check back soon.",
    },
    // Indian Market (NSE/BSE) pause control
    marketOpenIN: {
      type: Boolean,
      default: true,
    },
    marketPauseReasonIN: {
      type: String,
      enum: ["HOLIDAY", "MAINTENANCE", null],
      default: null,
    },
    marketPauseStartedAtIN: {
      type: Date,
      default: null,
    },
    // Temporary Open override: when set to a future date, trading is
    // allowed even outside the regional session hours until this
    // timestamp, then control reverts to the normal schedule on its own.
    marketOverrideUntilIN: {
      type: Date,
      default: null,
    },
    marketClosedMessageIN: {
      type: String,
      default: "Indian Market (NSE/BSE) trading is currently paused by the admin.",
    },
    // US Market (NYSE/Nasdaq) pause control
    marketOpenUS: {
      type: Boolean,
      default: true,
    },
    marketPauseReasonUS: {
      type: String,
      enum: ["HOLIDAY", "MAINTENANCE", null],
      default: null,
    },
    marketPauseStartedAtUS: {
      type: Date,
      default: null,
    },
    marketOverrideUntilUS: {
      type: Date,
      default: null,
    },
    marketClosedMessageUS: {
      type: String,
      default: "US Market (NYSE/Nasdaq) trading is currently paused by the admin.",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

appSettingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne({ key: "global" });
  if (!settings) {
    settings = await this.create({ key: "global" });
  }
  return settings;
};

appSettingsSchema.statics.applyAutomaticHolidayResume = async function (settings) {
  const now = new Date();
  const localDate = (date, timeZone) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  const isWeekday = (timeZone) => {
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
    return !["Sat", "Sun"].includes(weekday);
  };
  const sessionHasOpenedSince = (startedAt, timeZone) =>
    startedAt &&
    localDate(startedAt, timeZone) !== localDate(now, timeZone) &&
    isWeekday(timeZone);

  let changed = false;
  if (
    settings.marketOpenIN === false &&
    settings.marketPauseReasonIN === "HOLIDAY" &&
    sessionHasOpenedSince(settings.marketPauseStartedAtIN, "Asia/Kolkata")
  ) {
    settings.marketOpenIN = true;
    settings.marketPauseReasonIN = null;
    settings.marketPauseStartedAtIN = null;
    changed = true;
  }
  if (
    settings.marketOpenUS === false &&
    settings.marketPauseReasonUS === "HOLIDAY" &&
    sessionHasOpenedSince(settings.marketPauseStartedAtUS, "America/New_York")
  ) {
    settings.marketOpenUS = true;
    settings.marketPauseReasonUS = null;
    settings.marketPauseStartedAtUS = null;
    changed = true;
  }

  if (changed) await settings.save();
  return settings;
};

module.exports = mongoose.model("AppSettings", appSettingsSchema);
