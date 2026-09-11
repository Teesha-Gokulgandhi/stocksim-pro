const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("./asyncHandler");
const ApiError = require("../utils/ApiError");

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authorized, no token");
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, "Not authorized, token failed");
  }

  // Confirm the user still exists (handles deleted/deactivated accounts
  // whose old tokens would otherwise keep working until expiry), and pull
  // role/isActive fresh from the DB on every request rather than trusting
  // a JWT payload that could go stale (e.g. an admin demoting someone, or
  // suspending an account, should take effect on their very next request).
  const user = await User.findById(decoded.id).select("_id role isActive email");
  if (!user) {
    throw new ApiError(401, "Not authorized, user no longer exists");
  }
  if (!user.isActive) {
    throw new ApiError(403, "This account has been suspended");
  }

  req.user = { id: user._id.toString(), role: user.role, email: user.email };
  next();
});

// Must run after `protect` — relies on req.user being populated.
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    throw new ApiError(403, "Admin access required");
  }
  next();
};

module.exports = { protect, requireAdmin };
