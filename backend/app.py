"""
app.py — read-only Flask API over the SQLite DB that fetch_garmin.py fills.

Endpoints:
    GET /api/activities?limit=20&offset=0
    GET /api/activity/<id>
    GET /api/this-week
    GET /api/weekly-mileage
    GET /api/calendar
    GET /api/personal-records
    POST /api/sync-now           -- runs fetch_garmin.py synchronously

Run directly for dev:  python app.py
In production this runs under systemd, bound to 127.0.0.1:5000,
with Nginx proxying /api/* to it from the public-facing port 8080.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from db import get_conn, init_db, rows_to_list, row_to_dict

load_dotenv()

app = Flask(__name__)
CORS(app)

PR_LABELS = {
    "1K": "1 km",
    "5K": "5 km",
    "10K": "10 km",
    "HALF": "Half Marathon",
    "MARATHON": "Marathon",
}


def parse_json_field(value):
    if not value:
        return None
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return None


def serialize_activity(row, full=False):
    d = dict(row)
    d["heart_rate_zones"] = parse_json_field(d.get("heart_rate_zones"))
    d["weather"] = parse_json_field(d.get("weather"))
    if full:
        d["splits"] = parse_json_field(d.get("splits"))
        d["polyline"] = parse_json_field(d.get("polyline"))
        d.pop("raw_json", None)
    else:
        d.pop("splits", None)
        d.pop("polyline", None)
        d.pop("raw_json", None)
    return d


def week_bounds(reference=None):
    """Return (monday, next_monday) datetimes for the week containing `reference`.

    Uses local time (datetime.now), not UTC: Garmin stores each activity's
    `startTimeLocal`, so the current week must be computed in the same local
    frame or runs near midnight land in the wrong week.
    """
    ref = reference or datetime.now()
    monday = ref - timedelta(days=ref.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    next_monday = monday + timedelta(days=7)
    return monday, next_monday


def resolve_user_id(conn):
    """The user whose data an endpoint should return: ?user=<id>, else the
    first configured user."""
    raw = request.args.get("user")
    if raw and raw.isdigit():
        return int(raw)
    r = conn.execute("SELECT id FROM users ORDER BY slot, id LIMIT 1").fetchone()
    return r["id"] if r else 1


@app.route("/api/users")
def list_users():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, slot, name, garmin_email FROM users ORDER BY slot, id"
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/users/<int:user_id>", methods=["PATCH"])
def update_user(user_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    with get_conn() as conn:
        cur = conn.execute("UPDATE users SET name = ? WHERE id = ?", (name, user_id))
        conn.commit()
    if cur.rowcount == 0:
        return jsonify({"error": "not found"}), 404
    return jsonify({"id": user_id, "name": name})


@app.route("/api/activities")
def get_activities():
    limit = int(request.args.get("limit", 20))
    offset = int(request.args.get("offset", 0))
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        rows = conn.execute(
            "SELECT * FROM activities WHERE user_id = ? ORDER BY start_time DESC LIMIT ? OFFSET ?",
            (uid, limit, offset),
        ).fetchall()
        total = conn.execute(
            "SELECT COUNT(*) AS c FROM activities WHERE user_id = ?", (uid,)
        ).fetchone()["c"]
    return jsonify({
        "activities": [serialize_activity(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    })


@app.route("/api/activity/<int:activity_id>")
def get_activity(activity_id):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM activities WHERE id = ?", (activity_id,)).fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(serialize_activity(row, full=True))


@app.route("/api/this-week")
def this_week():
    monday, next_monday = week_bounds()
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        # Compare on the date prefix only. Garmin stores start_time as a
        # space-separated local timestamp ("2026-07-06 08:30:00"), so comparing
        # against an isoformat() boundary ("...T00:00:00") would sort a Monday
        # run *before* the Monday boundary (space < 'T') and drop it.
        rows = conn.execute(
            "SELECT * FROM activities WHERE user_id = ? AND start_time >= ? AND start_time < ? ORDER BY start_time",
            (uid, monday.strftime("%Y-%m-%d"), next_monday.strftime("%Y-%m-%d")),
        ).fetchall()

    activities = [serialize_activity(r) for r in rows]

    daily = {}
    for i in range(7):
        day = (monday + timedelta(days=i)).strftime("%Y-%m-%d")
        daily[day] = 0.0

    zone_totals = {}
    total_distance = 0.0
    total_duration = 0.0

    for a in activities:
        day = a["start_time"][:10]
        if day in daily:
            daily[day] += (a["distance"] or 0) / 1000.0
        total_distance += a["distance"] or 0
        total_duration += a["duration"] or 0
        zones = a.get("heart_rate_zones") or {}
        for z, secs in zones.items():
            zone_totals[z] = zone_totals.get(z, 0) + secs

    avg_pace = (total_duration / (total_distance / 1000)) if total_distance else None

    return jsonify({
        "week_start": monday.strftime("%Y-%m-%d"),
        "week_end": (next_monday - timedelta(days=1)).strftime("%Y-%m-%d"),
        "daily_distance_km": [{"date": d, "distance_km": round(v, 2)} for d, v in daily.items()],
        "total_distance_km": round(total_distance / 1000, 2),
        "total_duration_sec": total_duration,
        "avg_pace_sec_per_km": avg_pace,
        "heart_rate_zone_seconds": zone_totals,
        "activities": activities,
    })


@app.route("/api/weekly-mileage")
def weekly_mileage():
    """All-time weekly distance totals, for the History line chart."""
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        rows = conn.execute(
            "SELECT start_time, distance FROM activities WHERE user_id = ? AND distance IS NOT NULL ORDER BY start_time",
            (uid,),
        ).fetchall()

    weeks = {}
    for r in rows:
        try:
            dt = datetime.fromisoformat(r["start_time"])
        except ValueError:
            continue
        monday = dt - timedelta(days=dt.weekday())
        key = monday.strftime("%Y-%m-%d")
        weeks[key] = weeks.get(key, 0) + (r["distance"] or 0)

    result = [{"week_start": k, "distance_km": round(v / 1000, 2)} for k, v in sorted(weeks.items())]
    return jsonify(result)


@app.route("/api/vo2max-trend")
def vo2max_trend():
    """Fitness-trend chart data.

    `trend` is the per-run vO2MaxValue over time (the estimate each run
    contributes). `current` is Garmin's authoritative daily VO2max (the number
    shown on the watch); it falls back to the latest per-run value if we haven't
    captured a Max Metrics reading yet.
    """
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        rows = conn.execute(
            "SELECT start_time, vo2max FROM activities WHERE user_id = ? AND vo2max IS NOT NULL ORDER BY start_time",
            (uid,),
        ).fetchall()
        cur = conn.execute(
            "SELECT date, vo2max FROM user_metrics WHERE user_id = ? AND vo2max IS NOT NULL ORDER BY date DESC LIMIT 1",
            (uid,),
        ).fetchone()

    trend = [{"date": r["start_time"][:10], "vo2max": r["vo2max"]} for r in rows]
    if cur:
        current, current_date = cur["vo2max"], cur["date"]
    elif trend:
        current, current_date = trend[-1]["vo2max"], trend[-1]["date"]
    else:
        current, current_date = None, None

    return jsonify({"current": current, "current_date": current_date, "trend": trend})


@app.route("/api/weekly-insights")
def weekly_insights():
    """Per-week intensity minutes and training load (mechanical work from
    running power), for the Insights charts."""
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        rows = conn.execute(
            """
            SELECT start_time, duration, avg_power,
                   moderate_intensity_minutes, vigorous_intensity_minutes
            FROM activities WHERE user_id = ?
            """,
            (uid,),
        ).fetchall()

    weeks = {}
    for r in rows:
        try:
            dt = datetime.fromisoformat(r["start_time"])
        except (TypeError, ValueError):
            continue
        monday = dt - timedelta(days=dt.weekday())
        key = monday.strftime("%Y-%m-%d")
        w = weeks.setdefault(key, {"moderate": 0, "vigorous": 0, "load_kj": 0.0})
        w["moderate"] += r["moderate_intensity_minutes"] or 0
        w["vigorous"] += r["vigorous_intensity_minutes"] or 0
        if r["avg_power"] and r["duration"]:
            w["load_kj"] += r["avg_power"] * r["duration"] / 1000.0

    result = []
    for k in sorted(weeks):
        w = weeks[k]
        result.append({
            "week_start": k,
            "moderate_min": w["moderate"],
            "vigorous_min": w["vigorous"],
            # WHO counts vigorous minutes double toward the 150-min/week target.
            "intensity_total": w["moderate"] + 2 * w["vigorous"],
            "load_kj": round(w["load_kj"]),
        })
    return jsonify(result)


@app.route("/api/calendar")
def calendar():
    """Daily distance totals for the run-frequency heatmap."""
    days_param = int(request.args.get("days", 365))
    cutoff = (datetime.now() - timedelta(days=days_param)).strftime("%Y-%m-%d")
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        rows = conn.execute(
            "SELECT start_time, distance FROM activities WHERE user_id = ? AND start_time >= ?",
            (uid, cutoff),
        ).fetchall()

    daily = {}
    for r in rows:
        day = r["start_time"][:10]
        daily[day] = daily.get(day, 0) + (r["distance"] or 0)

    result = [{"date": d, "distance_km": round(v / 1000, 2)} for d, v in sorted(daily.items())]
    return jsonify(result)


@app.route("/api/personal-records")
def personal_records():
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        rows = conn.execute(
            """
            SELECT pr.distance_name, pr.best_time, pr.achieved_at, a.id as activity_id,
                   a.distance, a.start_time
            FROM personal_records pr
            LEFT JOIN activities a ON a.id = pr.activity_id
            WHERE pr.user_id = ?
            """,
            (uid,),
        ).fetchall()

    order = ["1K", "5K", "10K", "HALF", "MARATHON"]
    by_name = {r["distance_name"]: dict(r) for r in rows}
    result = []
    for name in order:
        r = by_name.get(name)
        result.append({
            "distance_name": name,
            "label": PR_LABELS[name],
            "best_time_sec": r["best_time"] if r else None,
            "activity_id": r["activity_id"] if r else None,
            "achieved_at": r["achieved_at"] if r else None,
        })
    return jsonify(result)


@app.route("/api/race-predictions")
def race_predictions():
    """Garmin's latest predicted race times (seconds)."""
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        r = conn.execute(
            "SELECT date, time_5k, time_10k, time_half_marathon, time_marathon "
            "FROM race_predictions WHERE user_id = ? ORDER BY date DESC LIMIT 1",
            (uid,),
        ).fetchone()
    return jsonify(dict(r) if r else {})


@app.route("/api/wellness-trend")
def wellness_trend():
    """Daily wellness rows (resting HR, sleep, HRV, body battery, stress, ...)."""
    days = int(request.args.get("days", 90))
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        rows = conn.execute(
            "SELECT * FROM user_metrics WHERE user_id = ? AND date >= ? ORDER BY date",
            (uid, cutoff),
        ).fetchall()
    return jsonify([dict(r) for r in rows])


DAILY_STATUS_FIELDS = [
    "vo2max", "resting_hr", "sleep_seconds", "sleep_score", "hrv_weekly_avg",
    "hrv_last_night", "hrv_status", "body_battery_high", "body_battery_low",
    "stress_avg", "training_status", "training_status_phrase", "acute_load",
]


@app.route("/api/current-status")
def current_status():
    """Latest available value for each daily metric (each may be from a
    different day, since not every metric is recorded every day)."""
    result = {f: None for f in DAILY_STATUS_FIELDS}
    result["dates"] = {}
    with get_conn() as conn:
        uid = resolve_user_id(conn)
        for f in DAILY_STATUS_FIELDS:
            r = conn.execute(
                f"SELECT date, {f} AS v FROM user_metrics WHERE user_id = ? AND {f} IS NOT NULL ORDER BY date DESC LIMIT 1",
                (uid,),
            ).fetchone()
            if r:
                result[f] = r["v"]
                result["dates"][f] = r["date"]
    return jsonify(result)


@app.route("/api/sync-now", methods=["POST"])
def sync_now():
    """Manual refresh button hits this — runs the fetcher synchronously."""
    script = os.path.join(os.path.dirname(__file__), "fetch_garmin.py")
    try:
        result = subprocess.run(
            [sys.executable, script],
            capture_output=True, text=True, timeout=300,
        )
        ok = result.returncode == 0
        return jsonify({
            "ok": ok,
            "output": result.stdout[-2000:],
            "error": result.stderr[-2000:] if not ok else None,
        }), (200 if ok else 500)
    except subprocess.TimeoutExpired:
        return jsonify({"ok": False, "error": "fetch timed out"}), 500


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    init_db()
    port = int(os.getenv("FLASK_PORT", 5000))
    # Debug/reloader off by default; opt in locally with FLASK_DEBUG=1.
    app.run(host="127.0.0.1", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
