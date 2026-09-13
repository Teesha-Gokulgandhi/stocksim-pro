const { z } = require("zod");
const ApiError = require("../utils/ApiError");

// Generic middleware factory: validates req[part] against a zod schema.
//
// Express 5 makes `req.query` a getter that recomputes from the raw URL
// on every access — neither reassigning `req.query = ...` nor mutating
// its properties persists, both fail silently (no error, just a no-op).
// `req.body` and `req.params` are plain writable properties and don't
// have this problem. So: body/params get replaced in place as before;
// query gets validated into `req.validatedQuery` instead, and callers
// read from there.
const validate = (schema, part = "body") => (req, res, next) => {
  const source = part === "query" ? req.query : req[part];
  const result = schema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    return next(new ApiError(400, "Validation failed", details));
  }

  if (part === "query") {
    req.validatedQuery = result.data;
  } else {
    req[part] = result.data;
  }
  next();
};

// ---------- Shared primitives ----------
const symbolSchema = z
  .string()
  .trim()
  .min(1, "Symbol is required")
  .max(15, "Symbol looks too long")
  // Real ticker symbols only contain letters, digits, and a small set of
  // punctuation (BRK.B, RELIANCE.NS, ^NSEI). Rejecting anything else
  // stops odd/control characters from reaching the Yahoo Finance client
  // or being stored as a "stock" a user can trade.
  .regex(/^[A-Za-z0-9.\-^=]+$/, "Symbol contains invalid characters")
  .transform((s) => s.toUpperCase());

const positiveIntQuantity = z
  .coerce.number({ invalid_type_error: "Quantity must be a number" })
  .int("Quantity must be a whole number")
  .positive("Quantity must be greater than 0");

// ---------- Auth ----------
const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(20, "Missing or invalid Google credential"),
});

// ---------- Trade ----------
// Buy/sell no longer accept takeProfit/stopLoss — protection rules are
// created and edited separately from the stock details page, never as a
// side effect of a trade. See protectionSchema below.
const tradeSchema = z.object({
  symbol: symbolSchema,
  quantity: positiveIntQuantity,
});

// ---------- Protection (manual TP/SL) ----------
// At least one of takeProfit/stopLoss must be present so PUT can't be
// called with neither, which would just be a no-op rule. Cross-field
// checks against the holding's current/average price (must be above/below
// entry) happen in the controller, since they need the live holding.
const protectionSchema = z
  .object({
    takeProfit: z.coerce.number().positive("Take profit must be a positive price").nullable().optional(),
    stopLoss: z.coerce.number().positive("Stop loss must be a positive price").nullable().optional(),
  })
  .refine(
    (data) => data.takeProfit != null || data.stopLoss != null,
    { message: "Provide at least one of takeProfit or stopLoss" }
  );

// ---------- User ----------
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

// ---------- Params ----------
const symbolParamSchema = z.object({
  symbol: symbolSchema,
});

const mongoIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id"),
});

// ---------- Admin ----------
// Temporary Open only ever offers these four durations from the UI —
// constraining it server-side too means a crafted request can't hold a
// market open indefinitely by passing an arbitrarily large hour count.
const overrideHoursSchema = z.union([z.literal(1), z.literal(4), z.literal(8), z.literal(24)]).nullable().optional();

const marketStatusSchema = z.object({
  marketOpen: z.boolean().optional(),
  marketClosedMessage: z.string().trim().max(300).optional(),
  marketOpenIN: z.boolean().optional(),
  marketPauseReasonIN: z.enum(["HOLIDAY", "MAINTENANCE"]).nullable().optional(),
  marketClosedMessageIN: z.string().trim().max(300).optional(),
  marketOverrideHoursIN: overrideHoursSchema,
  marketOpenUS: z.boolean().optional(),
  marketPauseReasonUS: z.enum(["HOLIDAY", "MAINTENANCE"]).nullable().optional(),
  marketClosedMessageUS: z.string().trim().max(300).optional(),
  marketOverrideHoursUS: overrideHoursSchema,
});

const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"]),
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

const resetBalanceSchema = z.object({
  balance: z.coerce.number().min(0, "Balance can't be negative").max(10000000, "Balance is too large").optional(),
  balanceUSD: z.coerce.number().min(0, "Balance can't be negative").max(1000000, "Balance is too large").optional(),
  resetHoldings: z.boolean().optional(),
}).refine((data) => data.balance !== undefined || data.balanceUSD !== undefined || data.resetHoldings !== undefined, {
  message: "Provide at least one of balance, balanceUSD, or resetHoldings",
});

// Query params arrive as strings (or, if someone crafts a weird query
// string, potentially arrays/objects) — coerce and bound them here so
// downstream code never has to guess what it received.
const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(20),
  // Cap length so a huge string can't be used to waste CPU building a
  // regex out of it; actual regex-injection is closed in the controller
  // by escaping metacharacters before it ever reaches MongoDB.
  search: z.string().trim().max(100).catch(""),
});

const adminLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(100).catch(20),
});

// ---------- Notifications ----------
const createNotificationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  message: z.string().trim().min(1, "Message is required").max(1000),
  type: z.enum(["info", "success", "warning", "critical"]).default("info"),
});

const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  limit: z.coerce.number().int().positive().max(50).catch(10),
});

// ---------- Deposit ----------
const depositSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .max(500000, "Maximum deposit is ₹5,00,000 at a time"),
});

// ---------- Stock management (admin) ----------
const createStockSchema = z.object({
  symbol: symbolSchema,
  companyName: z.string().trim().min(1, "Company name is required").max(150),
  sector: z.string().trim().min(1, "Sector is required").max(80),
  exchange: z.string().trim().max(20).default("NSE"),
  country: z.enum(["IN", "US"]).optional(),
  currency: z.enum(["INR", "USD"]).optional(),
  logo: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((val) => !val || /^https?:\/\//i.test(val), {
      message: "Logo must be a valid http(s) URL",
    }),
});

// Same shape, but every field optional — a partial update.
const updateStockSchema = createStockSchema.partial();

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  googleAuthSchema,
  tradeSchema,
  protectionSchema,
  changePasswordSchema,
  symbolParamSchema,
  mongoIdParamSchema,
  marketStatusSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  resetBalanceSchema,
  adminUserQuerySchema,
  adminLogQuerySchema,
  createNotificationSchema,
  notificationQuerySchema,
  depositSchema,
  createStockSchema,
  updateStockSchema,
};
