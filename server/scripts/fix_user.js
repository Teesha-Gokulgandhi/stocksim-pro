const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });
if (!process.env.MONGO_URI) {
  dotenv.config({ path: '/app/.env' });
}

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('No MONGO_URI found in env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Holding = mongoose.model('Holding', new mongoose.Schema({}, { strict: false }));
  const Stock = mongoose.model('Stock', new mongoose.Schema({}, { strict: false }));

  const user = await User.findOne({ email: 'frankcastle0044@gmail.com' });
  if (!user) {
    console.log('User frankcastle0044@gmail.com not found');
    process.exit(1);
  }

  console.log('Current User Data:', {
    email: user.email,
    balance: user.balance,
    balanceUSD: user.balanceUSD,
  });

  // Stocks from his 7 transactions:
  // 1 DRREDDY.NS @ 1165.50
  // 1 HDFCBANK.BO @ 708.00
  // 20 HDFCBANK.NS @ 708.25
  // 50 RAYMOND.BO @ 1003.20
  // 1 AXISBANK.NS @ 1246.00
  // Total cost: 67,444.50 INR

  // User explicitly asked: "make that accunt 1llakokay"
  // Set user balance to 32555.50 so:
  // Cash (32,555.50) + Stocks Invested (67,444.50) = 1,00,000.00 INR (Exactly 1 Lakh!)
  user.balance = 32555.50;
  user.balanceUSD = 10000;
  await user.save();
  console.log('Updated user balance: INR', user.balance, 'USD:', user.balanceUSD);

  const symbols = ['DRREDDY.NS', 'HDFCBANK.BO', 'HDFCBANK.NS', 'RAYMOND.BO', 'AXISBANK.NS'];
  const stocks = await Stock.find({ symbol: { $in: symbols } });
  console.log('Found stocks in DB:', stocks.map(s => s.symbol));

  await Holding.deleteMany({ user: user._id });

  const holdings = [
    {
      user: user._id,
      symbol: 'DRREDDY.NS',
      companyName: stocks.find(s => s.symbol === 'DRREDDY.NS')?.companyName || "Dr. Reddy's Laboratories Ltd.",
      quantity: 1,
      avgPrice: 1165.50,
      currency: 'INR',
    },
    {
      user: user._id,
      symbol: 'HDFCBANK.BO',
      companyName: stocks.find(s => s.symbol === 'HDFCBANK.BO')?.companyName || 'HDFC Bank Ltd.',
      quantity: 1,
      avgPrice: 708.00,
      currency: 'INR',
    },
    {
      user: user._id,
      symbol: 'HDFCBANK.NS',
      companyName: stocks.find(s => s.symbol === 'HDFCBANK.NS')?.companyName || 'HDFC Bank Ltd.',
      quantity: 20,
      avgPrice: 708.25,
      currency: 'INR',
    },
    {
      user: user._id,
      symbol: 'RAYMOND.BO',
      companyName: stocks.find(s => s.symbol === 'RAYMOND.BO')?.companyName || 'Raymond Ltd.',
      quantity: 50,
      avgPrice: 1003.20,
      currency: 'INR',
    },
    {
      user: user._id,
      symbol: 'AXISBANK.NS',
      companyName: stocks.find(s => s.symbol === 'AXISBANK.NS')?.companyName || 'Axis Bank Ltd.',
      quantity: 1,
      avgPrice: 1246.00,
      currency: 'INR',
    },
  ];

  await Holding.insertMany(holdings);
  console.log('Restored 5 holdings successfully');

  const count = await Holding.countDocuments({ user: user._id });
  console.log('Final holdings count in DB:', count);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
