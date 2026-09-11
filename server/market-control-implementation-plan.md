# StockSim Pro — Market Control System: Implementation Plan

## 1. Why this document exists

The transcript this plan is based on shows one continuous feature request — "let admin
control when the Indian and US markets are open/closed" — worked through in ~30 short,
typo-heavy messages to an AI coding assistant (Copilot). The assistant kept making small,
reactive patches instead of building the feature against a single spec. Result: the same
concept (a manual pause) was named and renamed four times (Session Closed → Resume Normal
Schedule → removed; Feed Upgrade → Maintenance), a "Temporary Open" feature was built, then
ripped out for being buggy, then asked for again in the very last message, and at least two
real bugs shipped (an enum rejecting the market-close audit write; a 30-second poll silently
overwriting an admin's unsaved selection before they clicked Apply).

This plan reconstructs **one coherent spec** from that thread, checked against the code you
actually uploaded (`stocksim-pro.zip`), so the next implementation pass fixes root causes
instead of adding a fifth patch on top of the last four.

**Current code status, verified by reading the repo directly:**
- `server/models/AppSettings.js`, `server/controllers/adminController.js` (status/getRegionalStatus logic), and
  `client/src/pages/Admin/Admin.jsx` are already at the state described near the *end* of the
  transcript: three presets exist per market — **Resume Market, Holiday, Maintenance** ("Feed
  Upgrade" has been renamed to "Maintenance"). "Session Closed" and "Temporary Open" have both
  been fully removed from the schema, controller, and UI.
- This means the **very last request in the transcript — bring back Temporary Open, working
  correctly this time — was never implemented.** That's the one open gap; everything else the
  user asked for earlier is present in some form, though not always cleanly.

---

## 2. Requirements, extracted and de-duplicated

Reading past the typos, the user asked for the following, in roughly this order:

1. Fix a backend crash when closing the Indian market (audit log write rejected by Mongoose enum validation).
2. Fix inconsistent sizing/styling of the profit/loss (ROI) badges in the investor table.
3. Fix `appsettings` not updating when a market status change is made.
4. Backfill missing historical audit-log rows for existing market states.
5. Show a readable target label in the audit trail ("Indian Market (NSE/BSE)" instead of a raw enum or `-`).
6. Add a **global kill switch**: one master toggle that puts every non-admin user into a maintenance screen everywhere in the app, polling until it's lifted.
7. Stop admin-page toast/error messages from all rendering in one shared banner at the top — scope each message to the section it belongs to (Stocks, Market, Investors, Broadcasts).
8. Reduce visual clutter / remove long explanatory text blocks from the Market Engine page (asked **repeatedly**, each time a new feature added more text).
9. Explain, then implement, **automatic schedule-based open/close** for NSE/BSE and NYSE/NASDAQ, DST-aware, independent of any admin action.
10. Make sure an admin's **manual pause is sticky** — it must not be silently overridden by the schedule reopening (i.e., manual pause outranks the clock).
11. Split the manual pause into **two distinct reasons** with different auto-resume behavior:
    - **Holiday** — closes now, automatically clears and returns to schedule control on the next weekday session.
    - **Maintenance** — closes now, stays closed indefinitely until an admin explicitly resumes it.
12. Make the message field ("Save Notice") **update the user-facing text only** — it must never change market state, clear a pause reason, or reset a timer as a side effect.
13. Add a **temporary/timed open** override: admin picks a duration (1h/4h/8h/24h); the market trades even outside its normal session for that window, then automatically reverts to schedule control.
14. Show the **same status + reason wording** to admins and to end users (banner, buy/sell buttons, quick-trade modal) — no divergent copy between what the admin panel says and what a trader sees.
15. Every buy/sell request and every status read must be **re-validated server-side** against current state — a user must never be able to bypass a closed market from a stale client.
16. Produce reference documentation of the resulting state machine: a table and a flow diagram.
17. Simplify the UI repeatedly: drop unused dropdowns, collapse "Pause/Resume" plus "reason" plus "timer" into a small number of one-click presets, remove a stray `exchangeStatus is not defined` runtime error.
18. **Bug (found in production):** the admin page's 30-second auto-refresh was overwriting the admin's selected-but-unapplied preset before "Apply" was clicked, so a Resume attempt silently reverted to Maintenance. Confirmed via a live timestamp test (1:26 AM IST / 3:56 PM EDT) where the US market stayed CLOSED even though the schedule said it should be open, because a stale Maintenance flag correctly overrode the schedule but the UI didn't say why. Root cause was the refresh clobbering unsaved UI state, not the schedule math.
19. **Regression:** a subsequent pass removed *both* the confusing "Session Closed" label and the actual Temporary Open feature together, in the same cleanup. The user's final message asks for Temporary Open back — implemented so it actually works outside market hours this time.
20. Rename "Feed Upgrade" (a US-only label the assistant introduced) back to the generic "Maintenance" label used for both markets, for consistency.

---

## 3. Target state machine (single source of truth)

Each regional market (`IN`, `US`) has exactly one status at any moment, computed — never
stored directly — from three inputs: the **global kill switch**, the **admin pause fields**,
and the **live schedule clock**.

| Status | Condition | Trading | Resolves to next |
|---|---|---|---|
| `PLATFORM_PAUSED` | Global kill switch is off | Blocked, for every market | Admin flips global switch back on |
| `HOLIDAY` | Admin paused with reason=Holiday | Blocked | Auto-clears on the next weekday's session start |
| `MAINTENANCE` | Admin paused with reason=Maintenance | Blocked | Only clears when admin clicks Resume Market |
| `TIMED_OPEN` | Admin applied a timed override, override window has not expired | Allowed, even outside normal hours | Reverts to `ACTIVE`/`CLOSED` by schedule the instant the window expires |
| `ACTIVE` | No pause active, currently inside scheduled session hours | Allowed | `CLOSED` at session end |
| `CLOSED` | No pause active, currently outside scheduled session hours | Blocked | `ACTIVE` at next session start |

**Precedence, top to bottom, first match wins:** Global pause → Holiday → Maintenance →
Timed Open → Schedule. This single ordering is what requirement #10 ("manual pause must not
be silently overridden") and requirement #13 ("timed open must work outside hours") both
depend on — they were previously implemented as separate, sometimes-conflicting code paths,
which is *why* Temporary Open had to be ripped out before.

**Schedules** (already correctly implemented in `getExchangeHoursStatus()`):
- NSE/BSE: Mon–Fri, 09:15–15:30 IST
- NYSE/NASDAQ: Mon–Fri, 09:30–16:00 America/New_York (DST-aware via `Intl.DateTimeFormat`)

---

## 4. Data model changes

`AppSettings` already has the right shape for everything except Timed Open. Add, per market
(`IN`/`US`):

```js
marketOverrideUntil: { type: Date, default: null }   // TIMED_OPEN expiry, null = no override
marketOverrideReason: { type: String, default: null } // free text, optional, for the audit trail
```

No new fields are needed for Holiday/Maintenance — `marketPauseReasonIN/US` and
`marketPauseStartedAtIN/US` already exist and already work for the Holiday auto-clear
(`applyAutomaticHolidayResume`).

`AdminAuditLog.action` enum: no changes needed if Timed Open changes are logged under the
existing `INDIAN_MARKET_STATUS_CHANGED` / `US_MARKET_STATUS_CHANGED` actions with a `details`
string like `"Indian Market (NSE/BSE) set to TIMED_OPEN until 14:00 IST"` — this avoids a
repeat of bug #1 (an enum rejecting a value nobody added to the schema).

---

## 5. Backend logic changes

**`getRegionalStatus()` in `adminController.js`** — extend the precedence chain to check the
override before falling through to the schedule:

```
if (!globalOpen)                                  → PLATFORM_PAUSED
else if (pauseReason === "HOLIDAY")                → HOLIDAY
else if (pauseReason === "MAINTENANCE")            → MAINTENANCE
else if (overrideUntil && overrideUntil > now)     → TIMED_OPEN (trading allowed)
else if (sessionOpen)                              → ACTIVE
else                                                → CLOSED
```

**Every trade-execution path** (`tradeController.js` buy/sell handlers) must call this same
resolver — not re-check `marketOpenIN`/`marketOpenUS` booleans directly — so a `TIMED_OPEN`
market actually accepts orders outside its normal hours, and so admin/user/trade-execution
never disagree about status (requirement #14/#15).

**Applying a Timed Open**, one endpoint action:
- Input: market (`IN`/`US`), duration (1/4/8/24h).
- Clears any existing pause reason for that market (Holiday/Maintenance) — a timed open is an
  explicit admin decision to trade now, so it should win over a stale pause.
- Sets `marketOverrideUntil = now + duration`.
- Writes one audit log entry with the expiry timestamp in `details`.
- Does **not** touch the message field.

**Save Notice** must remain a pure text update — no market-state field in that request
handler at all — this was correctly fixed in the transcript (requirement #12) and the
description above is here only as a guardrail against reintroducing the coupling.

**Fix the refresh-clobbers-selection bug (#18)** at the root: the periodic status poll must
never overwrite form state the admin has changed but not yet submitted. Concretely — keep
poll results and pending-selection state in separate variables, and only ever render the poll
result into the "current status" display, never into the preset/duration controls the admin
is actively editing. (This is a UI-state bug, not a backend bug, but it's listed here because
it's what made requirement #10 look broken when it wasn't — see bug write-up in §2.)

---

## 6. Frontend changes (`Admin.jsx`, Market Engine card)

Per-market card, final shape (matches the direction of the last several cleanup requests):

- Market name + trading hours (static text, one line).
- Green **OPEN** / red **CLOSED** pill — reflects the *resolved* status from §3, not a raw boolean.
- One line of reason text, worded identically to what end users see (requirement #14):
  - `"Indian Market (NSE/BSE) is closed for a holiday and will resume on the next weekday session."`
  - `"...is paused for maintenance and requires admin approval to resume."`
  - `"...is open under a temporary override until 2:00 PM IST."`
  - `"...is closed by schedule. Opens at the next session (09:15 IST)."`
- Message field + one **Apply notice** button (text-only, per §5).
- Quick presets, exactly four, no nested reason/timer dropdowns left visible by default:
  - **Resume Market** — clears Holiday/Maintenance/override, returns control to schedule.
  - **Holiday** — pauses now, auto-clears next weekday.
  - **Maintenance** — pauses now, stays closed until Resume Market.
  - **Temporary Open** — reveals a single inline duration control (1h/4h/8h/24h) only when
    selected, collapses again once applied. This satisfies requirement #17 (no permanent
    clutter) while restoring requirement #13/#19 (the feature the user asked for last).

No separate "Session Closed" preset — confirmed dead concept, correctly removed; Resume
Market already covers "go back to letting the schedule decide."

---

## 7. Testing checklist before shipping

Direct tests for the two confirmed regressions, plus the state matrix:

- [ ] Close Indian market via admin panel → audit log write succeeds, no enum validation error (regression test for bug #1).
- [ ] Set a market to Maintenance, then click Resume Market — refresh the page mid-way through (simulate the 30s poll) before clicking Apply, confirm the selection is not reverted (regression test for bug #18).
- [ ] Pause for Holiday on a Friday → confirm still paused Sat/Sun → confirm auto-clears at/after Monday's session open, not before.
- [ ] Pause for Maintenance → advance past next session open → confirm it does **not** auto-clear (Maintenance never self-clears).
- [ ] Apply Temporary Open for 1 hour while a market is outside normal hours → confirm a trade succeeds server-side, not just that the UI shows OPEN.
- [ ] Let a Temporary Open window expire → confirm status falls back to schedule (`ACTIVE` or `CLOSED` correctly, depending on the clock at expiry).
- [ ] Flip the global kill switch → confirm every regional status collapses to `PLATFORM_PAUSED` regardless of their individual state, and non-admins are redirected to the maintenance screen everywhere in the app.
- [ ] Confirm the admin card, the user-facing `MarketStatusBanner`, and the buy/sell button in `QuickTradeModal` all show the same reason text for the same underlying state.
- [ ] Confirm Save Notice never changes status, pause reason, or override expiry — only the message string.
