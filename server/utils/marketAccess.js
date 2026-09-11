// Single source of truth for "is this market open right now, and why".
//
// Previously the admin status endpoint and the trade-execution path each
// computed session hours independently, which is exactly the kind of drift
// that let a Temporary Open override work in one place and not the other.
// Everything that needs to know a market's status — the admin panel, the
// public status endpoint, and the buy/sell validation — should go through
// resolveRegionalStatus() below instead of re-deriving it.

function getExchangeHoursStatus() {
  const now = new Date();

  const getZonedParts = (timeZone) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return {
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(values.weekday),
      timeMin: Number(values.hour) * 60 + Number(values.minute),
    };
  };

  // Mon-Fri, 9:15 AM to 3:30 PM IST.
  const ist = getZonedParts("Asia/Kolkata");
  const isIndianSessionOpen =
    ist.day >= 1 && ist.day <= 5 && ist.timeMin >= 9 * 60 + 15 && ist.timeMin <= 15 * 60 + 30;

  // Mon-Fri, 9:30 AM to 4:00 PM America/New_York (DST-aware).
  const ny = getZonedParts("America/New_York");
  const isUSSessionOpen =
    ny.day >= 1 && ny.day <= 5 && ny.timeMin >= 9 * 60 + 30 && ny.timeMin <= 16 * 60;

  return {
    isIndianSessionOpen,
    isUSSessionOpen,
    indianSessionLabel: isIndianSessionOpen
      ? "NSE/BSE Active Session (09:15 - 15:30 IST)"
      : "NSE/BSE Closed (Session: Mon-Fri 09:15-15:30 IST)",
    usSessionLabel: isUSSessionOpen
      ? "NYSE/NASDAQ Active Session (09:30 - 16:00 EST)"
      : "NYSE/NASDAQ Closed (Session: Mon-Fri 09:30-16:00 EST)",
  };
}

// Precedence, first match wins:
//   Global pause > Holiday > Maintenance > Timed Open > Schedule
function resolveRegionalStatus({
  globalOpen,
  marketOpen,
  pauseReason,
  overrideUntil,
  sessionOpen,
  marketLabel,
  schedule,
  message,
}) {
  if (!globalOpen) {
    return {
      status: "PLATFORM_PAUSED",
      reason: "Global emergency pause is active.",
      message: "Trading is paused across the platform.",
      tradingAllowed: false,
    };
  }

  if (!marketOpen) {
    return {
      status: pauseReason || "MAINTENANCE",
      reason:
        pauseReason === "HOLIDAY"
          ? `${marketLabel} is closed for a holiday and will resume on the next weekday session.`
          : `${marketLabel} is paused for maintenance and requires admin approval to resume.`,
      message,
      tradingAllowed: false,
    };
  }

  const overrideActive = overrideUntil && new Date(overrideUntil).getTime() > Date.now();
  if (overrideActive) {
    return {
      status: "TIMED_OPEN",
      reason: `${marketLabel} is open under a temporary admin override until ${new Date(
        overrideUntil
      ).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" })}.`,
      message: "Trading is open under a temporary admin override.",
      tradingAllowed: true,
    };
  }

  if (sessionOpen) {
    return {
      status: "ACTIVE",
      reason: `${marketLabel} is OPEN by schedule (${schedule}).`,
      message: "Trading is open during the scheduled market session.",
      tradingAllowed: true,
    };
  }

  return {
    status: "CLOSED",
    reason: `${marketLabel} is CLOSED by schedule. It opens during the next scheduled session (${schedule}).`,
    message,
    tradingAllowed: false,
  };
}

module.exports = { getExchangeHoursStatus, resolveRegionalStatus };
