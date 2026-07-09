# Garmin Run Dashboard

A self-hosted, Raspberry Pi–ready dashboard for Garmin running data.
React + Vite + Tailwind v4 frontend, Flask + SQLite backend, per-user Garmin
fetcher run on a schedule (cron). No auth — intended for home-LAN use only.

`docs/plan.md` has the original project plan. **This README reflects the current
state**, which has grown well beyond that plan.

---

## Current state (2026-07-08)

- **Multi-user.** Supports multiple users (built for 2). Each user has their own
  Garmin account, data rows (`user_id` everywhere), and an editable display name.
  A user switcher lives in the dashboard header.
- **User 1** (currently named "Jeffrey") is fully populated: 141 runs
  (Feb 2025–Jul 2026), 60 days of daily wellness, and race predictions.
- **User 2** is wired up but **not yet connected** — add `GARMIN_EMAIL_2` /
  `GARMIN_PASSWORD_2` to `backend/.env` and sync to populate it.
- Developed & tested locally on **Windows**; **not yet deployed to the Pi**.
- A pre–multi-user DB backup exists at `backend/garmin.db.bak`.

### Dashboard tabs
- **This Week** — headline distance/time/pace, daily-mileage **bar chart** (only
  days that have occurred are drawn), HR-zone doughnut, this week's runs.
- **Calendar** — GitHub-style run-frequency heatmap (CSS grid, no API key).
- **History** — range-filtered weekly-mileage line chart + full activity log
  (run names + colored training-effect badges, sortable).
- **Insights** — current-status cards (resting HR, HRV, sleep, Body Battery,
  stress, training status) + trend charts: VO₂max, resting HR, HRV, sleep,
  weekly intensity minutes vs the 150-min WHO goal, weekly training load (kJ).
- **Records** — personal bests vs **Garmin race predictions** (green gap = Garmin
  thinks you can beat your logged PR).
- **Activity modal** — full stats incl. running power & dynamics, calories,
  temperature, hydration, splits, and a lazy-loaded Leaflet GPS map.

---

## Repo layout

```
backend/
  schema.sql          # SQLite tables (multi-user)
  db.py               # connection helper + schema migrations (_migrate)
  fetch_garmin.py     # per-user Garmin fetcher (activities + daily wellness)
  app.py              # Flask read-only API + /api/sync-now + user management
  requirements.txt    # garminconnect, flask, flask-cors, python-dotenv
  .env.example        # per-user credentials + config
frontend/
  src/
    api.js            # fetch wrappers; setCurrentUser(); mock-data fallback
    utils.js          # formatters + training-effect colors
    mock/mockData.js  # mock API responses for UI-only dev
    components/       # TabNav, UserSwitcher, WeekView, CalendarView,
                      # HistoryView, InsightsView, RecordsView, ActivityModal,
                      # RunMap, WeeklyMileageChart, HRZoneDoughnut,
                      # CalendarHeatmap, ActivityTable, TrainingEffectBadge,
                      # RefreshButton
    App.jsx           # tab routing, user switching (remounts views on switch)
    index.css         # Tailwind v4 @theme tokens (Garmin black/volt-yellow)
  vite.config.js      # dev server + /api proxy — pinned to IPv4 127.0.0.1
deploy/               # nginx.conf, garmin-api.service, cron_setup.sh (Pi)
docs/plan.md          # original plan
```

---

## Data model (SQLite)

- `users` — `id, slot, name, garmin_email`. `slot` maps to the `.env` credential
  slot (1, 2, …); `name` is editable in the UI.
- `activities` — one row per run, `user_id` FK. Includes rich summary metrics
  (power, running dynamics, calories, intensity minutes, temperature, etc.) and
  the full `raw_json` payload.
- `personal_records` — PK `(user_id, distance_name)`.
- `user_metrics` — daily wellness, PK `(user_id, date)`: vo2max (watch value),
  resting_hr, sleep, HRV, body battery, stress, training status.
- `race_predictions` — PK `(user_id, date)`: predicted 5K/10K/half/marathon.
- `sync_log` — per-user sync history.

`db.py init_db()` runs `schema.sql` then `_migrate()`, which upgrades older
single-user databases in place (adds `user_id`, rebuilds composite-PK tables,
assigns existing rows to the first user). Safe to run every start.

### Two VO₂max numbers (don't confuse them)
- `activities.vo2max` — each **run's** estimate (integer, only on harder runs).
  This is the **trend** line in Insights.
- `user_metrics.vo2max` — the **watch's** daily VO₂max from Garmin's Max Metrics
  endpoint. This is the **"current"** headline (matches the device).

---

## API (all read-only except the last three)

Every data endpoint accepts `?user=<id>` (defaults to the first user).

| Method | Path | Returns |
|---|---|---|
| GET | `/api/users` | list of users |
| PATCH | `/api/users/<id>` | rename a user (`{"name": ...}`) |
| GET | `/api/activities?limit=&offset=` | paginated run list |
| GET | `/api/activity/<id>` | full detail incl. polyline + splits |
| GET | `/api/this-week` | daily distances, totals, HR zones, runs |
| GET | `/api/weekly-mileage` | all-time weekly distance array |
| GET | `/api/calendar?days=365` | daily distances for the heatmap |
| GET | `/api/personal-records` | 1K/5K/10K/Half/Marathon bests |
| GET | `/api/vo2max-trend` | `{current, current_date, trend[]}` |
| GET | `/api/weekly-insights` | weekly intensity minutes + training load |
| GET | `/api/race-predictions` | predicted race times (seconds) |
| GET | `/api/wellness-trend?days=90` | daily wellness rows |
| GET | `/api/current-status` | latest value of each daily metric |
| GET | `/api/health` | `{"status":"ok"}` |
| POST | `/api/sync-now` | runs `fetch_garmin.py` (syncs **all** users) |

---

## The fetcher (`fetch_garmin.py`)

Loops over every user configured in `.env` and syncs into their `user_id` rows.

```bash
python fetch_garmin.py            # incremental sync (default) — all users
python fetch_garmin.py --full     # re-fetch & re-process every run
python fetch_garmin.py --backfill # repopulate Tier-1 summary columns from
                                  #   stored raw_json (no Garmin API calls)
python fetch_garmin.py --wellness [days]   # backfill daily wellness + race
                                           #   predictions (default 90 days)
```

- **Incremental**: skips runs already in the DB and stops paging as soon as a
  page contains an already-synced run (Garmin returns newest-first). A routine
  sync is one page + detail calls for genuinely new runs → a few seconds.
- Makes **2 detail calls per new activity** (splits, polyline); HR zones and all
  Tier-1 metrics come from the activity summary.
- On every sync it also refreshes the last `DAILY_METRICS_WINDOW` (=3) days of
  daily wellness + current race predictions per user. Full history is a one-time
  `--wellness` run.
- Session tokens cached per user (`.garmin_tokens`, `.garmin_tokens_2`).

---

## Configuration (`backend/.env`)

```ini
# User 1 (required)
GARMIN_EMAIL=you@example.com
GARMIN_PASSWORD=your-password
GARMIN_TOKEN_STORE=.garmin_tokens
USER1_NAME=                 # optional; display name is editable in the UI

# User 2 (optional) — fill in to enable a second profile
GARMIN_EMAIL_2=
GARMIN_PASSWORD_2=
GARMIN_TOKEN_STORE_2=.garmin_tokens_2
USER2_NAME=

DB_PATH=garmin.db
FLASK_PORT=5000
FLASK_DEBUG=0               # set 1 for the Flask reloader locally
```

`.env` is gitignored; passwords stay in the backend (never sent to the browser
or stored in the DB).

---

## Quick start (development)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate                       # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                         # fill in Garmin credentials
python fetch_garmin.py                        # initial pull → garmin.db
python fetch_garmin.py --wellness 90          # (optional) daily-wellness history
python app.py                                 # Flask API on 127.0.0.1:5000
```
If a Garmin account uses **MFA**, the first login prompts for a code, so run that
first `fetch_garmin.py` from a real terminal; it caches a token afterward.

### Frontend
```bash
cd frontend
npm install
npm run dev                                   # http://127.0.0.1:5173, proxies /api → :5000
npm run build                                 # production build → frontend/dist
```
The UI falls back to mock data (`src/mock/mockData.js`) if the backend is down.

### Windows dev notes (this machine)
- **Default encoding is GBK.** Prefix Python with `PYTHONUTF8=1` for
  `pip install` (a transitive dep builds from source and reads UTF-8 files) and
  when running the fetcher. See the `windows-gbk-encoding-pip` memory.
- **Node** installed via `winget install OpenJS.NodeJS.LTS`. npm 11 blocks
  esbuild's postinstall — run `npm rebuild esbuild` once if Vite won't start.
- **Vite is pinned to IPv4** (`server.host: 127.0.0.1`) and proxies to
  `127.0.0.1:5000`, because Windows `localhost` can resolve to IPv6 `::1` while
  Flask listens on IPv4 only.

---

## Deploying to the Raspberry Pi

`deploy/` holds `nginx.conf` (serves the built frontend on :8080, proxies
`/api` → Flask on :5000), `garmin-api.service` (systemd unit), and
`cron_setup.sh` (hourly `fetch_garmin.py`, which now syncs all users). See the
"Phase 5" section of `docs/plan.md`. Pi-hole on port 80 is untouched.

---

## Known caveats / gotchas

- **Silent mock fallback**: `api.js` returns mock data on any fetch error, so a
  backend failure can quietly show plausible-but-fake numbers. (A visible
  "offline / sample data" indicator is a nice-to-have, not yet built.)
- **Training status** comes back empty on the test account — the Insights
  "Status" card shows "—". **Training readiness** isn't supported on that watch.
- **Gear/shoe** data is empty (the summary payload doesn't include it, and no
  gear was logged); the shoe-mileage idea is parked.
- Garmin `startTimeLocal` is space-separated (`"2026-07-06 08:30:00"`); the
  "This Week" query compares on the date prefix to avoid dropping Monday runs.

---

## Notes

- Auth: none — home LAN only.
- Refresh: the header button POSTs `/api/sync-now` (syncs all users); cron also
  runs on a schedule.
- Credentials live only in `backend/.env` (gitignored).
