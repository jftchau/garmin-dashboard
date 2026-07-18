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

- **Head-to-head, both runners at once.** Most slides compare the two runners on
  shared charts, color-coded (Runner A = volt yellow, Runner B = blue) — there is
  no user switcher, because nothing on the Pi can click it. A few slides show one
  runner at a time, where a head-to-head would halve the graphic.
- **Read from across the room.** One idea per slide at the largest size the
  screen allows, rather than several panels per screen. Slides fill the viewport
  via flexbox (`h-screen` → `flex-1 min-h-0` → charts at `height="100%"`), so
  graphics scale with the display instead of sitting in fixed-height boxes.
- **Auto-rotating.** The app cycles through the slides in `src/slides.jsx` every
  14s hands-free (`ROTATE_MS` in `src/App.jsx`); a header ⏸/▶ button or clicking
  the position bar pauses it for desktop inspection.
- **No scrolling — every slide fits 1024×600.** A height-gated compact mode
  (`@custom-variant short (@media (max-height:700px))` in `index.css` + the
  `useCompact()` hook at the same threshold) shrinks padding/spacing on short
  screens only; the desktop dev view (≥701px tall) is left roomy.

> **Contributors / AI agents:** keeping every slide within the 600px budget is a
> hard requirement. After any UI change, verify at 1024×600 that the page does
> not scroll (`document.body.scrollHeight <= 600`) on **every** slide for
> **both** runners. Prefer adding a slide over crowding an existing one. See the
> "Raspberry Pi display fit" section in `CLAUDE.md`.

---

## Current state (2026-07-18)

- **Multi-user, shown head-to-head.** Supports multiple users (built for 2). Each
  user has their own Garmin account, data rows (`user_id` everywhere), and a
  display name (seeded from `.env`, editable in the DB). Both runners are compared
  side-by-side on most slides — there is no switcher (see the kiosk section above).
- **Both users are connected and populated** — "Jeffrey" (user 1) and "Eugenia"
  (user 2), each with runs, non-run cross-training, daily wellness and race
  predictions. Credentials live in `backend/.env` (`GARMIN_EMAIL[_2]` /
  `GARMIN_PASSWORD[_2]`).
- Developed & tested locally on **Windows**; **not yet deployed to the Pi**.
- A pre–multi-user DB backup exists at `backend/garmin.db.bak`.

### Slides (in rotation order; each fits 1024×600)
- **This week** — distance / time / pace / runs per runner at headline size, with
  the week-over-week change in volume.
- **&lt;Runner&gt; · training week** (one slide each) — daily run distance in km with
  **last week's volume ghosted behind it** for comparison, plus that day's
  **strength and other-training hours** stacked on a right-hand axis. Two axes
  because km and hours are different units; running is no longer the only thing
  on the chart.
- **Training mix** — weekly training *hours* split running / strength / other
  over the last 10 weeks, per runner. Time is the one unit every activity type
  shares, so this is the view that shows a hot-weather swap from running to gym.
- **Heart rate zones** — this week's zone split per runner.
- **Weekly mileage** / **Mileage summary** — 26 weeks overlaid on one line chart,
  then total / avg-per-week / best-week per runner.
- **&lt;Runner&gt; · run frequency** (one slide each) — 12-month heatmap with
  cross-training markers, plus frequency stats (runs/week, current & longest
  streak, longest layoff, busiest weekday).
- **Personal records · short / long** — bests for 1K–10K and half/marathon vs
  **Garmin race predictions**.
- **Today's readiness** — resting HR / HRV / sleep score / VO₂max per runner.
- **Heart · 90 days** / **Fitness & sleep · 90 days** — resting-HR + HRV, then
  VO₂max + sleep trends, overlaid for both runners.

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
    slides.jsx        # the carousel's running order (SLIDES) + per-slide titles
    components/
      slides/         # one file per slide: WeekTotals, WeekVolume, TrainingMix,
                      # HRZones, Mileage (trend + summary), Frequency, Records,
                      # Body (heart / fitness trends + readiness)
                      # shared: Slide (frame, Panel, BigStat), SlideNav,
                      # WeekVolumeChart, WeeklyMileageChart, HRZoneDoughnut,
                      # CalendarHeatmap, CalendarStats, RunnerLegend,
                      # DataSourceBadge, LastSyncBadge, RefreshButton
    App.jsx           # slide carousel + 14s auto-rotation; passes both users down
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
  This is the **trend** line on the fitness-trends slide.
- `user_metrics.vo2max` — the **watch's** daily VO₂max from Garmin's Max Metrics
  endpoint. This is the **"current"** headline on the readiness slide (matches
  the device).

---

## API (all read-only except the last three)

Every data endpoint accepts `?user=<id>` (defaults to the first user).

| Method | Path | Returns |
|---|---|---|
| GET | `/api/users` | list of users |
| PATCH | `/api/users/<id>` | rename a user (`{"name": ...}`) |
| GET | `/api/activities?limit=&offset=` | paginated run list |
| GET | `/api/activity/<id>` | full detail incl. polyline + splits |
| GET | `/api/this-week` | daily distances, totals, HR zones, runs, **last week's daily volume**, **per-day cross-training minutes** |
| GET | `/api/weekly-mileage` | all-time weekly distance array |
| GET | `/api/training-mix?weeks=10` | weekly training **hours** split run / strength / other |
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
| `install.sh` | renders + installs the nginx site and systemd unit for **this** host (path/user detected, no hand-editing) |
| `nginx.conf.template` | serves the built frontend on **:8080**, proxies `/api/` → Flask :5000 (leaves Pi-hole's :80 alone) |
| `garmin-api.service.template` | systemd unit for the Flask API (`Restart=always`) |
| `cron_setup.sh` | installs the hourly `fetch_garmin.py` sync (all users) |
| `update.sh` | **upgrade this host**: pull `main`, rebuild, restart, health-check, roll back on failure |
| `update_setup.sh` | installs the daily 04:30 self-update timer |
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

bash ../deploy/install.sh          # nginx site + systemd unit, rendered for this host
bash ../deploy/cron_setup.sh       # hourly sync
bash ../deploy/update_setup.sh     # daily 04:30 self-update (see below)
```
`install.sh` substitutes the real repo path and OS user into the two `.template`
files, so **nothing is tied to a particular home directory** — clone anywhere, run
it as your normal user (it sudo's on its own), and re-run it any time. Use
`bash deploy/install.sh --dry-run` first to see exactly what it would change
against the live config.

The Garmin accounts have 2FA, so the first sync needs one interactive login:
`./venv/bin/python fetch_garmin.py --login` (see "Garmin login & 2FA" above).

### 1b. Upgrading (CI/CD)

Merge a PR into `main` → CI proves it builds → the Pi picks it up **at 04:30**,
health-checks itself, and rolls back if the new code doesn't come up.

```bash
bash deploy/update.sh           # upgrade right now (no-op if main hasn't moved)
bash deploy/update.sh --force   # rebuild + restart even if it hasn't
journalctl -u garmin-update -n 50   # what the timer did
systemctl list-timers garmin-update.timer
```

What `update.sh` does, in order: take a lock the hourly sync also respects →
**back up `garmin.db`** (keeps 7; `db.py` migrations run on boot and can rebuild
tables, so a bad deploy can touch data) → pull → reinstall pip deps *only* if
`requirements.txt` changed → build the frontend **to a temp dir and swap it in**
(never into the live `dist/`, which nginx is serving) → restart `garmin-api` →
poll `/api/health`. **Any failure rolls back** to the previous commit and `dist/`.

The kiosk then reloads itself: `update.sh` stamps the deployed SHA into
`dist/version.json`, and `useVersionCheck.js` polls it and calls `location.reload()`
when it changes. That indirection exists because the kiosk is autostarted
Chromium, not a service — a deploy *cannot* restart it (killing Chromium leaves a
blank desktop), and a display-only screen has nothing to press F5 with.

`update_setup.sh` also installs one narrow passwordless-sudo rule
(`/etc/sudoers.d/garmin-update`) allowing only `systemctl restart garmin-api` —
the unattended timer runs as you and can't type a password.

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

Every slide is built to fit **1024×600 with no scroll** — see the display-target
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
