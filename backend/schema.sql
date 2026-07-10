-- Garmin Run Dashboard schema (multi-user)

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot INTEGER UNIQUE,               -- maps to .env credential slot (1, 2, ...)
    name TEXT NOT NULL,                -- editable display name
    garmin_email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    garmin_id TEXT UNIQUE NOT NULL,    -- Garmin activity ids are globally unique
    start_time TEXT NOT NULL,          -- ISO 8601
    activity_type TEXT,                -- Garmin typeKey: 'running','cycling','strength_training',...
    distance REAL,                     -- meters
    duration REAL,                     -- seconds
    pace REAL,                         -- seconds per km
    heart_rate_avg INTEGER,
    heart_rate_max INTEGER,
    heart_rate_zones TEXT,             -- JSON: {"1": seconds, "2": seconds, ...}
    cadence_avg REAL,
    elevation_gain REAL,
    elevation_loss REAL,
    training_effect_aerobic REAL,
    training_effect_anaerobic REAL,
    vo2max REAL,
    weather TEXT,                      -- JSON: {"tempC": .., "condition": ..}
    gear TEXT,                         -- shoe name
    splits TEXT,                       -- JSON array of {distance, duration, pace}
    polyline TEXT,                     -- encoded or JSON list of [lat, lng]
    raw_json TEXT,                     -- full raw Garmin payload, for future use
    -- Richer summary metrics (all sourced from the activity summary / raw_json):
    activity_name TEXT,                -- e.g. "Jing'an - Base"
    location_name TEXT,
    calories REAL,
    water_estimated REAL,              -- ml
    steps INTEGER,
    avg_power REAL,                    -- watts
    norm_power REAL,                   -- watts (normalized)
    avg_ground_contact_time REAL,      -- ms
    avg_stride_length REAL,            -- cm
    avg_vertical_oscillation REAL,     -- cm
    avg_vertical_ratio REAL,           -- %
    training_effect_label TEXT,        -- RECOVERY / BASE / TEMPO / ...
    moderate_intensity_minutes INTEGER,
    vigorous_intensity_minutes INTEGER,
    temperature REAL,                  -- deg C
    fastest_split_1000 REAL,           -- seconds for fastest 1 km within the run
    fastest_split_1609 REAL,           -- seconds for fastest 1 mile within the run
    created_at TEXT DEFAULT (datetime('now'))
);
-- Note: idx_activities_user_start is created in db.py _migrate(), after the
-- user_id column is guaranteed to exist on already-migrated databases.

CREATE TABLE IF NOT EXISTS personal_records (
    user_id INTEGER NOT NULL DEFAULT 1,
    distance_name TEXT NOT NULL,       -- '1K','5K','10K','HALF','MARATHON'
    best_time REAL,                    -- seconds
    activity_id INTEGER,
    achieved_at TEXT,
    PRIMARY KEY (user_id, distance_name),
    FOREIGN KEY (activity_id) REFERENCES activities(id)
);

-- Authoritative daily fitness / wellness metrics from Garmin's daily endpoints
-- (the numbers the watch displays — distinct from per-run activity estimates).
CREATE TABLE IF NOT EXISTS user_metrics (
    user_id INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,                -- YYYY-MM-DD
    vo2max REAL,
    resting_hr INTEGER,
    sleep_seconds INTEGER,
    sleep_score INTEGER,
    hrv_weekly_avg INTEGER,
    hrv_last_night INTEGER,
    hrv_status TEXT,                   -- BALANCED / UNBALANCED / LOW / ...
    body_battery_high INTEGER,
    body_battery_low INTEGER,
    stress_avg INTEGER,
    training_status TEXT,              -- e.g. PRODUCTIVE / MAINTAINING / ...
    training_status_phrase TEXT,
    acute_load REAL,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date)
);

-- Garmin race-time predictions (seconds), snapshot per user per calendar date.
CREATE TABLE IF NOT EXISTS race_predictions (
    user_id INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,                -- YYYY-MM-DD
    time_5k REAL,
    time_10k REAL,
    time_half_marathon REAL,
    time_marathon REAL,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    last_sync TEXT,
    activities_fetched INTEGER,
    status TEXT,
    message TEXT
);
