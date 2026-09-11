// Server-side polling worker for automatic take-profit / stop-loss
// execution. This intentionally does NOT live in the browser: the user's
// tab can be closed, their connection can drop, or the exit could
// otherwise be bypassed client-side. Only a process running on the server,
// independent of any open browser tab, can be trusted to fire these
// trades on time.
const TakeProfitStopLoss = require("../models/TakeProfitStopLoss");
const Holding = require("../models/Holding");
const { getQuote } = require("./yahooService");
const { performSell } = require("../controllers/tradeController");

const POLL_INTERVAL_MS = Number(process.env.PROTECTION_POLL_INTERVAL_MS) || 30000;

let isCycleRunning = false; // guards against overlapping cycles if one poll runs long

async function checkAndTriggerRule(rule, currentPrice) {
  let reason = null;
  if (rule.takeProfit != null && currentPrice >= rule.takeProfit) {
    reason = "TAKE_PROFIT";
  } else if (rule.stopLoss != null && currentPrice <= rule.stopLoss) {
    reason = "STOP_LOSS";
  }
  if (!reason) {
    // No trigger this cycle — still record the price we checked against,
    // useful for debugging/"why didn't this fire" support questions.
    await TakeProfitStopLoss.updateOne(
      { _id: rule._id, status: "ACTIVE" },
      { $set: { lastCheckedPrice: currentPrice } }
    );
    return;
  }

  // Atomic guard: flip ACTIVE -> TRIGGERED in one update, filtered on
  // status still being ACTIVE. If two poll cycles somehow overlap (or a
  // manual delete/edit races this one), only one of them can find and
  // update the document while it's still ACTIVE — the other gets null
  // back and does nothing. This is what stops a rule from ever executing
  // its sell twice.
  const claimed = await TakeProfitStopLoss.findOneAndUpdate(
    { _id: rule._id, status: "ACTIVE" },
    {
      $set: {
        status: "TRIGGERED",
        triggerReason: reason,
        triggeredAt: new Date(),
        lastCheckedPrice: currentPrice,
      },
    },
    { new: true }
  );
  if (!claimed) return; // another cycle/process already claimed this rule

  try {
    const holding = await Holding.findOne({ user: claimed.user, symbol: claimed.symbol });
    if (!holding || holding.quantity <= 0) {
      // Holding is already gone (e.g. user manually sold in the same
      // window) — nothing to execute. The rule stays TRIGGERED rather
      // than reverting to ACTIVE, since re-activating it here could race
      // a legitimate concurrent edit.
      return;
    }

    // First version protects the entire active holding (see plan §10) —
    // no separate "protected quantity" field yet.
    await performSell({
      userId: claimed.user,
      symbol: claimed.symbol,
      quantity: holding.quantity,
      exitReason: reason,
      executionPrice: currentPrice,
    });
  } catch (err) {
    console.error(`[protectionWorker] Failed to execute ${reason} for user ${claimed.user} / ${claimed.symbol}:`, err.message);
    // Leave status as TRIGGERED — a failed automatic exit should surface
    // as a support/ops issue, not silently retry and risk a double-sell.
  }
}

async function runCycle() {
  if (isCycleRunning) return;
  isCycleRunning = true;
  try {
    const activeRules = await TakeProfitStopLoss.find({ status: "ACTIVE" });
    if (activeRules.length === 0) return;

    const distinctSymbols = [...new Set(activeRules.map((r) => r.symbol))];
    const quotesBySymbol = {};
    await Promise.all(
      distinctSymbols.map(async (symbol) => {
        try {
          const quote = await getQuote(symbol);
          if (quote?.price) quotesBySymbol[symbol] = quote.price;
        } catch (err) {
          console.error(`[protectionWorker] Quote fetch failed for ${symbol}:`, err.message);
        }
      })
    );

    for (const rule of activeRules) {
      const currentPrice = quotesBySymbol[rule.symbol];
      if (!currentPrice) continue; // couldn't get a fresh price this cycle — try again next cycle
      await checkAndTriggerRule(rule, currentPrice);
    }
  } catch (err) {
    console.error("[protectionWorker] Cycle failed:", err.message);
  } finally {
    isCycleRunning = false;
  }
}

let intervalHandle = null;

function startProtectionWorker() {
  if (intervalHandle) return; // already started
  console.log(`[protectionWorker] Starting — polling every ${POLL_INTERVAL_MS / 1000}s`);
  runCycle(); // run once immediately on boot instead of waiting a full interval
  intervalHandle = setInterval(runCycle, POLL_INTERVAL_MS);
}

function stopProtectionWorker() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { startProtectionWorker, stopProtectionWorker };
