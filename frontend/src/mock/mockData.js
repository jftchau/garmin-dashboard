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

export const mockThisWeek = {
  week_start: "2026-06-15",
  week_end: "2026-06-21",
  daily_distance_km: [
    { date: "2026-06-15", distance_km: 8.2 },
    { date: "2026-06-16", distance_km: 0 },
    { date: "2026-06-17", distance_km: 5.0 },
    { date: "2026-06-18", distance_km: 0 },
    { date: "2026-06-19", distance_km: 0 },
    { date: "2026-06-20", distance_km: 12.1 },
    { date: "2026-06-21", distance_km: 0 },
  ],
  total_distance_km: 25.3,
  total_duration_sec: 7820,
  avg_pace_sec_per_km: 309,
  heart_rate_zone_seconds: ZONE_SAMPLE,
  activities: mockActivities.slice(0, 3),
};

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
