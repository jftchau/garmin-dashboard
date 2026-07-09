# CLAUDE.md — Garmin Run Dashboard

Self-hosted, multi-user Garmin **running** dashboard. Flask + SQLite backend,
React + Vite + Tailwind v4 frontend. No auth (home-LAN only). Read `README.md`
for the full picture and `docs/plan.md` for history/status.

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
  already-synced run. Use `--full` to force reprocessing.
- **Mock fallback**: `frontend/src/api.js` silently returns mock data on any
  fetch error — a broken backend can look like real (wrong) data. When mock
  values appear (e.g. 5K = 23:10), suspect the backend, not the frontend.
- Flask `FLASK_DEBUG` is off by default (no reloader) — **restart `app.py`** to
  pick up backend route changes.

## Don't

- Commit `.env`, `*.db`, `*.db.bak`, or `.garmin_tokens*` (all gitignored).
- Assume training status/readiness data exists (empty/unsupported on the test
  account — UI already handles the "—" case).

## Current state / next steps

User 1 ("Jeffrey") is fully populated. User 2 is configured but **not connected**
— add `GARMIN_EMAIL_2`/`GARMIN_PASSWORD_2` to `backend/.env` and sync. Not yet
deployed to the Pi (`deploy/` scripts are Linux/systemd/cron/nginx).
