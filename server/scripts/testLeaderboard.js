const axios = require("axios");

async function test() {
  try {
    const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
      email: "admin@stocksim.com",
      password: "Password123",
    });
    const token = loginRes.data.token;
    const lbRes = await axios.get("http://localhost:5000/api/user/leaderboard", {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("INR League competitors count:", lbRes.data.inrLeague.length);
    console.log("Top 3 INR League Traders:");
    lbRes.data.inrLeague.slice(0, 3).forEach((t) => {
      console.log(`Rank #${t.rank}: ${t.name} (${t.email}) - Net Worth: ₹${t.totalNetWorth.toFixed(2)}, ROI: +${t.roi.toFixed(2)}%, Util: ${t.utilization}%`);
    });

    console.log("\nUSD League competitors count:", lbRes.data.usdLeague.length);
    console.log("Top 3 USD League Traders:");
    lbRes.data.usdLeague.slice(0, 3).forEach((t) => {
      console.log(`Rank #${t.rank}: ${t.name} (${t.email}) - Net Worth: $${t.totalNetWorth.toFixed(2)}, ROI: +${t.roi.toFixed(2)}%, Util: ${t.utilization}%`);
    });
  } catch (err) {
    console.error("Test failed:", err.response?.data || err.message);
  }
}

test();
