// Mirrors the shapes returned by the Flask API. Used automatically by
// api.js whenever a real fetch fails (e.g. before the backend/.env is set
// up), so the React side can be built and practiced independently.

const ZONE_SAMPLE = { "1": 240, "2": 900, "3": 1100, "4": 380, "5": 60 };

const MOCK_NAMES = ["Morning Base", "Riverside Tempo", "Long Run", "Recovery Jog", "Threshold Repeats"];
const MOCK_TE = ["BASE", "TEMPO", "BASE", "RECOVERY", "THRESHOLD"];

function run(id, daysAgo, distanceKm, paceSecPerKm, hrAvg) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const distance = distanceKm * 1000;
  const duration = paceSecPerKm * distanceKm;
  return {
    id,
    garmin_id: `mock-${id}`,
    start_time: date.toISOString(),
    distance,
    duration,
    pace: paceSecPerKm,
    heart_rate_avg: hrAvg,
    heart_rate_max: hrAvg + 22,
    heart_rate_zones: ZONE_SAMPLE,
    cadence_avg: 168,
    elevation_gain: Math.round(distanceKm * 8),
    elevation_loss: Math.round(distanceKm * 8),
    training_effect_aerobic: 3.2,
    training_effect_anaerobic: 1.1,
    vo2max: 47,
    weather: { tempC: 18, condition: "partly_cloudy" },
    gear: "Pegasus 40",
    activity_name: MOCK_NAMES[id % MOCK_NAMES.length],
    location_name: "Riverside Park",
    avg_power: 280,
    norm_power: 288,
    avg_ground_contact_time: 245,
    avg_stride_length: 118,
    avg_vertical_oscillation: 8.4,
    avg_vertical_ratio: 7.1,
    calories: Math.round(distanceKm * 62),
    water_estimated: Math.round(distanceKm * 90),
    steps: Math.round(distanceKm * 1150),
    training_effect_label: MOCK_TE[id % MOCK_TE.length],
    moderate_intensity_minutes: 6,
    vigorous_intensity_minutes: Math.round(duration / 60) - 6,
    temperature: 18,
    splits: Array.from({ length: Math.ceil(distanceKm) }, (_, i) => ({
      distance: 1000,
      duration: paceSecPerKm,
      avg_pace: paceSecPerKm,
    })),
    polyline: [
      [35.681, 139.767],
      [35.683, 139.769],
      [35.685, 139.766],
      [35.684, 139.762],
      [35.681, 139.767],
    ],
  };
}

export const mockActivities = [
  run(5, 0, 8.2, 305, 152),
  run(4, 2, 5.0, 290, 148),
  run(3, 4, 12.1, 320, 158),
  run(2, 9, 6.5, 300, 150),
  run(1, 14, 21.3, 315, 160),
];

// Derived from the same relative-dated runs the rest of the mock uses, so the
// week window (header + bar chart) and the activity list always agree. The old
// static June dates were frozen while mockActivities float relative to today,
// which made the header and the runs table disagree. Monday-first / Sunday-end,
// mirroring the real /api/this-week (which the backend computes server-side).
export const mockThisWeek = (() => {
  const isoLocal = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7)); // 0 = Monday
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const weekStart = isoLocal(monday);
  const weekEnd = isoLocal(sunday);
  const runDate = (a) => isoLocal(new Date(a.start_time));
  const inWeek = mockActivities.filter((a) => runDate(a) >= weekStart && runDate(a) <= weekEnd);

  const daily_distance_km = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const iso = isoLocal(d);
    const km = inWeek
      .filter((a) => runDate(a) === iso)
      .reduce((s, a) => s + a.distance / 1000, 0);
    return { date: iso, distance_km: Math.round(km * 10) / 10 };
  });

  const totalMeters = inWeek.reduce((s, a) => s + a.distance, 0);
  const totalDuration = inWeek.reduce((s, a) => s + a.duration, 0);

  // Last week's per-day volume (the faint comparison bars) and per-day cross-
  // training minutes. Both are shaped like the real endpoint; the values are a
  // fixed pattern so the demo view looks plausible rather than random.
  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const PREV_KM = [0, 8.2, 5.1, 0, 10.4, 6.3, 16.8];
  const prev_daily_distance_km = PREV_KM.map((km, i) => {
    const d = new Date(prevMonday);
    d.setDate(d.getDate() + i);
    return { date: isoLocal(d), distance_km: km };
  });

  const CROSS_MIN = [
    [45, 0], [0, 0], [40, 0], [0, 55], [0, 0], [50, 0], [0, 75],
  ];
  const daily_cross_training_min = CROSS_MIN.map(([strength_min, other_min], i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return { date: isoLocal(d), strength_min, other_min };
  });

  return {
    week_start: weekStart,
    week_end: weekEnd,
    daily_distance_km,
    total_distance_km: Math.round((totalMeters / 1000) * 10) / 10,
    total_duration_sec: Math.round(totalDuration),
    avg_pace_sec_per_km: totalMeters > 0 ? Math.round(totalDuration / (totalMeters / 1000)) : 0,
    heart_rate_zone_seconds: ZONE_SAMPLE,
    activities: inWeek,
    cross_training: [],
    daily_cross_training_min,
    prev_week_start: isoLocal(prevMonday),
    prev_daily_distance_km,
    prev_total_distance_km: Math.round(PREV_KM.reduce((s, v) => s + v, 0) * 10) / 10,
  };
})();

export const mockTrainingMix = Array.from({ length: 10 }, (_, i) => {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - (9 - i) * 7);
  return {
    week_start: monday.toISOString().slice(0, 10),
    run_hours: Math.round((3.4 + Math.sin(i / 2) * 1.2) * 10) / 10,
    strength_hours: Math.round((1.1 + Math.cos(i / 3) * 0.5) * 10) / 10,
    other_hours: Math.round((0.8 + Math.sin(i / 1.7) * 0.6) * 10) / 10,
  };
});

export const mockWeeklyMileage = Array.from({ length: 16 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (15 - i) * 7);
  return {
    week_start: date.toISOString().slice(0, 10),
    distance_km: Math.round((20 + Math.sin(i / 2) * 10 + i * 0.6) * 10) / 10,
  };
});

export const mockCalendar = (() => {
  const days = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const runProbability = Math.random();
    days.push({
      date: date.toISOString().slice(0, 10),
      distance_km: runProbability > 0.6 ? Math.round(runProbability * 12 * 10) / 10 : 0,
    });
  }
  return days;
})();

const mockVo2Trend = Array.from({ length: 24 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (23 - i) * 14);
  return {
    date: date.toISOString().slice(0, 10),
    vo2max: Math.round((44 + Math.sin(i / 3) * 1.5 + i * 0.12) * 10) / 10,
  };
});

export const mockVo2maxTrend = {
  current: 49,
  current_date: mockVo2Trend[mockVo2Trend.length - 1].date,
  trend: mockVo2Trend,
};

export const mockWeeklyInsights = Array.from({ length: 16 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (15 - i) * 7);
  const moderate = 8 + Math.round(Math.random() * 14);
  const vigorous = 40 + Math.round(Math.random() * 70);
  return {
    week_start: date.toISOString().slice(0, 10),
    moderate_min: moderate,
    vigorous_min: vigorous,
    intensity_total: moderate + 2 * vigorous,
    load_kj: 1800 + Math.round(Math.random() * 3200),
  };
});

export const mockUsers = [
  { id: 1, slot: 1, name: "User 1" },
  { id: 2, slot: 2, name: "User 2" },
];

export const mockRacePredictions = {
  date: new Date().toISOString().slice(0, 10),
  time_5k: 1424,
  time_10k: 3054,
  time_half_marathon: 6985,
  time_marathon: 15548,
};

export const mockWellnessTrend = Array.from({ length: 60 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (59 - i));
  return {
    date: date.toISOString().slice(0, 10),
    resting_hr: 40 + Math.round(Math.sin(i / 5) * 3),
    sleep_seconds: (6.5 + Math.random() * 1.8) * 3600,
    sleep_score: 70 + Math.round(Math.random() * 20),
    hrv_weekly_avg: 80 + Math.round(Math.sin(i / 7) * 8),
    hrv_last_night: 80 + Math.round(Math.random() * 25),
    hrv_status: "BALANCED",
    body_battery_high: 80 + Math.round(Math.random() * 19),
    body_battery_low: 10 + Math.round(Math.random() * 20),
    stress_avg: 20 + Math.round(Math.random() * 15),
  };
});

export const mockCurrentStatus = {
  vo2max: 49,
  resting_hr: 39,
  sleep_seconds: 25140,
  sleep_score: 84,
  hrv_weekly_avg: 85,
  hrv_last_night: 98,
  hrv_status: "BALANCED",
  body_battery_high: 99,
  body_battery_low: 25,
  stress_avg: 21,
  training_status: "PRODUCTIVE",
  training_status_phrase: null,
  acute_load: null,
  dates: {},
};

export const mockPersonalRecords = [
  { distance_name: "1K", label: "1 km", best_time_sec: 245, activity_id: 5, achieved_at: "2026-05-02" },
  { distance_name: "5K", label: "5 km", best_time_sec: 1390, activity_id: 4, achieved_at: "2026-04-10" },
  { distance_name: "10K", label: "10 km", best_time_sec: 2980, activity_id: 3, achieved_at: "2026-03-22" },
  { distance_name: "HALF", label: "Half Marathon", best_time_sec: 6720, activity_id: 1, achieved_at: "2026-02-01" },
  { distance_name: "MARATHON", label: "Marathon", best_time_sec: null, activity_id: null, achieved_at: null },
];
