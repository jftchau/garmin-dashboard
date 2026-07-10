"""
Tiny SQLite helper shared by fetch_garmin.py and app.py.
No ORM on purpose — this is a single-user, low-traffic, single-table-family app.
"""
import os
import sqlite3
from contextlib import contextmanager

from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "garmin.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


# Columns added after the initial schema shipped. Kept in sync with schema.sql;
# applied to already-created databases via ALTER TABLE (SQLite has no
# "ADD COLUMN IF NOT EXISTS", so we diff against PRAGMA table_info).
MIGRATION_COLUMNS = {
    "activity_type": "TEXT",
    "activity_name": "TEXT",
    "location_name": "TEXT",
    "calories": "REAL",
    "water_estimated": "REAL",
    "steps": "INTEGER",
    "avg_power": "REAL",
    "norm_power": "REAL",
    "avg_ground_contact_time": "REAL",
    "avg_stride_length": "REAL",
    "avg_vertical_oscillation": "REAL",
    "avg_vertical_ratio": "REAL",
    "training_effect_label": "TEXT",
    "moderate_intensity_minutes": "INTEGER",
    "vigorous_intensity_minutes": "INTEGER",
    "temperature": "REAL",
    "fastest_split_1000": "REAL",
    "fastest_split_1609": "REAL",
}


# Columns added to user_metrics after it first shipped (initially date/vo2max).
USER_METRICS_COLUMNS = {
    "resting_hr": "INTEGER",
    "sleep_seconds": "INTEGER",
    "sleep_score": "INTEGER",
    "hrv_weekly_avg": "INTEGER",
    "hrv_last_night": "INTEGER",
    "hrv_status": "TEXT",
    "body_battery_high": "INTEGER",
    "body_battery_low": "INTEGER",
    "stress_avg": "INTEGER",
    "training_status": "TEXT",
    "training_status_phrase": "TEXT",
    "acute_load": "REAL",
}


def _table_columns(conn, table):
    return [r["name"] for r in conn.execute(f"PRAGMA table_info({table})")]


def _add_missing_columns(conn, table, columns):
    existing = set(_table_columns(conn, table))
    for col, col_type in columns.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")


# DDL for the tables whose primary key becomes composite (user_id, natural key).
# Used to rebuild pre-multi-user databases without losing data.
_PR_DDL = """
CREATE TABLE personal_records (
    user_id INTEGER NOT NULL DEFAULT 1,
    distance_name TEXT NOT NULL,
    best_time REAL,
    activity_id INTEGER,
    achieved_at TEXT,
    PRIMARY KEY (user_id, distance_name),
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);
"""

_UM_DDL = """
CREATE TABLE user_metrics (
    user_id INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,
    vo2max REAL, resting_hr INTEGER, sleep_seconds INTEGER, sleep_score INTEGER,
    hrv_weekly_avg INTEGER, hrv_last_night INTEGER, hrv_status TEXT,
    body_battery_high INTEGER, body_battery_low INTEGER, stress_avg INTEGER,
    training_status TEXT, training_status_phrase TEXT, acute_load REAL,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date)
);
"""

_RP_DDL = """
CREATE TABLE race_predictions (
    user_id INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,
    time_5k REAL, time_10k REAL, time_half_marathon REAL, time_marathon REAL,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date)
);
"""


def _rebuild_with_user_id(conn, table, create_ddl, default_uid):
    """Add user_id (as part of a composite PK) to a table that predates
    multi-user support, preserving existing rows under `default_uid`."""
    cols = _table_columns(conn, table)
    if "user_id" in cols:
        return  # already migrated, or a fresh multi-user install
    collist = ", ".join(cols)
    conn.execute(f"ALTER TABLE {table} RENAME TO _old_{table}")
    conn.executescript(create_ddl)
    conn.execute(
        f"INSERT INTO {table} (user_id, {collist}) SELECT ?, {collist} FROM _old_{table}",
        (default_uid,),
    )
    conn.execute(f"DROP TABLE _old_{table}")


def _ensure_default_user(conn):
    if conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"] == 0:
        conn.execute("INSERT INTO users (slot, name, garmin_email) VALUES (1, 'User 1', NULL)")


def _migrate(conn):
    _ensure_default_user(conn)
    default_uid = conn.execute("SELECT id FROM users ORDER BY slot, id LIMIT 1").fetchone()["id"]

    _add_missing_columns(conn, "activities", MIGRATION_COLUMNS)
    _add_missing_columns(conn, "user_metrics", USER_METRICS_COLUMNS)

    # Every activity that predates the multi-sport change is a run (the fetcher
    # only stored running activities until now). Tag them so run-only queries,
    # which filter on activity_type, keep matching them. New non-run rows always
    # carry a real typeKey, so this only ever touches legacy NULLs.
    conn.execute("UPDATE activities SET activity_type = 'running' WHERE activity_type IS NULL")

    # Add user_id to the tables that only need a column (no PK change).
    for table in ("activities", "sync_log"):
        if "user_id" not in _table_columns(conn, table):
            conn.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER")
            conn.execute(f"UPDATE {table} SET user_id = ? WHERE user_id IS NULL", (default_uid,))

    # Rebuild the composite-PK tables, assigning existing rows to the first user.
    _rebuild_with_user_id(conn, "personal_records", _PR_DDL, default_uid)
    _rebuild_with_user_id(conn, "user_metrics", _UM_DDL, default_uid)
    _rebuild_with_user_id(conn, "race_predictions", _RP_DDL, default_uid)

    conn.execute("CREATE INDEX IF NOT EXISTS idx_activities_user_start ON activities(user_id, start_time)")


def init_db():
    """Create tables if they don't exist yet, and apply column migrations.
    Safe to call every run."""
    with get_conn() as conn:
        with open(SCHEMA_PATH) as f:
            conn.executescript(f.read())
        _migrate(conn)
        conn.commit()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def row_to_dict(row):
    return dict(row) if row else None


def rows_to_list(rows):
    return [dict(r) for r in rows]
