# Garmin Run Dashboard

A self-hosted two-runner wall display for Garmin data, running on a Raspberry Pi.
React + Vite + Tailwind v4 frontend, Flask + SQLite backend, and a per-user
Garmin fetcher that syncs hourly (cron). The Pi redeploys itself from `main` every
night. No auth — intended for home-LAN use only.

`docs/plan.md` has the original project plan. **This README reflects the current
state**, which has grown well beyond that plan. `CLAUDE.md` holds the working
rules for contributors and AI agents.

---

## Display target — a 1024×600 Raspberry Pi kiosk (design constraint)

The dashboard is built to run on a **1024×600, 7" Raspberry Pi monitor that is
display-only** (no touch, keyboard, or mouse). That shapes the whole UI:

- **Head-to-head, both runners at once.** Most slides compare the two runners on
  shared charts. There is no user switcher, because nothing on the Pi can click
  it. A few slides show one runner at a time, where a head-to-head would halve
  the graphic.
- **Read from across the room.** One idea per slide at the largest size the
  screen allows, rather than several panels per screen. Slides fill the viewport
  via flexbox (`h-screen` → `flex-1 min-h-0` → charts at `height="100%"`), so
  graphics scale with the display instead of sitting in fixed-height boxes.
  Nothing on a slide is smaller than ~14px (the "readability floor" in
  `CLAUDE.md`).
- **Auto-rotating.** The app cycles through the slides in `src/slides.jsx` every
  14s hands-free (`ROTATE_MS` in `src/App.jsx`). A header ⏸/▶ button, or
  clicking the position bar, pauses it for desktop inspection.
- **Numbered pages.** The header shows `NN/18`, so a viewer can say "page 7 needs
  fixing" without knowing what the slide is called.
- **No scrolling — every slide fits 1024×600.** A height-gated compact mode
  (`@custom-variant short (@media (max-height:700px))` in `index.css` + the
  `useCompact()` hook at the same threshold) shrinks padding/spacing on short
  screens only; the desktop dev view (≥701px tall) is left roomy.

> **Contributors / AI agents:** keeping every slide within the 600px budget is a
> hard requirement. After any UI change, verify at 1024×600 that the page does
> not scroll (`document.body.scrollHeight <= 600`) on **every** slide for
> **both** runners. Prefer adding a slide over crowding an existing one. See the
> "Raspberry Pi display fit" section in `CLAUDE.md`.

### Colour: four layers, and no fifth

Documented at the top of `frontend/src/index.css`; every colour on screen
belongs to exactly one layer.

1. **Identity** — two hues answer "whose data is this": **marigold** (`#f5a524`)
   = Runner A, **olive** (`#9bb53b`) = Runner B. Used for nothing else.
2. **Emphasis** — more or less of the *same* person is the same hue at a
   different opacity, via one shared `INTENSITY_STEPS` ramp in `utils.js`: last
   week's ghost bars, heatmap intensity, heart-rate zones.
3. **Neutrals** — anything that isn't a person is grey, told apart by lightness:
   slate = strength, dim slate = other cross-training. Header chrome is neutral
   too.
4. **Alert** — one hue, **ember**, for genuine extremes only: 30 °C+ months, the
   peak temperature, a running-form metric outside its band.

Week-over-week changes carry their sign, not red/green — a lighter week isn't a
failure.

---

## Current state (2026-09-10)

- **Live on the Raspberry Pi** at `/home/jftchau/garmin-dashboard`, running as
  user `jftchau`. The Flask API runs under systemd (`garmin-api`), nginx serves
  the built frontend on **:8080**, and an autostarted Chromium shows it
  full-screen.
- **Runs itself.** Cron syncs Garmin every hour. A systemd timer pulls `main`,
  rebuilds and restarts at 04:30 daily, and the kiosk reloads into the new build
  on its own. See "Deploying to the Raspberry Pi" below.
- **Two runners connected** — "Jeffrey" (user 1) and "Eugenia" (user 2), each
  with runs, non-run cross-training, daily wellness and race predictions.
  Credentials live in `backend/.env` (`GARMIN_EMAIL[_2]` / `GARMIN_PASSWORD[_2]`).
- **Multi-user underneath.** Every data row carries a `user_id` and every
  endpoint takes `?user=<id>`. Display names are seeded from `.env`
  (`USER1_NAME`, `USER2_NAME`). The kiosk has no rename UI, so change a name with
  `PATCH /api/users/<id>` or directly in the DB.
- Development happens on a Windows machine (see "Windows dev notes"). The Pi runs
  whatever is on `main`.

### Slides (18 in rotation, 16 with one runner — each fits 1024×600)

| # | Slide | What it shows |
|---|---|---|
| 1 | **This week** | distance / time / pace / runs per runner at headline size, with the week-over-week change in volume |
| 2–3 | **&lt;Runner&gt; · training week** (one each) | daily run km with **last week's same-weekday volume ghosted behind it**, plus that day's **strength and other-training hours** stacked on a right-hand axis (two axes because km and hours are different units) |
| 4 | **Latest runs** | each runner's last five runs as large rows: date, distance, pace, training-effect badge. Activity names were dropped — every run came back with the same location name |
| 5 | **Training mix** | weekly training *hours* split running / strength / other over 10 weeks, per runner. Time is the one unit every activity type shares, so this shows a hot-weather swap from running to gym |
| 6 | **Running conditions** | monthly average run temperature as bars ramped cool→hot, each runner's **monthly km as lines** on a right-hand axis, and the season's hottest run — so lighter summer mileage reads as heat, not slacking |
| 7 | **Heart rate zones · this week** | each runner's zone split as a doughnut in shades of their own colour, with a fixed five-zone legend so both doughnuts stay the same size |
| 8 | **Weekly mileage** | the last 26 weeks, both runners overlaid on one line chart |
| 9 | **Mileage summary** | total / average per week / best week over the **last 3 months** |
| 10 | **Year to date** | cumulative distance for both runners on one chart — a season-long "who's ahead" race, with current totals and the leader's gap |
| 11–12 | **&lt;Runner&gt; · run frequency** (one each) | 12-month heatmap (cells size themselves to fill the card; cross-training-only days get a neutral marker), plus runs/week, current and longest streak, longest layoff, busiest weekday |
| 13–14 | **Personal records · short / long** | bests for 1K / 5K / 10K, then half and marathon, each against **Garmin's race prediction** |
| 15 | **Running form** | cadence / stride length / ground contact / vertical oscillation averaged over recent runs, head-to-head. Each metric except stride shows Garmin's top-30% reference band and an in-range / above / below verdict (stride scales with height and pace, so it gets no band) |
| 16 | **Today's readiness** | resting HR / HRV / sleep score / VO₂max per runner |
| 17 | **Heart · 30 days** | resting HR and HRV trends, both runners overlaid |
| 18 | **Fitness & sleep · 30 days** | VO₂max (per-run estimate) and sleep hours |

With one runner configured, slides 3 and 12 (runner B's per-runner slides) are
hidden via `requiresRunner` in `slides.jsx` rather than shown empty.

The kiosk shows only these comparison views. The richer per-run detail
(power/dynamics, splits, GPS map) and the sortable activity log were removed from
the frontend — a display-only kiosk has no way to open them — along with the
`leaflet`/`react-leaflet` deps. The data is still in the DB and still served by
`/api/activity/<id>` and `/api/activities` if a future interactive build wants it.

---

## Repo layout

```
backend/
  schema.sql            # SQLite tables (multi-user)
  db.py                 # connection helper + in-place schema migrations (_migrate)
  fetch_garmin.py       # per-user Garmin fetcher (activities + daily wellness)
  app.py                # Flask API: read-only data endpoints, /api/sync-now, user rename
  requirements.txt      # garminconnect + garth (pinned), flask, flask-cors, python-dotenv
  .env.example          # per-user credentials + config
  logs/                 # fetch.log, written by the hourly cron sync
  backups/              # (Pi only, created by update.sh) last 7 pre-deploy DB snapshots
frontend/
  src/
    App.jsx             # header + carousel: 14s rotation, pause, nightly 4am reload
    slides.jsx          # the running order (SLIDES) + titles; adding a slide = one entry
    api.js              # fetch wrappers (?user=), mock fallback, live-vs-mock tracking
    utils.js            # formatters, runner colours/names, axisDate(), INTENSITY_STEPS
    index.css           # Tailwind v4 @theme: the four-layer palette + `short:` variant
    useTwoUsers.js      # useTwoUsers() / useOneUser(): same fetch for each runner
    useCompact.js       # matchMedia twin of `short:`, for charts' numeric height props
    useDataSource.js    # "live" vs "demo" state behind the header badge
    useVersionCheck.js  # polls dist/version.json; reloads the kiosk after a deploy
    mock/mockData.js    # mock API responses for UI-only dev
    components/
      slides/           # one file per slide: WeekTotals, WeekVolume, RecentRuns,
                        #   TrainingMix, Conditions, HRZones, Mileage (trend + summary),
                        #   YearToDate, Frequency, Records, RunningForm,
                        #   Body (readiness + heart / fitness trends)
      Slide.jsx         # shared furniture: Slide, Panel, BigStat, RunnerTag, Loading
      SlideNav.jsx      # segmented position / progress bar
      WeekVolumeChart.jsx, WeeklyMileageChart.jsx, HRZoneDoughnut.jsx,
      CalendarHeatmap.jsx, CalendarStats.jsx     # charts shared by slides
      RunnerLegend.jsx, LastSyncBadge.jsx, DataSourceBadge.jsx,
      RefreshButton.jsx                          # header furniture
  vite.config.js        # dev server + /api proxy — pinned to IPv4 127.0.0.1
deploy/                 # Pi-only scripts and templates (see the deploy table below)
docs/plan.md            # original plan
CLAUDE.md               # working rules for contributors & AI agents
.claude/launch.json     # dev-server config for Claude Code's preview
```

---

## Data model (SQLite)

- `users` — `id, slot, name, garmin_email`. `slot` maps to the `.env` credential
  slot (1, 2, …).
- `activities` — one row per activity, `user_id` FK, `activity_type` = Garmin's
  `typeKey`. **Runs** are stored in full: rich summary metrics (power, running
  dynamics, calories, intensity minutes, temperature, …), splits, GPS polyline
  and the full `raw_json`. **Non-runs** (strength, cycling, …) are stored as
  lightweight cross-training context with no detail calls, and are excluded from
  every run-only stat and from PRs.
- `personal_records` — PK `(user_id, distance_name)`.
- `user_metrics` — daily wellness, PK `(user_id, date)`: vo2max (watch value),
  resting_hr, sleep, HRV, body battery, stress, training status.
- `race_predictions` — PK `(user_id, date)`: predicted 5K/10K/half/marathon.
- `sync_log` — per-user sync history; the latest `ok` row drives the header's
  "updated … ago" badge.

`categorize_activity()` in `app.py` is the **single** run / strength / other
mapping. To classify a new activity type as strength, extend `STRENGTH_HINTS`
there, not in the frontend.

`db.py init_db()` runs `schema.sql` (read as UTF-8) then `_migrate()`, which
upgrades older databases in place: it adds missing columns, adds `user_id`,
rebuilds composite-PK tables, and assigns pre-multi-user rows to the first user.
Safe to run on every start.

### Two VO₂max numbers (don't confuse them)
- `activities.vo2max` — each **run's** estimate (integer, only on harder runs).
  This is the line on the "Fitness & sleep" slide.
- `user_metrics.vo2max` — the **watch's** daily VO₂max from Garmin's Max Metrics
  endpoint. This is the number on the "Today's readiness" slide (matches the
  device). They typically differ by about 1.

---

## API

Every data endpoint accepts `?user=<id>` (defaults to the first user). Everything
is read-only except `PATCH /api/users/<id>` and `POST /api/sync-now`.

| Method | Path | Returns |
|---|---|---|
| GET | `/api/users` | list of users |
| PATCH | `/api/users/<id>` | rename a user (`{"name": ...}`) |
| GET | `/api/activities?limit=20&offset=0` | paginated activity list (runs + cross-training) |
| GET | `/api/activity/<id>` | full detail incl. polyline + splits *(not used by the kiosk)* |
| GET | `/api/this-week` | daily distances, totals, HR zones, runs, **last week's daily volume**, **per-day cross-training minutes** |
| GET | `/api/weekly-mileage` | all-time weekly distance array |
| GET | `/api/training-mix?weeks=10` | weekly training **hours** split run / strength / other (max 52) |
| GET | `/api/running-form?runs=30` | recent average cadence / stride / ground contact / vertical oscillation (max 200) |
| GET | `/api/conditions?months=8` | per month: average + peak run temperature and **distance**; plus the hottest run (max 24) |
| GET | `/api/calendar?days=365` | daily distances for the heatmap |
| GET | `/api/personal-records` | 1K/5K/10K/Half/Marathon bests |
| GET | `/api/vo2max-trend` | `{current, current_date, trend[]}` |
| GET | `/api/weekly-insights` | weekly intensity minutes + training load *(not used by the kiosk)* |
| GET | `/api/race-predictions` | predicted race times (seconds) |
| GET | `/api/wellness-trend?days=90` | daily wellness rows (the kiosk asks for 30) |
| GET | `/api/current-status` | latest value of each daily metric |
| GET | `/api/last-sync` | `{"last_sync": ISO-UTC}` — most recent successful sync, any user |
| GET | `/api/health` | `{"status":"ok"}` |
| POST | `/api/sync-now` | runs `fetch_garmin.py` synchronously (all users, 300s timeout) |

---

## The fetcher (`fetch_garmin.py`)

Loops over every user configured in `.env` and syncs into their `user_id` rows.

```bash
python fetch_garmin.py            # incremental sync (default) — all users
python fetch_garmin.py --full     # re-fetch & re-process every activity
python fetch_garmin.py --backfill # repopulate Tier-1 summary columns from
                                  #   stored raw_json (no Garmin API calls)
python fetch_garmin.py --wellness [days]   # backfill daily wellness + race
                                           #   predictions ONLY (default 90 days)
python fetch_garmin.py --login    # (re)authenticate with Garmin — needs a
                                  #   terminal + the 2FA code. See below.
```

- **Incremental**: skips activities already in the DB and stops paging as soon as
  a page contains an already-synced one (Garmin returns newest-first). A routine
  sync is one page plus detail calls for genuinely new runs → a few seconds. On
  an empty DB it pages back through everything.
- Makes **2 detail calls per new run** (splits, polyline); non-runs get none. HR
  zones and all Tier-1 metrics come from the activity summary.
- On every sync it also refreshes the last `DAILY_METRICS_WINDOW` (=3) days of
  daily wellness + current race predictions per user. Full history is a one-time
  `--wellness` run. Note that `--wellness` does **not** fetch activities.
- Historical non-runs only appear after a `--full` run, because incremental
  sync stops at the first already-synced activity.
- Exits non-zero if any user's sync failed.
- Session tokens are cached per user (`.garmin_tokens`, `.garmin_tokens_2`).

### Garmin login & 2FA

**The accounts have 2FA on, so a fresh login can only be completed by a human.**
This is what blocks a first sync on a new machine — not a library bug.
Email/password alone are not enough; Garmin issues a challenge and the code has to
be typed in.

```bash
cd backend
./venv/bin/python fetch_garmin.py --login   # per user: prompts for the 2FA code
```

That performs the full SSO login for every user in `.env` and writes the session
token to `.garmin_tokens*`. **Every later sync — cron's and the Refresh button's —
reuses the cached token and needs no human.** Re-run `--login` only when the
token expires.

Because cron has no stdin, an unattended sync **never** prompts. If no cached
token works, it fails immediately with `Run: ./venv/bin/python fetch_garmin.py
--login` and a non-zero exit, instead of hanging on a 2FA prompt nobody can
answer. On the kiosk, the header's "updated … ago" badge switches to **"⚠ stale —
updated …"** once the last successful sync is over 24h old. That's the only
visible sign of a dead fetcher — the dashboard keeps showing the last-synced
numbers. A stale badge has two common causes: see "Troubleshooting".

---

## Configuration (`backend/.env`)

```ini
# User 1 (required)
GARMIN_EMAIL=you@example.com
GARMIN_PASSWORD=your-password
GARMIN_TOKEN_STORE=.garmin_tokens
USER1_NAME=                 # optional default display name

# User 2 (optional) — fill in to enable a second profile
GARMIN_EMAIL_2=
GARMIN_PASSWORD_2=
GARMIN_TOKEN_STORE_2=.garmin_tokens_2
USER2_NAME=

DB_PATH=garmin.db           # relative to backend/, or absolute
FLASK_PORT=5000
FLASK_DEBUG=0               # not in .env.example; set 1 for the Flask reloader locally
```

`.env` is gitignored; passwords stay in the backend (never sent to the browser or
stored in the DB). The repo is **public**, so never commit `.env`, tokens, or a
database.

---

## Quick start (development)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate                       # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                        # fill in Garmin credentials
python fetch_garmin.py --login              # one-time 2FA login per user
python fetch_garmin.py                      # initial pull of all activities → garmin.db
python fetch_garmin.py --wellness 90        # (optional) daily-wellness history
python app.py                               # Flask API on 127.0.0.1:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                                 # http://127.0.0.1:5173, proxies /api → :5000
npm run build                               # production build → frontend/dist
```
The UI falls back to mock data (`src/mock/mockData.js`) if the backend is down,
and the header badge switches from "Live data" to "Demo data" when it does.

`dist/version.json` only exists in builds made by `deploy/update.sh`, so the kiosk's
auto-reload is a no-op in dev. Vite dev also full-reloads on `public/` changes, so
test the reload against a production build (`vite preview`), not the dev server.

### Windows dev notes
- **Default encoding is GBK.** Prefix Python with `PYTHONUTF8=1` for
  `pip install` (a transitive dependency builds from source and reads UTF-8
  files). `app.py` no longer needs it, since `schema.sql` is read as UTF-8
  explicitly.
- **Node** installed via `winget install OpenJS.NodeJS.LTS`. npm 11 blocks
  esbuild's postinstall — run `npm rebuild esbuild` once if Vite won't start.
- **Vite is pinned to IPv4** (`server.host: 127.0.0.1`) and proxies to
  `127.0.0.1:5000`, because Windows `localhost` can resolve to IPv6 `::1` while
  Flask listens on IPv4 only.
- **Outbound traffic goes through a local proxy** (`127.0.0.1:3213`). `git` doesn't
  read the proxy env vars, so the repo sets `http.proxy` / `https.proxy`
  explicitly. This is specific to the dev box — don't copy it to the Pi.
- `sys.stdin.isatty()` is `True` on Windows even under `< /dev/null`, so the
  non-interactive (cron) login path can only be exercised on the Pi.

---

## Deploying to the Raspberry Pi (1024×600 kiosk)

`deploy/` holds everything Pi-specific. Run every script as **your normal user**
(the one the app runs as), not with `sudo` — the scripts call `sudo` themselves
where needed, and a cron job installed under `sudo` lands in root's crontab.

| File | Purpose |
|---|---|
| `install.sh` | renders + installs the nginx site and systemd unit for **this** host (path/user detected, no hand-editing); `--dry-run` shows the diff against what's live |
| `nginx.conf.template` | serves the built frontend on **:8080**, proxies `/api/` → Flask :5000 (leaves Pi-hole's :80 alone) |
| `garmin-api.service.template` | systemd unit for the Flask API (`Restart=always`) |
| `cron_setup.sh` | installs the hourly `fetch_garmin.py` sync (all users) into your crontab |
| `update.sh` | **upgrade this host**: pull `main`, rebuild, restart, health-check, roll back on failure |
| `update_setup.sh` | installs the daily 04:30 self-update timer + its one sudo rule |
| `garmin-update.service.template`, `garmin-update.timer` | the self-update unit and its schedule |
| `kiosk.sh` | launches Chromium full-screen at the dashboard + keeps the screen awake |
| `kiosk_setup.sh` | autostarts `kiosk.sh` on desktop login |

### 1. Code, API service, web server, sync
```bash
git clone https://github.com/jftchau/garmin-dashboard ~/garmin-dashboard
cd ~/garmin-dashboard/backend
python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
cp .env.example .env                             # fill in Garmin creds (both users)
./venv/bin/python fetch_garmin.py --login        # one-time 2FA login (needs a terminal)
./venv/bin/python fetch_garmin.py                # initial pull of all activities
./venv/bin/python fetch_garmin.py --wellness 90  # 90 days of wellness + race predictions
cd ../frontend && npm ci && npm run build        # build → dist/

bash ../deploy/install.sh          # nginx site + systemd unit, rendered for this host
bash ../deploy/cron_setup.sh       # hourly sync — must end with "Installed cron job:"
bash ../deploy/update_setup.sh     # daily 04:30 self-update (see below)
```
`install.sh` substitutes the real repo path and OS user into the two `.template`
files, so **nothing is tied to a particular home directory** — clone anywhere and
re-run it any time. Use `bash deploy/install.sh --dry-run` first to see exactly
what it would change against the live config.

Check the sync job actually landed with `crontab -l` — you should see a line
containing `fetch_garmin.py`. (Before 2026-09-10, `cron_setup.sh` silently
installed an **empty** crontab for a user with no other cron jobs; a Pi set up
before then needs it re-run once.)

### 1b. Upgrading

Merge a PR into `main` → the Pi picks it up **at 04:30** (up to 5 min later —
randomised), health-checks itself, and rolls back if the new code doesn't come
up. The timer is `Persistent`, so a Pi that was off at 04:30 catches up after
boot. There is no CI; the Pi's own build is the build check.

**Only `main` deploys.** A branch pushed to GitHub never reaches the Pi until it
is merged.

```bash
bash deploy/update.sh               # upgrade right now (no-op if main hasn't moved)
bash deploy/update.sh --force       # rebuild + restart even if it hasn't
journalctl -u garmin-update -n 50   # what the timer did
systemctl list-timers garmin-update.timer
```

What `update.sh` does, in order: take a lock that the hourly sync also respects
→ **back up `garmin.db`** to `backend/backups/` (keeps 7; `db.py` migrations run
on boot and can rebuild tables, so a bad deploy can touch data) → hard-reset to
`origin/main` → reinstall pip deps *only* if `requirements.txt` changed → build
the frontend **to a temp dir and swap it in** (never into the live `dist/`, which
nginx is serving) → restart `garmin-api` → poll `/api/health`. **Any failure rolls
back** to the previous commit and `dist/`.

Because of the hard reset, **hand edits to tracked files on the Pi are
discarded** on the next deploy. Gitignored files (`.env`, tokens, the DB, logs)
are untouched.

The kiosk then reloads itself: `update.sh` stamps the deployed SHA into
`dist/version.json`, and `useVersionCheck.js` polls it every 5 min and calls
`location.reload()` when it changes. That indirection exists because the kiosk is
autostarted Chromium, not a service — a deploy *cannot* restart it (killing
Chromium leaves a blank desktop), and a display-only screen has nothing to press
F5 with. Separately, `App.jsx` reloads the page once nightly at ~04:00 to recover
from any leaked or frozen tab.

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

The autostart entry runs `kiosk.sh` **once, at login**. Nothing respawns Chromium
if it's closed, so don't Alt+F4 the kiosk — see "Getting a shell" below.

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

## Troubleshooting (on the Pi)

### Getting a shell
- **SSH over the home LAN:** `ssh jftchau@<pi-ip>` (find the address with
  `hostname -I` on the Pi). This only works from inside the home network — the Pi
  isn't exposed to the internet.
- **Keyboard on the Pi itself:** plug in a USB keyboard and press
  **Ctrl+Alt+F2** for a text console. Log in with the Pi user's password
  (desktop autologin doesn't apply there). Go back to the dashboard with
  **Ctrl+Alt+F1** on Bookworm, or **Ctrl+Alt+F7** on older X11 images. This
  leaves Chromium running untouched. Alt+Tab won't help — the kiosk is the only
  window.

### Data only updates when someone presses Refresh
The hourly cron job isn't running. **The Refresh button proves the fetcher
works:** `POST /api/sync-now` runs `fetch_garmin.py` from the `garmin-api`
service as the same user, from the same directory, with no terminal — exactly
the path cron uses. If Refresh succeeds, the Garmin token and `.env` are fine,
and the problem is cron.

```bash
crontab -l                                         # as your user, NOT sudo
tail -20 ~/garmin-dashboard/backend/logs/fetch.log # every hourly run appends here
systemctl status cron
bash ~/garmin-dashboard/deploy/cron_setup.sh       # (re)install; safe to re-run
```
Don't press Refresh while testing cron — it resets the "updated … ago" badge.
Wait for the top of the hour, then check that the badge reads minutes.

### Badge says "⚠ stale" *and* Refresh shows "Sync failed"
The Garmin session token expired. Re-authenticate from a terminal on the Pi
(needs the 2FA code):
```bash
cd ~/garmin-dashboard/backend && ./venv/bin/python fetch_garmin.py --login
```

### Header shows "Demo data"
The frontend can't reach the API and is showing built-in sample numbers.
```bash
curl -s http://127.0.0.1:5000/api/health
sudo journalctl -u garmin-api -n 50
```

### A merged change hasn't appeared
```bash
journalctl -u garmin-update -n 50
```
Look for `already at …` (main hasn't moved — was it merged, or only pushed to a
branch?), `health OK` (deployed; the kiosk reloads within ~5 min), or `!! deploy
failed — rolling back` (the build or health check broke and the Pi stayed on
the old code).

---

## Known caveats / gotchas

- **Mock fallback:** `api.js` returns mock data on *any* fetch error, so a
  backend failure shows plausible-but-fake numbers. The header's "Demo data"
  badge is there to make that visible.
- **Short-distance PRs are understated.** PRs compare *whole activities* near
  each target distance, so a fast 5 km inside a longer run never counts as a 5K
  PR. The 10K and longer PRs are fine. The fix would compute best efforts from
  rolling split windows (splits are already stored); not done yet.
- **Training status** comes back empty on these accounts, and **training
  readiness** isn't supported on the watch. That's why "Today's readiness" is
  built from resting HR / HRV / sleep / VO₂max.
- **Gear/shoe** data is empty (the summary payload doesn't include it, and no
  gear was logged); the shoe-mileage idea is parked.
- Garmin `startTimeLocal` is space-separated (`"2026-07-06 08:30:00"`); the
  "This week" query compares on the date prefix to avoid dropping Monday runs.
- `deploy/nginx.conf.template`'s `proxy_pass` must have **no trailing slash**. A
  trailing slash strips `/api/`, every call 404s, and the kiosk quietly shows
  demo data.

---

## Contributing / pushing changes

Work on a branch and open a PR — never commit straight to `main` (it's the branch
the Pi deploys, and it's protected from force-pushes).

```bash
git checkout -b my-change                # 1. new branch
git commit -am "…"                       # 2. commit (.env / *.db / tokens are gitignored)
git push -u origin my-change             # 3. push
gh pr create --base main --fill          # 4. open the PR (or use the URL git prints)
```

Review and merge on GitHub. The Pi picks up the merge at the next 04:30 run.
`CLAUDE.md` has the full workflow and the UI verification checklist.

---

## Notes

- Auth: none — home LAN only.
- Refresh: the header button POSTs `/api/sync-now` (syncs all users) and then
  reloads the page; cron runs the same sync every hour.
- Credentials live only in `backend/.env` (gitignored).
