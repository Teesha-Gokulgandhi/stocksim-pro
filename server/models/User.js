const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    // Not required anymore: Google-authenticated users never set a
    // password. `authProvider` tells you which flow created the account.
    // `select: false` means password is excluded from query results by
    // default — a defense-in-depth measure so a future query that forgets
    // `.select("-password")` doesn't accidentally leak a hash. Anywhere
    // that genuinely needs it (login, change-password) opts back in with
    // `.select("+password")`.
    //
    // The `required` check only fires on document CREATION (`this.isNew`),
    // not on every save. Without that, any unrelated `.save()` on a user
    // fetched without `+password` (e.g. googleAuth linking a Google
    // identity onto an existing local account) would fail validation,
    // because Mongoose can't tell "field genuinely empty" apart from
    // "field just wasn't selected" — confirmed by testing directly.
    password: {
      type: String,
      required: function () {
        return this.isNew && this.authProvider === "local";
      },
      select: false,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    // Google's stable per-user identifier ("sub" claim). Indexed + unique,
    // but sparse so local accounts (which have no googleId) don't collide
    // on the unique constraint.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    balance: {
      type: Number,
      default: 100000, // virtual INR money (₹1,00,000 / 1 Lakh)
    },
    balanceUSD: {
      type: Number,
      default: 10000, // virtual USD money ($10,000)
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // Admin can suspend an account without deleting it. Suspended users
    // can't log in but their data/history is preserved.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
