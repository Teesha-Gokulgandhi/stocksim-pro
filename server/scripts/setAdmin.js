// One-off CLI helper to promote an existing account to admin.
// There's no in-app way to create the very first admin (any UI for that
// would just be a privilege-escalation bug waiting to happen), so this
// runs directly against the database instead.
//
// Usage (from the server/ folder, after registering a normal account):
//   node scripts/setAdmin.js you@example.com
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const User = require("../models/User");

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/setAdmin.js <email>");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const user = await User.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { role: "admin" },
      { new: true }
    );

    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`✅ ${user.email} is now an admin.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
