# CLAUDE.md — Garmin Run Dashboard

Self-hosted, multi-user Garmin **running** dashboard. Flask + SQLite backend,
React + Vite + Tailwind v4 frontend. No auth (home-LAN only). Read `README.md`
for the full picture and `docs/plan.md` for history/status.

## ⚠️ Raspberry Pi display fit — READ BEFORE ANY UI CHANGE

The dashboard's target hardware is a **1024×600, 7" Raspberry Pi monitor,
display-only (no touch / keyboard / mouse)**. This is a hard design constraint,
not a preference. It keeps getting broken by well-meaning feature additions, so:

- **Every tab MUST fit 1024×600 with NO scroll** — you cannot scroll a display-
  only screen, so anything below the fold is invisible forever. After *any*
  view/chart change, verify at 1024×600 that `document.body.scrollHeight <= 600`
  on **every** tab, for **both** runners (`preview_resize` to 1024×600, then
  `preview_eval`). The usable content budget is ~505px (95px is header + tabs).
- **Both runners are shown head-to-head** — there is NO user switcher (nothing to
  click on the Pi). Views fetch both users with `useTwoUsers()`; runner colors
  are `RUNNER_COLORS` / `RUNNER_RGB` + `runnerName()` in `utils.js` (Runner A =
  volt yellow, Runner B = blue). Use `CompareTable` for metric comparisons.
- **The app auto-rotates** through the 5 tabs every `ROTATE_MS` (=20s) in
  `App.jsx`; the header ⏸/▶ button or a manual tab click pauses it.
- **Height-gated compact mode**: `@custom-variant short (@media (max-height:700px))`
  in `index.css` plus the `useCompact()` hook (`useCompact.js`) at the SAME 700px
  threshold — keep them in sync. Use `short:` utilities for denser padding/
  spacing/smaller charts on the Pi; Recharts need a numeric pixel height from
  `useCompact()` (CSS can't reach them). Desktop (≥701px tall) is intentionally
  left roomy — don't "fix" the extra whitespace there.

**Adding a feature to a tab?** Keep it in the 600px budget: prefer a compact
horizontal strip over a tall stacked block, and re-verify no-scroll at 1024×600
for both runners before finishing. Worked example: `CalendarStats.jsx` puts its
frequency stats + weekday sparkline in **one row**, not a stacked grid, so two
runners still fit.

## Run it (Windows dev machine)

This machine's default encoding is **GBK** — prefix Python with `PYTHONUTF8=1`.

```bash
# Backend (from backend/)
PYTHONUTF8=1 ./venv/Scripts/python.exe app.py            # Flask on 127.0.0.1:5000

# Fetcher (from backend/)
PYTHONUTF8=1 ./venv/Scripts/python.exe fetch_garmin.py             # incremental sync, all users
PYTHONUTF8=1 ./venv/Scripts/python.exe fetch_garmin.py --full      # re-fetch everything
PYTHONUTF8=1 ./venv/Scripts/python.exe fetch_garmin.py --backfill  # Tier-1 cols from raw_json (no API)
PYTHONUTF8=1 ./venv/Scripts/python.exe fetch_garmin.py --wellness 90  # daily-wellness history

# Frontend (from frontend/)
npm run dev            # http://127.0.0.1:5173  (proxies /api -> 127.0.0.1:5000)
npm run build          # prod build -> dist/
```

- `pip install` also needs `PYTHONUTF8=1` (a transitive dep builds from source).
- Vite is pinned to IPv4 (`server.host: 127.0.0.1`) because Windows `localhost`
  can resolve to `::1` while Flask is IPv4-only. If Vite won't start after a
  fresh `npm install`, run `npm rebuild esbuild` (npm 11 blocks its postinstall).
- To preview/verify UI changes use the `preview_*` tools, not raw `npm`.

## Architecture facts that matter

- **Multi-user**: `users` table + `user_id` on every data table. API endpoints
  take `?user=<id>` (default = first user). Credentials per slot in `.env`
  (`GARMIN_EMAIL[_2]` / `GARMIN_PASSWORD[_2]`). Names are editable in the UI and
  stored in `users.name` — **don't** overwrite them from env on sync.
- **DB migrations** run automatically in `db.py init_db()` → `_migrate()`
  (adds columns, rebuilds composite-PK tables). Safe to re-run.
- **Two VO₂max numbers**: `activities.vo2max` = per-run (Insights *trend*);
  `user_metrics.vo2max` = watch's Max-Metrics value (Insights *current*).
- **Incremental fetch**: skips known `garmin_id`s and stops paging at the first
  already-synced activity. Use `--full` to force reprocessing.
- **Non-runs = cross-training context**: the fetcher stores *all* activity types
  (`activities.activity_type` = Garmin typeKey), but non-runs are lightweight —
  no splits/polyline detail calls. Every run-only stat filters on the `RUN_ONLY`
  predicate (`app.py`) / `LIKE '%running%'`; only the Calendar heatmap surfaces
  non-runs, as a slate "cross-training" marker on days with no run. Legacy rows
  have `activity_type = NULL` (treated as running via COALESCE). **Historical
  non-runs only appear after a `--full` re-sync** — incremental won't backfill
  them (paging stops at the first already-synced activity).
- **Mock fallback**: `frontend/src/api.js` silently returns mock data on any
  fetch error — a broken backend can look like real (wrong) data. When mock
  values appear (e.g. 5K = 23:10), suspect the backend, not the frontend.
- Flask `FLASK_DEBUG` is off by default (no reloader) — **restart `app.py`** to
  pick up backend route changes.

## Pushing changes & opening a PR

**Never commit straight to `main`** — it's the default branch and is protected
from force-pushes. Always branch → push → open a PR that a human reviews and
merges on the GitHub website.

1. **Branch** off the current work: `git checkout -b <short-descriptive-name>`.
2. **Commit.** `.env`, `*.db`, `*.db.bak`, and `.garmin_tokens*` are gitignored —
   don't force-add them. End commit messages with the
   `Co-Authored-By: Claude <noreply@anthropic.com>` trailer.
3. **Push:** `git push -u origin <branch>`. The repo is preconfigured with the
   local proxy (`http.proxy = http://127.0.0.1:3213`) and a cached PAT, so this
   works without prompting. The push prints a "Create a pull request for
   '<branch>'" URL.
4. **Open a PR targeting `main`:**
   - **Default — on the website:** open the printed URL (or the repo's *Pull
     requests* tab), set **base = `main`**, and create it. The user reviews &
     merges there.
   - `gh` CLI is **not installed** here, so `gh pr create` won't work. An agent
     that must open the PR itself can POST to the GitHub REST API through the
     proxy with the cached token (never hard-code the token):
     ```bash
     TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')
     curl -sS -x http://127.0.0.1:3213 \
       -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
       https://api.github.com/repos/jftchau/garmin-dashboard/pulls \
       -d '{"title":"…","head":"<branch>","base":"main","body":"…"}'
     ```
5. **Never force-push `main`.** The user verifies and merges the PR on GitHub.

## Don't

- Commit `.env`, `*.db`, `*.db.bak`, or `.garmin_tokens*` (all gitignored).
- Assume training status/readiness data exists (empty/unsupported on the test
  account — UI already handles the "—" case).

## Current state / next steps

Both runners are populated and connected — **Jeffrey** (user 1) and **Eugenia**
(user 2). The UI is the two-runner auto-rotating kiosk (see the display-fit
section above). `deploy/` now includes the kiosk scripts (`kiosk.sh`,
`kiosk_setup.sh`) alongside nginx/systemd/cron; see the "Deploying to the
Raspberry Pi" section of `README.md`. **Not yet physically deployed to the Pi.**
Note: Eugenia's daily-wellness history may be thin until
`fetch_garmin.py --wellness 90` is run for user 2.
