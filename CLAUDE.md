# CLAUDE.md — Garmin Run Dashboard

Self-hosted, multi-user Garmin **running** dashboard. Flask + SQLite backend,
React + Vite + Tailwind v4 frontend. No auth (home-LAN only). Read `README.md`
for the full picture and `docs/plan.md` for history/status.

## ⚠️ Raspberry Pi display fit — READ BEFORE ANY UI CHANGE

The dashboard's target hardware is a **1024×600, 7" Raspberry Pi monitor,
display-only (no touch / keyboard / mouse)**. This is a hard design constraint,
not a preference. It keeps getting broken by well-meaning feature additions, so:

- **Every slide MUST fit 1024×600 with NO scroll** — you cannot scroll a display-
  only screen, so anything below the fold is invisible forever. After *any*
  view/chart change, verify at 1024×600 that `document.body.scrollHeight <= 600`
  on **every** slide, for **both** runners (resize to 1024×600, then click each
  `button[aria-label]` in the nav and measure). Content budget is ~538px.
- **The display is read from several metres away.** One idea per slide, rendered
  as large as the budget allows — do NOT pack four panels onto a screen. If a
  slide is getting crowded, split it into two slides; there is no cost to adding
  slides, and that is the standing fix for "too small to read".
- **Text has a readability floor — nothing below ~14px.** Metric labels are 16px
  (`text-base`, via `BigStat`), chart axis ticks are `fontSize: 17`, panel titles
  ~18px, subtitles/legends 14px. The dense calendar-heatmap micro-labels (weekday
  letters, month names) are the only exception at 12px. Do NOT reintroduce the old
  10–12px `text-xs`/`text-[10px]` label sizes — from kiosk distance they're
  invisible. Axis dates use `axisDate()` from `utils.js` ("May 23", not the full
  ISO string), which is both shorter and readable.
- **Chart margins/axis widths must fit the 17px ticks.** Recharts `margin` must
  be **non-negative** and `YAxis width` wide enough for the largest label —
  negative left margins (the old space-saving trick) clip multi-digit y-labels,
  and a too-small right margin clips the last x-label. Working values: `margin`
  `{ right: ~28–32, left: 0 }` for date x-axes, `YAxis width` ~44–48 for 3-digit
  values. Put `allowDecimals={false}` on integer axes (e.g. km) so an empty week
  doesn't render clipping fractional ticks like "0.25".
- **Every slide shows a page number** (`NN/total`) at the top-left of the header,
  from the slide's index in `slides.jsx`. It's there so a viewer can say "page 7
  is wrong" — keep slide order stable-ish, or expect the numbers to shift.
- **Slides fill the screen via flexbox, not pixel heights.** The app root is
  `h-screen flex flex-col`; `Slide` is `flex-1 min-h-0 flex flex-col`; the chart
  card is `<Panel grow>` (or `flex-1 min-h-0`) and charts take `height="100%"`.
  Don't reintroduce fixed `height={220}` chart props — they leave dead space.
- **Both runners are shown head-to-head** — there is NO user switcher (nothing to
  click on the Pi). Slides fetch both users with `useTwoUsers()`, or one with
  `useOneUser()` when a head-to-head would halve the graphic. Runner colors are
  `RUNNER_COLORS` / `RUNNER_RGB` + `runnerName()` in `utils.js` (Runner A =
  marigold `#f5a524`, Runner B = olive green `#9bb53b`). Keep `RUNNER_RGB` in
  sync with the hexes — the calendar heatmap ramps its own rgba() from it.
- **The app auto-rotates** through the slides in `slides.jsx` every `ROTATE_MS`
  (=14s) in `App.jsx`; the header ⏸/▶ button or clicking the position bar pauses
  it. Add a slide by appending to `SLIDES` — the nav and rotation pick it up.
  Slides needing a second runner set `requiresRunner: 1` so a one-runner install
  doesn't rotate through blanks.
- **The palette is four layers, and nothing may invent a fifth** (defined with
  the reasoning at the top of `index.css`). Before adding *any* color, place it
  in one of these:
  1. **Identity — two hues.** `--color-runner-a` marigold `#f5a524` = Runner A,
     `--color-runner-b` olive `#9bb53b` = Runner B. These two answer "whose data
     is this" and are used for nothing else, ever.
  2. **Emphasis — the same hue, different opacity.** More/less of the *same*
     person never changes hue: last week's ghost bars, the calendar heatmap's
     distance ramp and the heart-rate zones all step through
     `INTENSITY_STEPS` (`utils.js`) via `intensity(rgb, step)` / `zoneColor()`.
     HR zones are shades of that runner's own color, NOT five separate hues.
  3. **Neutrals — everything that isn't a person.** Told apart by lightness, not
     hue: `--color-slate` (strength), `--color-slate-dim` (other cross-training),
     `--color-chalk`, `--color-muted`, `--color-line`. Chrome (header dot, nav,
     focus ring, hovers) is neutral too — it used to be a third yellow, which
     read as a third runner.
  4. **Alert — one hue.** `--color-ember` `#e5484d`, for genuine extremes only:
     30°C+ months, the peak temperature, a form metric outside its band. Never
     decorative, and never more than one or two on a slide.
  Deltas (week-over-week change) are **not** color-coded — the sign carries it;
  a lighter week is not a failure. There is no zone palette and no `--color-volt`
  any more; a slide rendering more than ~4 hues has broken the system.
- **Height-gated compact mode**: `@custom-variant short (@media (max-height:700px))`
  in `index.css` plus the `useCompact()` hook (`useCompact.js`) at the SAME 700px
  threshold — keep them in sync. Use `short:` utilities for denser padding/
  spacing/smaller charts on the Pi; Recharts need a numeric pixel height from
  `useCompact()` (CSS can't reach them). Desktop (≥701px tall) is intentionally
  left roomy — don't "fix" the extra whitespace there.

**Adding a feature?** Prefer a NEW slide over cramming it onto an existing one,
then re-verify no-scroll at 1024×600 for both runners. Worked example: the
weekly training chart carries four series (this week's km, last week's ghosted
km, strength hours, other-training hours), so it gets a whole slide **per
runner** rather than a head-to-head half-width panel.

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

- **Garmin login needs 2FA — a human.** Email/password alone won't authenticate.
  `fetch_garmin.py --login` does the interactive login (prompts for the code) and
  caches a session token per user (`.garmin_tokens*`); every later sync reuses it.
  Unattended runs (cron) never prompt — `get_client()` raises `GarminAuthRequired`
  with a "run --login" message when stdin isn't a tty, so cron fails loudly instead
  of hanging. A dead fetcher surfaces on the kiosk as an amber "⚠ stale" header
  badge after 24h (`LastSyncBadge.jsx`).
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
  predicate (`app.py`) / `LIKE '%running%'`. Non-runs surface in three places:
  the Calendar heatmap (slate marker on run-less days), the weekly-volume slide
  (per-day strength/other **hours** from `/api/this-week`) and the training-mix
  slide (`/api/training-mix`, weekly hours by bucket). `categorize_activity()`
  in `app.py` is the single place that maps a typeKey to run/strength/other —
  extend `STRENGTH_HINTS` there, not in the frontend. Legacy rows
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
