"""
fetch_garmin.py

Logs into Garmin Connect, pulls activities (paginated), extracts the metrics the
dashboard needs, upserts them into SQLite, and recalculates personal records
(1K, 5K, 10K, half marathon, marathon). Runs are stored in full; non-runs are
stored as lightweight cross-training context (type/date/distance, no detail
calls) and are excluded from every run-only stat and from PRs.

Run manually:           python fetch_garmin.py           # incremental
Full re-process:        python fetch_garmin.py --full    # re-fetch every run
Log in / renew 2FA:     python fetch_garmin.py --login   # needs a terminal
Run via cron (hourly):  0 * * * * cd .../backend && ./venv/bin/python fetch_garmin.py >> logs/fetch.log 2>&1

The Garmin accounts have 2FA, so a fresh login needs a human to type a code.
`--login` does that once and caches the session token (.garmin_tokens*); every
later sync — including cron's — reuses it. When the token eventually expires the
unattended sync stops with a "run --login" error rather than hanging on a prompt
cron can't answer, and the dashboard header goes amber to say the data is stale.

Incremental by default: runs already in the DB are skipped (no per-activity
detail calls), and because Garmin returns activities newest-first, paging stops
as soon as a page contains an already-synced run. A routine sync is therefore a
single page plus detail calls for genuinely new runs only. Use --full to
re-fetch and re-process everything (e.g. after changing how a field is parsed).
PRs are recalculated from the full activity table each time, so they stay
correct regardless of mode.
"""
import json
import logging
import os
import sys
from datetime import date, datetime, timedelta

from dotenv import load_dotenv

from db import get_conn, init_db

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("fetch_garmin")

# Per-user Garmin credentials live in .env; see configured_users().

# Personal-record distances we track, in meters, with a generous tolerance
# band so a run logged as "5.02 km" still counts as a 5K effort.
PR_DISTANCES = {
    "1K": 1000,
    "5K": 5000,
    "10K": 10000,
    "HALF": 21097,
    "MARATHON": 42195,
}
PR_TOLERANCE = 0.03  # +/- 3%

PAGE_SIZE = 50

# How many recent days of daily wellness to refresh on a normal sync. The full
# history is populated once via `python fetch_garmin.py --wellness [days]`.
DAILY_METRICS_WINDOW = 3


def configured_users():
    """Users configured in .env. Slot 1 = GARMIN_EMAIL/PASSWORD (+ USER1_NAME);
    slot 2 = GARMIN_EMAIL_2/PASSWORD_2 (+ USER2_NAME). Passwords never leave the
    backend."""
    users = []
    e1, p1 = os.getenv("GARMIN_EMAIL"), os.getenv("GARMIN_PASSWORD")
    if e1 and p1:
        users.append({
            "slot": 1, "name": os.getenv("USER1_NAME", "User 1"),
            "email": e1, "password": p1,
            "token_store": os.getenv("GARMIN_TOKEN_STORE", ".garmin_tokens"),
        })
    e2, p2 = os.getenv("GARMIN_EMAIL_2"), os.getenv("GARMIN_PASSWORD_2")
    if e2 and p2:
        users.append({
            "slot": 2, "name": os.getenv("USER2_NAME", "User 2"),
            "email": e2, "password": p2,
            "token_store": os.getenv("GARMIN_TOKEN_STORE_2", ".garmin_tokens_2"),
        })
    if not users:
        log.error("No Garmin credentials in .env (need GARMIN_EMAIL / GARMIN_PASSWORD)")
        sys.exit(1)
    return users


def ensure_users(conn, users):
    """Seed/refresh the users table from config. Preserves UI-edited names;
    creates a row for a newly configured slot. Returns {slot: user_id}."""
    for u in users:
        row = conn.execute("SELECT id FROM users WHERE slot = ?", (u["slot"],)).fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO users (slot, name, garmin_email) VALUES (?, ?, ?)",
                (u["slot"], u["name"], u["email"]),
            )
        else:
            # Refresh the email, and fill in a blank name from config — but never
            # overwrite a name the user has already set (in .env or the UI).
            conn.execute(
                "UPDATE users SET garmin_email = ?, "
                "name = CASE WHEN name IS NULL OR TRIM(name) = '' THEN ? ELSE name END "
                "WHERE slot = ?",
                (u["email"], u["name"], u["slot"]),
            )
    conn.commit()
    return {r["slot"]: r["id"] for r in conn.execute("SELECT slot, id FROM users").fetchall()}


class GarminAuthRequired(RuntimeError):
    """No usable cached token, and nobody is around to answer Garmin's 2FA
    challenge. Raised instead of prompting when stdin isn't a terminal."""


def _fresh_login(user):
    """Full Garmin SSO login for one user, answering the 2FA challenge on stdin,
    and persist the session token. Requires a human — see login_all()."""
    from garminconnect import Garmin

    def prompt_mfa():
        return input(f"[{user['name']}] Garmin 2FA code: ").strip()

    client = Garmin(user["email"], user["password"], prompt_mfa=prompt_mfa)
    client.login()
    ts = user["token_store"]
    try:
        client.garth.dump(ts)
        log.info("[%s] session token saved to %s", user["name"], ts)
    except Exception as e:
        log.warning("[%s] could not persist session token: %s", user["name"], e)
    return client


def get_client(user, interactive=None):
    """Log in to Garmin Connect for one user, reusing the cached token.

    The account has 2FA on, so a *fresh* login can only be completed by a human
    typing a code. Cron has no stdin, so rather than dying inside garth's
    `input("MFA code: ")` with a bare EOFError, we refuse up front and say what
    to run. Pass interactive=True (or run from a terminal) to allow the prompt.
    """
    from garminconnect import Garmin

    if interactive is None:
        interactive = sys.stdin.isatty()

    client = Garmin(user["email"], user["password"])
    ts = user["token_store"]
    try:
        client.login(ts)
        log.info("[%s] logged in via cached token (%s)", user["name"], ts)
        return client
    except Exception as e:
        log.info("[%s] no usable cached token (%s)", user["name"], e)

    if not interactive:
        raise GarminAuthRequired(
            f"{user['name']}: Garmin session expired and 2FA needs a human. "
            f"Run: ./venv/bin/python fetch_garmin.py --login"
        )

    log.info("[%s] logging in fresh — Garmin will ask for a 2FA code", user["name"])
    return _fresh_login(user)


def login_all():
    """`--login`: establish a fresh Garmin session per user, answering the 2FA
    challenge, and cache the tokens so cron can sync unattended until they
    expire."""
    if not sys.stdin.isatty():
        log.error("--login needs a terminal to read the 2FA code from.")
        return 1
    for user in configured_users():
        log.info("=== Logging in: %s ===", user["name"])
        try:
            _fresh_login(user)
        except Exception as e:
            log.error("[%s] login failed: %s", user["name"], e)
            return 1
    log.info("All users logged in. Tokens cached — cron can now sync unattended.")
    return 0


def activity_typekey(a):
    """Garmin's typeKey for an activity, e.g. 'running', 'trail_running',
    'cycling', 'strength_training'. '' when absent."""
    return (a.get("activityType", {}) or {}).get("typeKey", "") or ""


def is_running_activity(a):
    return "running" in activity_typekey(a)


def load_known_garmin_ids(conn, user_id):
    """garmin_id strings already stored for a user, so we can skip them."""
    rows = conn.execute("SELECT garmin_id FROM activities WHERE user_id = ?", (user_id,)).fetchall()
    return {r["garmin_id"] for r in rows}


def fetch_new_activities(client, known_ids, full=False):
    """Page through Garmin Connect activities (newest-first), return the ones to
    process. Runs *and* non-runs are returned — non-runs are surfaced as
    cross-training context; only their type/date/distance are kept (see
    normalize_activity, which skips detail calls for them).

    Incremental (default): activities whose garmin_id is in `known_ids` are
    skipped, and paging stops as soon as a page contains an already-known
    activity — since the feed is newest-first, everything older is already synced.

    full=True returns every activity regardless (for a complete re-process).
    """
    activities = []
    start = 0
    while True:
        batch = client.get_activities(start, PAGE_SIZE)
        if not batch:
            break
        new_acts = batch if full else [a for a in batch if str(a.get("activityId")) not in known_ids]
        activities.extend(new_acts)
        runs = sum(1 for a in new_acts if is_running_activity(a))
        log.info("Offset %d: %d on page, %d new (%d runs), %d to process so far",
                 start, len(batch), len(new_acts), runs, len(activities))

        # A page with a known activity marks the boundary with synced history.
        if not full and len(new_acts) < len(batch):
            break
        if len(batch) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return activities


# Summary-derived fields → DB columns. These all live in the activity summary
# (raw_json) that get_activities() already returns, so no extra API call is
# needed and existing rows can be backfilled from stored raw_json.
def zones_from_summary(raw):
    """HR seconds-in-zone from the summary's hrTimeInZone_1..5 fields."""
    zones = {}
    for i in range(1, 6):
        secs = raw.get(f"hrTimeInZone_{i}")
        if secs is not None:
            zones[str(i)] = secs
    return zones or None


def extract_summary_metrics(raw):
    """Pull the richer metrics we surface (name, power, running dynamics,
    calories, intensity, temperature, HR zones) straight from the summary."""
    zones = zones_from_summary(raw)
    return {
        "activity_name": raw.get("activityName"),
        "location_name": raw.get("locationName"),
        "calories": raw.get("calories"),
        "water_estimated": raw.get("waterEstimated"),
        "steps": raw.get("steps"),
        "avg_power": raw.get("avgPower"),
        "norm_power": raw.get("normPower"),
        "avg_ground_contact_time": raw.get("avgGroundContactTime"),
        "avg_stride_length": raw.get("avgStrideLength"),
        "avg_vertical_oscillation": raw.get("avgVerticalOscillation"),
        "avg_vertical_ratio": raw.get("avgVerticalRatio"),
        "training_effect_label": raw.get("trainingEffectLabel"),
        "moderate_intensity_minutes": raw.get("moderateIntensityMinutes"),
        "vigorous_intensity_minutes": raw.get("vigorousIntensityMinutes"),
        "temperature": raw.get("maxTemperature"),
        "fastest_split_1000": raw.get("fastestSplit_1000"),
        "fastest_split_1609": raw.get("fastestSplit_1609"),
        "heart_rate_zones": json.dumps(zones) if zones else None,
    }


def extract_splits(client, activity_id):
    try:
        splits_data = client.get_activity_splits(activity_id)
        laps = splits_data.get("lapDTOs", []) if isinstance(splits_data, dict) else []
        result = []
        for lap in laps:
            speed = lap.get("averageSpeed")  # m/s from Garmin
            result.append({
                "distance": lap.get("distance"),
                "duration": lap.get("duration"),
                # Store seconds-per-km pace, not raw speed — the UI formats this
                # field with formatPace() which expects sec/km.
                "avg_pace": (1000.0 / speed) if speed else None,
            })
        return result
    except Exception:
        return []


def extract_polyline(client, activity_id):
    try:
        details = client.get_activity_details(activity_id)
        points = details.get("geoPolylineDTO", {}).get("polyline", []) if isinstance(details, dict) else []
        # `is not None`, not truthiness: lat/lon of 0 (equator / prime meridian) is valid.
        return [[p.get("lat"), p.get("lon")] for p in points if p.get("lat") is not None and p.get("lon") is not None]
    except Exception:
        return []


def normalize_activity(client, raw):
    """Map a raw garminconnect activity summary into our DB row shape."""
    activity_id = raw.get("activityId")
    distance_m = raw.get("distance") or 0
    duration_s = raw.get("duration") or 0
    pace = (duration_s / (distance_m / 1000)) if distance_m else None

    # Splits/polyline back the run detail views, so we only spend those two extra
    # detail calls on runs. Non-runs are context-only (calendar cross-training
    # markers) and need just type/date/distance from the summary.
    is_run = is_running_activity(raw)
    splits = extract_splits(client, activity_id) if is_run else []
    polyline = extract_polyline(client, activity_id) if is_run else []

    row = {
        "garmin_id": str(activity_id),
        "start_time": raw.get("startTimeLocal") or raw.get("startTimeGMT"),
        "activity_type": activity_typekey(raw) or None,
        "distance": distance_m,
        "duration": duration_s,
        "pace": pace,
        "heart_rate_avg": raw.get("averageHR"),
        "heart_rate_max": raw.get("maxHR"),
        "cadence_avg": raw.get("averageRunningCadenceInStepsPerMinute"),
        "elevation_gain": raw.get("elevationGain"),
        "elevation_loss": raw.get("elevationLoss"),
        "training_effect_aerobic": raw.get("aerobicTrainingEffect"),
        "training_effect_anaerobic": raw.get("anaerobicTrainingEffect"),
        "vo2max": raw.get("vO2MaxValue"),
        "gear": raw.get("gear") or None,
        "splits": json.dumps(splits) if splits else None,
        "polyline": json.dumps(polyline) if polyline else None,
        "raw_json": json.dumps(raw),
    }
    row.update(extract_summary_metrics(raw))
    return row


def upsert_activity(conn, row):
    existing = conn.execute(
        "SELECT id FROM activities WHERE garmin_id = ?", (row["garmin_id"],)
    ).fetchone()

    columns = list(row.keys())
    if existing:
        set_clause = ", ".join(f"{c} = ?" for c in columns)
        conn.execute(
            f"UPDATE activities SET {set_clause} WHERE garmin_id = ?",
            [*row.values(), row["garmin_id"]],
        )
        return existing["id"], False
    else:
        placeholders = ", ".join("?" for _ in columns)
        cur = conn.execute(
            f"INSERT INTO activities ({', '.join(columns)}) VALUES ({placeholders})",
            list(row.values()),
        )
        return cur.lastrowid, True


def _safe(fn):
    """Call a Garmin endpoint, returning None on any failure (missing data,
    unsupported metric, transient error)."""
    try:
        return fn()
    except Exception:
        return None


def fetch_vo2max_for_date(client, d):
    m = _safe(lambda: client.get_max_metrics(d))
    if m and isinstance(m, list):
        generic = (m[0] or {}).get("generic") or {}
        return generic.get("vo2MaxPreciseValue") or generic.get("vo2MaxValue")
    return None


def fetch_current_vo2max(client, lookback_days=14):
    """Return (date, vo2max) for the watch's authoritative current VO2max from
    Garmin's Max Metrics endpoint (distinct from per-activity vO2MaxValue).
    Walks back from today to the most recent day with a reading."""
    today = date.today()
    for i in range(lookback_days):
        d = (today - timedelta(days=i)).isoformat()
        vo2 = fetch_vo2max_for_date(client, d)
        if vo2 is not None:
            return d, vo2
    return None, None


def fetch_wellness_for_date(client, d):
    """Daily wellness snapshot for one date: resting HR, sleep, HRV, body
    battery high/low, stress, VO2max. Every sub-call is best-effort."""
    metrics = {}

    rhr = _safe(lambda: client.get_rhr_day(d))
    try:
        vals = (((rhr or {}).get("allMetrics") or {}).get("metricsMap") or {}).get(
            "WELLNESS_RESTING_HEART_RATE"
        ) or []
        if vals and vals[0].get("value") is not None:
            metrics["resting_hr"] = int(vals[0]["value"])
    except Exception:
        pass

    sleep = _safe(lambda: client.get_sleep_data(d))
    dto = (sleep or {}).get("dailySleepDTO") or {}
    if dto.get("sleepTimeSeconds"):
        metrics["sleep_seconds"] = dto["sleepTimeSeconds"]
    overall = (dto.get("sleepScores") or {}).get("overall") or {}
    if overall.get("value") is not None:
        metrics["sleep_score"] = overall["value"]

    hrv = _safe(lambda: client.get_hrv_data(d))
    hs = (hrv or {}).get("hrvSummary") or {}
    if hs.get("weeklyAvg") is not None:
        metrics["hrv_weekly_avg"] = hs["weeklyAvg"]
    if hs.get("lastNightAvg") is not None:
        metrics["hrv_last_night"] = hs["lastNightAvg"]
    if hs.get("status"):
        metrics["hrv_status"] = hs["status"]

    bb = _safe(lambda: client.get_body_battery(d, d))
    try:
        if bb and isinstance(bb, list):
            arr = bb[0].get("bodyBatteryValuesArray") or []
            levels = [p[1] for p in arr if isinstance(p, list) and len(p) >= 2 and p[1] is not None]
            if levels:
                metrics["body_battery_high"] = max(levels)
                metrics["body_battery_low"] = min(levels)
    except Exception:
        pass

    st = _safe(lambda: client.get_stress_data(d))
    if st and st.get("avgStressLevel") is not None and st["avgStressLevel"] >= 0:
        metrics["stress_avg"] = st["avgStressLevel"]

    vo2 = fetch_vo2max_for_date(client, d)
    if vo2 is not None:
        metrics["vo2max"] = vo2

    return metrics


def fetch_training_status(client, d):
    """Best-effort training status (PRODUCTIVE / MAINTAINING / ...) + phrase +
    acute load. Garmin nests this unreliably, so tolerate missing data."""
    ts = _safe(lambda: client.get_training_status(d))
    out = {}
    if not isinstance(ts, dict):
        return out
    latest = (ts.get("mostRecentTrainingStatus") or {}).get("latestTrainingStatusData") or {}
    data = next(iter(latest.values()), None) if isinstance(latest, dict) else None
    if isinstance(data, dict):
        if data.get("trainingStatus") is not None:
            out["training_status"] = str(data["trainingStatus"])
        if data.get("trainingStatusFeedbackPhrase"):
            out["training_status_phrase"] = data["trainingStatusFeedbackPhrase"]
        acute = (data.get("acuteTrainingLoadDTO") or {}).get("acwrPercent")
        if acute is None:
            acute = data.get("weeklyTrainingLoad")
        if acute is not None:
            out["acute_load"] = acute
    return out


def fetch_race_predictions(client):
    rp = _safe(lambda: client.get_race_predictions())
    if isinstance(rp, list):
        rp = rp[-1] if rp else None
    if not isinstance(rp, dict):
        return None
    return {
        "date": rp.get("calendarDate") or date.today().isoformat(),
        "time_5k": rp.get("time5K"),
        "time_10k": rp.get("time10K"),
        "time_half_marathon": rp.get("timeHalfMarathon"),
        "time_marathon": rp.get("timeMarathon"),
    }


def store_race_predictions(conn, user_id, rp):
    conn.execute(
        """
        INSERT INTO race_predictions (user_id, date, time_5k, time_10k, time_half_marathon, time_marathon, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, date) DO UPDATE SET
            time_5k = excluded.time_5k, time_10k = excluded.time_10k,
            time_half_marathon = excluded.time_half_marathon, time_marathon = excluded.time_marathon,
            updated_at = excluded.updated_at
        """,
        (user_id, rp["date"], rp["time_5k"], rp["time_10k"], rp["time_half_marathon"], rp["time_marathon"]),
    )


def upsert_user_metrics(conn, user_id, d, fields):
    """Merge-upsert a day's metrics; COALESCE keeps existing values when a
    later partial write has NULLs."""
    fields = {k: v for k, v in fields.items() if v is not None}
    if not fields:
        return
    cols = list(fields.keys())
    updates = ", ".join(f"{c} = COALESCE(excluded.{c}, user_metrics.{c})" for c in cols)
    conn.execute(
        f"""
        INSERT INTO user_metrics (user_id, date, {', '.join(cols)}, updated_at)
        VALUES (?, ?, {', '.join(['?'] * len(cols))}, datetime('now'))
        ON CONFLICT(user_id, date) DO UPDATE SET {updates}, updated_at = datetime('now')
        """,
        [user_id, d, *[fields[c] for c in cols]],
    )


def sync_daily_metrics(client, conn, user_id, days=3):
    """Fetch race predictions, per-day wellness (resting HR, sleep, HRV, body
    battery, stress, VO2max) and today's training status; upsert for one user."""
    rp = fetch_race_predictions(client)
    if rp:
        store_race_predictions(conn, user_id, rp)
        log.info("Race predictions stored (%s)", rp.get("date"))

    today = date.today()
    for i in range(days):
        d = (today - timedelta(days=i)).isoformat()
        fields = fetch_wellness_for_date(client, d)
        if i == 0:
            fields.update(fetch_training_status(client, d))
        upsert_user_metrics(conn, user_id, d, fields)
    conn.commit()
    log.info("Daily wellness synced for %d day(s)", days)


def recalculate_personal_records(conn, user_id):
    """
    For each tracked distance, find the activity whose distance is within
    tolerance and whose *time to cover that exact distance* is fastest.
    Since we don't have GPS-distance-at-time splits for every run, we
    approximate using whole-activity pace for runs that match the target
    distance closely, which is accurate enough for typical race-distance runs.
    """
    # Running only — a 5 km bike ride or swim must never become a 5K run PR.
    rows = conn.execute(
        "SELECT id, distance, duration, pace, start_time FROM activities "
        "WHERE user_id = ? AND distance IS NOT NULL AND COALESCE(activity_type, 'running') LIKE '%running%'",
        (user_id,),
    ).fetchall()

    for name, target_m in PR_DISTANCES.items():
        low, high = target_m * (1 - PR_TOLERANCE), target_m * (1 + PR_TOLERANCE)
        candidates = [r for r in rows if r["distance"] and low <= r["distance"] <= high]
        if not candidates:
            continue

        # Normalize duration to "time it would take at this run's pace to
        # cover exactly target_m", so a 5.05km run is compared fairly
        # against a 4.98km run.
        def normalized_time(r):
            pace_per_m = r["duration"] / r["distance"]
            return pace_per_m * target_m

        best = min(candidates, key=normalized_time)
        best_time = normalized_time(best)

        conn.execute(
            """
            INSERT INTO personal_records (user_id, distance_name, best_time, activity_id, achieved_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, distance_name) DO UPDATE SET
                best_time = excluded.best_time,
                activity_id = excluded.activity_id,
                achieved_at = excluded.achieved_at
            WHERE excluded.best_time < personal_records.best_time
               OR personal_records.best_time IS NULL
            """,
            (user_id, name, best_time, best["id"], best["start_time"]),
        )


def backfill_summary_metrics():
    """Populate the richer summary columns for existing rows from stored
    raw_json — no Garmin calls. Run once after adding the columns:
    `python fetch_garmin.py --backfill`."""
    init_db()
    updated = 0
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, raw_json FROM activities WHERE raw_json IS NOT NULL"
        ).fetchall()
        for r in rows:
            try:
                raw = json.loads(r["raw_json"])
            except (TypeError, ValueError):
                continue
            fields = extract_summary_metrics(raw)
            set_clause = ", ".join(f"{k} = ?" for k in fields)
            conn.execute(
                f"UPDATE activities SET {set_clause} WHERE id = ?",
                [*fields.values(), r["id"]],
            )
            updated += 1
        conn.commit()
    log.info("Backfilled summary metrics for %d activities", updated)


def sync_user(user, uid, full=False):
    """Sync one user's activities + daily metrics into their user_id rows."""
    log.info("=== Syncing %s (user_id=%s, %s) ===", user["name"], uid,
             "full re-process" if full else "incremental")
    client = get_client(user)

    with get_conn() as conn:
        known_ids = set() if full else load_known_garmin_ids(conn, uid)
        raw_activities = fetch_new_activities(client, known_ids, full=full)
        log.info("[%s] %d activities to process", user["name"], len(raw_activities))

        inserted, updated = 0, 0
        for raw in raw_activities:
            row = normalize_activity(client, raw)
            row["user_id"] = uid
            _, was_new = upsert_activity(conn, row)
            if was_new:
                inserted += 1
            else:
                updated += 1
        conn.commit()

        recalculate_personal_records(conn, uid)
        conn.commit()

        # Daily fitness/wellness metrics + race predictions (what the watch
        # displays — distinct from per-run activity data).
        try:
            d, vo2 = fetch_current_vo2max(client)
            if vo2 is not None:
                upsert_user_metrics(conn, uid, d, {"vo2max": vo2})
                conn.commit()
            sync_daily_metrics(client, conn, uid, days=DAILY_METRICS_WINDOW)
        except Exception as e:
            log.warning("[%s] could not fetch daily metrics: %s", user["name"], e)

        conn.execute(
            "INSERT INTO sync_log (user_id, last_sync, activities_fetched, status, message) VALUES (?, ?, ?, ?, ?)",
            (uid, datetime.utcnow().isoformat(), len(raw_activities), "ok", f"{inserted} new, {updated} updated"),
        )
        conn.commit()

    log.info("[%s] done. %d new, %d updated.", user["name"], inserted, updated)


def run(full=False):
    """Sync every configured user. Returns the number that failed, so cron gets a
    non-zero exit (and a mail) instead of a silently half-finished sync."""
    init_db()
    users = configured_users()
    with get_conn() as conn:
        slot_to_id = ensure_users(conn, users)

    failures = 0
    for user in users:
        try:
            sync_user(user, slot_to_id[user["slot"]], full=full)
        except GarminAuthRequired as e:
            # Not a bug — the token aged out. Say what to do, don't dump a stack.
            log.error("%s", e)
            failures += 1
        except Exception as e:
            log.exception("[%s] sync failed: %s", user["name"], e)
            failures += 1
    return failures


if __name__ == "__main__":
    if "--login" in sys.argv:
        sys.exit(login_all())

    if "--backfill" in sys.argv:
        backfill_summary_metrics()
        sys.exit(0)

    if "--wellness" in sys.argv:
        # One-time historical backfill of daily wellness + race predictions.
        # Optional day count: `--wellness 90` (default 90).
        idx = sys.argv.index("--wellness")
        days = 90
        if idx + 1 < len(sys.argv) and sys.argv[idx + 1].isdigit():
            days = int(sys.argv[idx + 1])
        init_db()
        users = configured_users()
        with get_conn() as conn:
            slot_to_id = ensure_users(conn, users)
        for user in users:
            log.info("=== Wellness backfill: %s ===", user["name"])
            client = get_client(user)
            with get_conn() as conn:
                sync_daily_metrics(client, conn, slot_to_id[user["slot"]], days=days)
        sys.exit(0)

    full = "--full" in sys.argv
    try:
        sys.exit(1 if run(full=full) else 0)
    except SystemExit:
        raise
    except Exception as e:
        log.exception("Fetch failed: %s", e)
        try:
            with get_conn() as conn:
                conn.execute(
                    "INSERT INTO sync_log (last_sync, activities_fetched, status, message) VALUES (?, 0, ?, ?)",
                    (datetime.utcnow().isoformat(), "error", str(e)),
                )
                conn.commit()
        except Exception:
            pass
        sys.exit(1)
