require("dotenv").config({ quiet: true, path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Holding = require("../models/Holding");
const Transaction = require("../models/Transaction");
const ReplaySession = require("../models/ReplaySession");

async function resetAllUserData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const users = await User.find();
    console.log(`Found ${users.length} users in database`);

    for (const user of users) {
      console.log(`Resetting user: ${user.name} (${user.email})`);
      user.balance = 100000; // 1 Lakh INR
      user.balanceUSD = 10000; // 10k USD
      await user.save();

      const delHoldings = await Holding.deleteMany({ user: user._id });
      const delTxns = await Transaction.deleteMany({ user: user._id });
      const delReplay = await ReplaySession.deleteMany({ user: user._id });

      console.log(`Deleted ${delHoldings.deletedCount} holdings, ${delTxns.deletedCount} transactions, ${delReplay.deletedCount} replay sessions`);
    }

    console.log("All user data successfully reset to ₹1,00,000 INR and $10,000 USD with clean history!");
    process.exit(0);
  } catch (err) {
    console.error("Error resetting data:", err);
    process.exit(1);
  }
}

resetAllUserData();
