require("dotenv").config({ quiet: true });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const stockRoutes = require("./routes/stockRoutes");
const watchlistRoutes = require("./routes/watchlistRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const replayRoutes = require("./routes/replayRoutes");
const copilotRoutes = require("./routes/copilotRoutes");

const { apiLimiter } = require("./middleware/rateLimiters");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const securityHeaders = require("./middleware/securityHeaders");
const { startProtectionWorker, stopProtectionWorker } = require("./services/protectionWorker");

// Fail fast if critical config is missing instead of limping along with
// undefined secrets (e.g. JWT signing with `undefined`).
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// GOOGLE_CLIENT_ID isn't strictly required to boot (email/password auth
// still works without it), but Google Sign-In will fail at request time
// if it's missing, so warn loudly rather than failing silently later.
if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.startsWith("CHANGE_ME")) {
  console.warn(
    "⚠️  GOOGLE_CLIENT_ID is not set — Google Sign-In will not work until you configure it."
  );
}

const app = express();

// Remove the "X-Powered-By: Express" header — no reason to tell an
// attacker exactly which framework/version to look up known CVEs for.
app.disable("x-powered-by");

// If deployed behind a reverse proxy (Render, Railway, Heroku, Nginx, a
// load balancer, etc.), Express needs to know how many proxy hops to
// trust so `req.ip` reflects the real client IP — otherwise every
// request appears to come from the proxy's IP and the rate limiters
// above either rate-limit everyone as one client or (if trust proxy is
// misconfigured too permissively) can be bypassed via a spoofed
// X-Forwarded-For header. Set this explicitly via env once you know your
// deployment's proxy setup; defaulting to 0 (trust nothing) is the safe
// choice for local dev / no proxy.
const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS, 10);
if (!Number.isNaN(trustProxyHops) && trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

app.use(securityHeaders);

// Restrict CORS to known frontend origin(s) instead of allowing any site
// to call this API with a user's credentials/token.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5174")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (curl/Postman/no Origin header) through.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);
app.use(apiLimiter);

app.get("/", (req, res) => {
  res.send("StockSim Pro API Running");
});

// Basic health check for uptime monitors / container orchestration.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    dbState: mongoose.connection.readyState, // 1 = connected
    uptimeSeconds: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/replay", replayRoutes);
app.use("/api/copilot", copilotRoutes);

// 404 + central error handler must be registered last, in this order.
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let server;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    // Automatic TP/SL execution — must run on the server, not the
    // browser, so it keeps working with no tab open. See
    // services/protectionWorker.js.
    startProtectionWorker();
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1); // don't run the API against a broken DB connection
  });

// Surface anything that slips past asyncHandler instead of crashing silently.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  stopProtectionWorker();
  if (server) {
    server.close(() => {
      mongoose.connection.close(false, () => {
        console.log("Closed out remaining connections.");
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = app;
