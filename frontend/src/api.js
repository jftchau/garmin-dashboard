import {
  mockActivities,
  mockThisWeek,
  mockWeeklyMileage,
  mockCalendar,
  mockPersonalRecords,
  mockVo2maxTrend,
  mockWeeklyInsights,
  mockRacePredictions,
  mockWellnessTrend,
  mockCurrentStatus,
  mockUsers,
} from "./mock/mockData.js";

const BASE = "/api";

// Which user's data to request. Set by the app when a user is selected; the
// backend defaults to the first user when it's null.
let currentUserId = null;
export function setCurrentUser(id) {
  currentUserId = id;
}

// --- Data-source tracking ---------------------------------------------------
// Every read goes through getJSON(), which silently falls back to mock data
// when the backend is unreachable. That silence is confusing (mock values can
// look like real, wrong data), so we record the latest read's outcome and let
// the UI surface it. "unknown" until the first read resolves.
let dataSource = "unknown"; // "real" | "mock" | "unknown"
const dataSourceListeners = new Set();

export function getDataSource() {
  return dataSource;
}

export function subscribeDataSource(fn) {
  dataSourceListeners.add(fn);
  return () => dataSourceListeners.delete(fn);
}

function setDataSource(next) {
  if (next === dataSource) return;
  dataSource = next;
  dataSourceListeners.forEach((fn) => fn(next));
}

async function getJSON(path, fallback) {
  const sep = path.includes("?") ? "&" : "?";
  const url = currentUserId != null ? `${BASE}${path}${sep}user=${currentUserId}` : `${BASE}${path}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    setDataSource("real");
    return json;
  } catch (err) {
    console.warn(`[api] falling back to mock data for ${path}:`, err.message);
    setDataSource("mock");
    return fallback;
  }
}

export function fetchUsers() {
  return getJSON("/users", mockUsers);
}

export async function updateUserName(id, name) {
  const res = await fetch(`${BASE}/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export function fetchActivities(limit = 20, offset = 0) {
  return getJSON(`/activities?limit=${limit}&offset=${offset}`, {
    activities: mockActivities,
    total: mockActivities.length,
    limit,
    offset,
  });
}

export function fetchActivity(id) {
  const fallback = mockActivities.find((a) => a.id === id) || mockActivities[0];
  return getJSON(`/activity/${id}`, fallback);
}

export function fetchThisWeek() {
  return getJSON("/this-week", mockThisWeek);
}

export function fetchWeeklyMileage() {
  return getJSON("/weekly-mileage", mockWeeklyMileage);
}

export function fetchCalendar(days = 365) {
  return getJSON(`/calendar?days=${days}`, mockCalendar);
}

export function fetchPersonalRecords() {
  return getJSON("/personal-records", mockPersonalRecords);
}

export function fetchVo2maxTrend() {
  return getJSON("/vo2max-trend", mockVo2maxTrend);
}

export function fetchWeeklyInsights() {
  return getJSON("/weekly-insights", mockWeeklyInsights);
}

export function fetchRacePredictions() {
  return getJSON("/race-predictions", mockRacePredictions);
}

export function fetchWellnessTrend(days = 90) {
  return getJSON(`/wellness-trend?days=${days}`, mockWellnessTrend);
}

export function fetchCurrentStatus() {
  return getJSON("/current-status", mockCurrentStatus);
}

export async function triggerSync() {
  try {
    const res = await fetch(`${BASE}/sync-now`, { method: "POST" });
    return await res.json();
  } catch (err) {
    return { ok: false, error: "Backend not reachable (using mock data)" };
  }
}
