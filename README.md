# Garmin Run Dashboard

A self-hosted, Raspberry Pi–ready dashboard for Garmin running data.
React + Vite + Tailwind v4 frontend, Flask + SQLite backend, per-user Garmin
fetcher run on a schedule (cron). No auth — intended for home-LAN use only.

`docs/plan.md` has the original project plan. **This README reflects the current
state**, which has grown well beyond that plan.

---

## Display target — a 1024×600 Raspberry Pi kiosk (design constraint)

The dashboard is built to run on a **1024×600, 7" Raspberry Pi monitor that is
display-only** (no touch, keyboard, or mouse). That shapes the whole UI:

- **Head-to-head, both runners at once.** Every tab compares the two runners on
  shared charts/tables, color-coded (Runner A = volt yellow, Runner B = blue) —
  there is no user switcher, because nothing on the Pi can click it.
- **Auto-rotating.** The app cycles through the 5 tabs every 20s hands-free
  (`ROTATE_MS` in `src/App.jsx`); a header ⏸/▶ button or a tab click pauses it
  for desktop inspection.
- **No scrolling — every tab fits 1024×600.** A height-gated compact mode
  (`@custom-variant short (@media (max-height:700px))` in `index.css` + the
  `useCompact()` hook at the same threshold) shrinks padding/spacing/charts on
  short screens only; the desktop dev view (≥701px tall) is left roomy.

> **Contributors / AI agents:** keeping every tab within the 600px budget is a
> hard requirement. After any UI change, verify at 1024×600 that the page does
> not scroll (`document.body.scrollHeight <= 600`) on **every** tab for **both**
> runners. See the "Raspberry Pi display fit" section in `CLAUDE.md`.

---

## Current state (2026-07-08)

- **Multi-user, shown head-to-head.** Supports multiple users (built for 2). Each
  user has their own Garmin account, data rows (`user_id` everywhere), and a
  display name (seeded from `.env`, editable in the DB). Both runners are compared
  side-by-side on every tab — there is no switcher (see the kiosk section above).
- **User 1** (currently named "Jeffrey") is fully populated: 141 runs
  (Feb 2025–Jul 2026), 60 days of daily wellness, and race predictions.
- **User 2** is wired up but **not yet connected** — add `GARMIN_EMAIL_2` /
  `GARMIN_PASSWORD_2` to `backend/.env` and sync to populate it.
- Developed & tested locally on **Windows**; **not yet deployed to the Pi**.
- A pre–multi-user DB backup exists at `backend/garmin.db.bak`.

### Dashboard tabs (each compares both runners head-to-head, fits 1024×600)
- **This Week** — a two-runner comparison table (distance/time/pace/runs),
  grouped daily-mileage bars, and an HR-zone doughnut per runner.
- **Calendar** — a run-frequency heatmap per runner (CSS grid, no API key) with a
  color legend + cross-training markers, plus frequency stats (runs/week, current
  & longest streak, longest layoff, busiest weekday) and a weekday sparkline.
- **History** — both runners' weekly mileage overlaid on one line chart, plus a
  total / avg-per-week / best-week comparison table.
- **Insights** — a resting-HR / HRV / sleep / VO₂max status row for both runners,
  plus a 2×2 grid of overlaid trend charts (VO₂max, resting HR, HRV, sleep).
- **Records** — personal bests per distance for both runners vs **Garmin race
  predictions**.

The kiosk shows only the comparison views above. The richer per-run detail
(power/dynamics, splits, GPS map) and the sortable activity log were removed from
the frontend — a display-only kiosk has no way to open them — along with the
`leaflet`/`react-leaflet` deps. The data still exists in the DB and is served by
`/api/activity/<id>` and `/api/activities` if a future interactive build wants it.

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
    components/       # TabNav, WeekView, CalendarView, HistoryView,
                      # InsightsView, RecordsView, CompareTable, RunnerLegend,
                      # WeeklyMileageChart, HRZoneDoughnut, CalendarHeatmap,
                      # CalendarStats, DataSourceBadge, RefreshButton
    App.jsx           # tab routing + 20s auto-rotation; passes both users to views
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
python fetch_garmin.py --login    # (re)authenticate with Garmin — needs a
                                  #   terminal + the 2FA code. See below.
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

### Garmin login & 2FA

**The accounts have 2FA on, so a fresh login can only be completed by a human.**
This is the thing that blocks a first sync on a new machine — not a library bug.
Email/password alone are not enough; Garmin issues a challenge and the code has to
be typed in.

```bash
cd backend
./venv/bin/python fetch_garmin.py --login   # per user: prompts for the 2FA code
```

That performs the full SSO login for every user in `.env` and writes the session
token to `.garmin_tokens*`. **Every later sync — including cron's — reuses the
cached token and needs no human.** Re-run `--login` only when the token expires.

Because cron has no stdin, an unattended sync **never** prompts: if no cached
token works, it fails immediately with `run: fetch_garmin.py --login` and a
non-zero exit, instead of dying inside a 2FA prompt nobody can answer. You'll also
see it on the kiosk — the header's "updated …" indicator turns **amber and reads
"⚠ stale"** once the last successful sync is over 24h old, which is the only thing
that would otherwise reveal a dead fetcher (the dashboard keeps happily showing
the last-synced numbers).

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

## Deploying to the Raspberry Pi (1024×600 kiosk)

`deploy/` holds everything Pi-specific:

| File | Purpose |
|---|---|
| `nginx.conf` | serves the built frontend on **:8080**, proxies `/api/` → Flask :5000 (leaves Pi-hole's :80 alone) |
| `garmin-api.service` | systemd unit for the Flask API (`Restart=always`) |
| `cron_setup.sh` | installs the hourly `fetch_garmin.py` sync (all users) |
| `kiosk.sh` | launches Chromium full-screen at the dashboard + keeps the screen awake |
| `kiosk_setup.sh` | autostarts `kiosk.sh` on desktop login |

### 1. Code, API service, web server, sync
```bash
git clone https://github.com/jftchau/garmin-dashboard ~/garmin-dashboard
cd ~/garmin-dashboard/backend
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cp .env.example .env                                # fill in Garmin creds (both users)
./venv/bin/python fetch_garmin.py --wellness 90     # initial full pull incl. wellness
cd ../frontend && npm ci && npm run build           # build → dist/

sudo cp ../deploy/garmin-api.service /etc/systemd/system/
sudo systemctl enable --now garmin-api
sudo cp ../deploy/nginx.conf /etc/nginx/sites-available/garmin
sudo ln -sf /etc/nginx/sites-available/garmin /etc/nginx/sites-enabled/
sudo systemctl reload nginx
bash ../deploy/cron_setup.sh
```
The service/nginx files assume the repo is at `/home/pi/garmin-dashboard` — adjust
paths if you cloned elsewhere.

### 2. Kiosk display (the wall-mounted part)
```bash
sudo apt install -y chromium-browser unclutter
sudo raspi-config     # System Options → Boot / Auto Login → "Desktop Autologin"
bash ~/garmin-dashboard/deploy/kiosk_setup.sh   # autostart full-screen Chromium
sudo reboot
```
`kiosk.sh` opens `http://localhost:8080` in `--kiosk` mode and disables screen
blanking via X11 `xset`. On a **Wayland** Pi OS (the Bookworm default) `xset` is a
no-op — either switch to the X11 session (`raspi-config` → Advanced → Wayland → X11)
or disable blanking through the compositor (e.g. `swayidle timeout 0 true`, or a
labwc `~/.config/labwc/autostart` entry).

### 3. Hardware config for the 1024×600 panel
- **Timezone matters** — the "this week" window and streak math use local time.
  `sudo raspi-config` → Localisation → Timezone (or `sudo timedatectl set-timezone
  <Area/City>`). Otherwise weeks/streaks can be a day off.
- **Force the resolution / kill overscan** only if the panel is letterboxed or
  mis-sized, in `/boot/firmware/config.txt` (older images: `/boot/config.txt`):
  ```ini
  disable_overscan=1
  hdmi_group=2
  hdmi_mode=87
  hdmi_cvt=1024 600 60 6 0 0 0
  ```

Every tab is built to fit **1024×600 with no scroll** — see the display-target
section up top and `CLAUDE.md`. See "Phase 5" of `docs/plan.md` for background.

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

## Contributing / pushing changes

Work on a branch and open a PR — never commit straight to `main` (it's protected
from force-pushes).

```bash
git checkout -b my-change      # 1. new branch
git commit -am "…"             # 2. commit (.env / *.db / tokens are gitignored)
git push -u origin my-change   # 3. push — prints a "Create a pull request" URL
```

Then **open a PR against `main` on GitHub** (the printed URL or the repo's *Pull
requests* tab) and review/merge it there. `CLAUDE.md` has the full workflow,
including the REST-API fallback for automation (the `gh` CLI isn't installed on
the dev box).

---

## Notes

- Auth: none — home LAN only.
- Refresh: the header button POSTs `/api/sync-now` (syncs all users); cron also
  runs on a schedule.
- Credentials live only in `backend/.env` (gitignored).
