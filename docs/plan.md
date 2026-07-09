# Garmin Run Dashboard – Project Plan & Status

The original plan (architecture, phases, schema, deployment) plus a running
status of what's been built. `README.md` is the authoritative description of the
**current** codebase; this file keeps the original intent and tracks progress
against it.

**Status as of 2026-07-08:** Phases 0–4 complete and running locally on Windows.
Enhancements beyond the original plan (Tiers 1–3 + multi-user) are done. Phase 5
(Pi deployment) is the main remaining work. See "Progress" below.

## Requirements summary

| Area | Decision | Status |
|------|----------|--------|
| Activities | Only runs initially (gym/cycling/swim later expandable) | Runs only |
| Metrics | distance, time, pace, HR (avg/max/zones), cadence, elevation, splits, training effect, VO2 max, weather, gear | Done + extended (power, running dynamics, calories, hydration, intensity minutes, temperature) |
| Time focus | Primary: current week. Secondary: monthly/yearly, all-time, filters | This Week + History range filters |
| Personal records | Auto-calc 1K, 5K, 10K, half, marathon | Done (±3% tolerance, pace-normalized) |
| Live data | None — static between fetches | As planned |
| Charts | Weekly mileage line, HR zone doughnut, calendar heatmap | Done + Insights charts (VO₂max, resting HR, HRV, sleep, intensity, load) |
| Maps | Leaflet + OSM (no key) | Per-activity map in the detail modal |
| Tables | Activity log, best efforts | Done (log has run names + training-effect badges) |
| Layout | Tabs | This Week / Calendar / History / **Insights** / Records |
| Auth | None (home network only) | None (now multi-user, still no auth) |
| Theme | Dark, Garmin black & yellow | Done (Space Grotesk + JetBrains Mono) |
| Data refresh | Manual button + hourly cron | Manual button syncs all users; cron for the Pi |
| Stack | React (Vite) + Tailwind + Recharts + Leaflet, Flask + SQLite | As planned (Tailwind v4) |
| Users | (not in original plan) | **Multi-user** — per-user Garmin account, editable names |
| Pi-hole coexistence | Dashboard :8080, Pi-hole on :80 | Config ready (`deploy/`) |
| Secrets | `.env`, gitignored | Per-user credentials in `.env` |

## Architecture

```
[Cron: fetch_garmin.py]  -- scheduled; loops over all users in .env
        |                   (activities + daily wellness + race predictions)
        v
 [SQLite: garmin.db]        -- multi-user (user_id on every table)
        |
        v
 [Flask API: app.py]        -- 127.0.0.1:5000; endpoints scoped by ?user=<id>
        |
        v
 [Nginx :8080]              -- serves React dist/, proxies /api -> Flask
        |
        v
 [React dashboard]          -- user switcher in header; per-user views
```

## Phases & progress

- [x] **0. Repo + folder structure**
- [x] **1. `fetch_garmin.py`** — pulls activities, computes PRs, writes SQLite.
      Now **incremental** (skips known runs, stops paging early) and **per-user**.
- [x] **2. `app.py`** — Flask read-only API over SQLite; all data endpoints
      user-scoped; adds user management + `/api/sync-now`.
- [x] **3. React frontend** — tabs, charts, map, mock-data mode.
- [x] **4. PC dev/testing** — verified end-to-end with real data on Windows.
- [ ] **5. Pi deployment** — systemd + nginx :8080 + cron. Scripts exist in
      `deploy/`; cron runs `fetch_garmin.py` (all users). **Not yet done.**
- [~] **6. Polish** — sync-now button ✓, theme ✓, auto-refresh/​multi-sport not done.

## Enhancements beyond the original plan (all complete)

- **Tier 1 — richer run data**: surfaced summary metrics already in `raw_json`
  into columns (power, running dynamics, calories, intensity minutes,
  temperature, run names) + training-effect badges; dropped a redundant HR-zones
  API call. Backfilled via `fetch_garmin.py --backfill`.
- **Tier 2 — insight charts**: VO₂max trend, weekly intensity vs the 150-min WHO
  goal, weekly training load (kJ from running power). VO₂max headline uses the
  watch's Max-Metrics value; the trend uses per-run estimates.
- **Tier 3 — daily wellness + race predictions**: resting HR, sleep, HRV, Body
  Battery, stress (in `user_metrics`), and Garmin race-time predictions
  (`race_predictions`) shown vs actual PRs. Historical backfill via
  `fetch_garmin.py --wellness [days]`.
- **Multi-user**: `users` table + `user_id` across all data tables; `.env`
  credential slots (user 1 / user 2); user switcher + inline rename in the UI;
  in-place DB migration in `db.py`.

## Known limitations / parked ideas

- Second user is configured but not yet connected (needs `GARMIN_EMAIL_2` creds).
- Training status returns empty on the test account; training readiness is
  unsupported on that watch.
- Gear/shoe data is empty → shoe-mileage tracker parked.
- `api.js` silently falls back to mock data on fetch errors (no "offline"
  indicator yet).
- Multi-sport (cycling/swimming) and auto-refresh-on-load remain future work.

See `README.md` for the API reference, data model, fetcher flags, `.env` config,
and Windows dev gotchas.
