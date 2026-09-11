const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const asyncHandler = require("../middleware/asyncHandler");
const ApiError = require("../utils/ApiError");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendAuthResponse = (res, statusCode, message, user) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      authProvider: user.authProvider,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
};

// REGISTER (email + password)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body; // validated + normalized by zod

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    // If they already have a Google-only account, tell them to use that
    // instead of silently colliding on the unique email index.
    if (existingUser.authProvider === "google") {
      throw new ApiError(
        409,
        "This email is registered via Google. Please use 'Continue with Google' to sign in."
      );
    }
    throw new ApiError(409, "An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    authProvider: "local",
  });

  sendAuthResponse(res, 201, "Account created successfully", user);
});

// LOGIN (email + password)
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  // Deliberately identical message for "no user" and "wrong password" so
  // the endpoint can't be used to enumerate registered email addresses.
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.authProvider === "google") {
    throw new ApiError(
      401,
      "This account uses Google Sign-In. Please use 'Continue with Google'."
    );
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account has been suspended. Contact support.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  sendAuthResponse(res, 200, "Login successful", user);
});

// GOOGLE SIGN-IN / SIGN-UP
// The frontend uses Google Identity Services to get a signed ID token
// directly from Google, then sends ONLY that token here. We verify it
// server-side against Google's public keys (google-auth-library handles
// fetching/caching those) — the frontend never has a chance to forge a
// user identity, because we never trust anything it says about who the
// user is, only the token Google signed.
exports.googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body; // validated by zod (non-empty string)

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new ApiError(401, "Invalid Google token");
  }

  if (!payload?.email) {
    throw new ApiError(401, "Google account has no verifiable email");
  }
  if (!payload.email_verified) {
    throw new ApiError(401, "Google email is not verified");
  }

  let user = await User.findOne({
    $or: [{ googleId: payload.sub }, { email: payload.email }],
  });

  if (user) {
    if (!user.isActive) {
      throw new ApiError(403, "This account has been suspended. Contact support.");
    }
    // Link a Google identity onto an existing local account the first
    // time they sign in with Google using the same email.
    if (!user.googleId) {
      user.googleId = payload.sub;
      user.authProvider = user.authProvider === "local" ? user.authProvider : "google";
      if (!user.avatarUrl && payload.picture) user.avatarUrl = payload.picture;
      await user.save();
    }
    return sendAuthResponse(res, 200, "Login successful", user);
  }

  user = await User.create({
    name: payload.name || payload.email.split("@")[0],
    email: payload.email,
    googleId: payload.sub,
    authProvider: "google",
    avatarUrl: payload.picture || "",
  });

  sendAuthResponse(res, 201, "Account created successfully", user);
});
