const express = require("express");
const router = express.Router();
const { register, login, googleAuth } = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiters");
const {
  validate,
  registerSchema,
  loginSchema,
  googleAuthSchema,
} = require("../middleware/validate");

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/google", authLimiter, validate(googleAuthSchema), googleAuth);

module.exports = router;
