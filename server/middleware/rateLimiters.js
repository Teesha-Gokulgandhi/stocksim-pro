const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

/**
 * Key generator that identifies authenticated users by their user ID / token.
 * This guarantees that when multiple accounts run side-by-side (e.g. 5 accounts
 * on the same Wi-Fi or localhost), each account gets its own independent 500 req/min
 * quota and will NEVER block each other.
 */
const getUserOrIpKey = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.decode(token);
      if (decoded && decoded.id) {
        return `user_${decoded.id}`;
      }
      return `token_${token.slice(-16)}`;
    } catch {
      // Fall through to IP
    }
  }
  return req.ip;
};

// Tight limiter for login/register — keyed by IP + email so multiple users on the same IP
// can log in without blocking each other's credentials.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body && req.body.email ? String(req.body.email).toLowerCase().trim() : "";
    return email ? `${req.ip}_${email}` : req.ip;
  },
  message: {
    success: false,
    message: "Too many attempts. Please try again in a few minutes.",
  },
});

// Looser general-purpose limiter for the rest of the API.
// Keyed per-user so multiple accounts running on the same IP have independent quotas.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserOrIpKey,
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});

// Dedicated limiter for AI Copilot queries to prevent token exhaustion.
// Keyed per-user so one account chatting doesn't consume another account's quota.
const copilotLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserOrIpKey,
  message: {
    success: false,
    message: "Rate limit reached for AI Market Copilot. Please wait a moment before sending another query.",
  },
});

module.exports = { authLimiter, apiLimiter, copilotLimiter };
