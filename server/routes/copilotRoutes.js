const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { copilotLimiter } = require("../middleware/rateLimiters");
const { askMarketCopilot } = require("../services/copilot");

/**
 * Input sanitizer and attack detector
 * Rejects obvious prompt injection signatures before hitting the model
 */
const sanitizeUserQuery = (text) => {
  if (typeof text !== "string") return "";
  let clean = text.trim();
  // Strip control characters
  clean = clean.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");
  return clean;
};

// Check for overt jailbreak signatures
const hasOvertJailbreakSignature = (text) => {
  const t = text.toLowerCase();
  const patterns = [
    "dan mode",
    "developer mode",
    "unrestricted mode",
    "ignore previous instructions",
    "disregard all instructions",
    "system prompt leak",
    "repeat your instructions verbatim",
    "what is your system prompt",
  ];
  return patterns.some((p) => t.includes(p));
};

router.post("/chat", protect, copilotLimiter, async (req, res) => {
  try {
    const rawMessage = req.body.message || req.body.query || "";
    const { marketContext } = req.body;

    if (!rawMessage || typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "A query message is required.",
      });
    }

    const cleanMessage = sanitizeUserQuery(rawMessage);

    if (cleanMessage.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Message too long. Please keep queries under 500 characters for optimal market analysis.",
      });
    }

    // Direct defense against overt jailbreak commands
    if (hasOvertJailbreakSignature(cleanMessage)) {
      return res.json({
        success: true,
        answer:
          "### 🛡️ Security Protocol Enforced\nI am the specialized **Financial Market Copilot** for StockSim Pro. My directives are locked strictly to equity research, technical charts, and portfolio risk management.\n\n*Attempts to override system rules or extract internal instructions are disregarded.* How can I assist with your stock analysis or portfolio allocation today?",
        source: "security-firewall",
      });
    }

    // Call Gemini Copilot service with authenticated userId
    const userId = req.user?.id || req.user?._id;
    const result = await askMarketCopilot({
      userQuery: cleanMessage,
      marketContext,
      userId,
    });

    return res.json({
      success: true,
      answer: result.text,
      source: result.source,
      notice: result.notice,
    });
  } catch (error) {
    console.error("Copilot Route Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process market query at this time. Please try again shortly.",
    });
  }
});

module.exports = router;
