# Temporary Open — patch notes

Re-implements the "Temporary Open" market override that was removed earlier, this time
built on a single shared state-resolver so it can't drift out of sync between the admin
panel and actual trade execution (which is what broke it last time — see the full plan in
`market-control-implementation-plan.md` for the root-cause writeup).

## Files changed

- `server/models/AppSettings.js` — added `marketOverrideUntilIN` / `marketOverrideUntilUS` (Date, nullable).
- `server/utils/marketAccess.js` **(new)** — the single source of truth for market status:
  `getExchangeHoursStatus()` and `resolveRegionalStatus()`, precedence: Global pause →
  Holiday → Maintenance → Timed Open → Schedule.
- `server/controllers/adminController.js` — now imports the shared resolver instead of a
  local copy; `PUT /admin/market-status` accepts new `marketOverrideHoursIN` /
  `marketOverrideHoursUS` (`1 | 4 | 8 | 24`) to apply a timed override, clears it correctly
  on Resume/Holiday/Maintenance, and logs it to the audit trail.
- `server/controllers/tradeController.js` — buy/sell validation (`assertMarketOpen`) now
  calls the same shared resolver instead of its own separate schedule-hours calculation, so
  a market shown as open during a Temporary Open window actually accepts trades.
- `server/middleware/validate.js` — `marketStatusSchema` accepts the new override-hours
  fields, restricted server-side to the same four durations the UI offers.
- `client/src/pages/Admin/Admin.jsx` / `Admin.css` — adds a fourth "Temporary Open" preset
  per market with an inline 1h/4h/8h/24h picker (only visible when selected), and a small
  note showing the override's expiry time once applied.

## No database migration needed

The new `AppSettings` fields default to `null` on both new and existing documents —
Mongoose will simply add them the next time the settings document is saved. Nothing to run.

## To apply

Copy these files into the matching paths in `stocksim-pro/`, overwriting the originals,
then:

```bash
cd stocksim-pro/server && node index.js
cd stocksim-pro/client && npm run dev   # or npm run build for production
```

## What to test

1. Open the Market Engine page, pick **Temporary Open** on the Indian market card, choose
   **1h**, click Apply. The pill should read OPEN and a note should show the expiry time,
   even if it's currently outside NSE/BSE hours.
2. Attempt a live Indian-stock trade during that window — it should succeed (this is the
   part that was previously broken: the UI said open, but the trade endpoint disagreed).
3. Wait for (or simulate) the override expiring — status should fall back to `ACTIVE` or
   `CLOSED` purely based on the schedule, with no admin action required.
4. Click **Holiday** or **Maintenance** while a Temporary Open is active — confirm it
   correctly overrides and clears the timed override (pause always wins going forward).
5. Click **Resume Market** — confirm it also clears any lingering override, returning full
   control to the schedule.

See `market-control-implementation-plan.md` for the full spec and the pre-existing test
checklist this addition doesn't affect (Holiday auto-clear, Maintenance persistence, global
kill switch, refresh-doesn't-clobber-selection, etc.) — those paths were untouched by this
patch and should still be re-verified together with the above.
