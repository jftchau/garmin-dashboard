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

async function getJSON(path, fallback, userId) {
  const sep = path.includes("?") ? "&" : "?";
  // Explicit userId (head-to-head views fetch each runner) overrides the global.
  const uid = userId != null ? userId : currentUserId;
  const url = uid != null ? `${BASE}${path}${sep}user=${uid}` : `${BASE}${path}`;
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

export function fetchActivities(limit = 20, offset = 0, userId) {
  return getJSON(
    `/activities?limit=${limit}&offset=${offset}`,
    {
      activities: mockActivities,
      total: mockActivities.length,
      limit,
      offset,
    },
    userId
  );
}

export function fetchActivity(id, userId) {
  const fallback = mockActivities.find((a) => a.id === id) || mockActivities[0];
  return getJSON(`/activity/${id}`, fallback, userId);
}

export function fetchThisWeek(userId) {
  return getJSON("/this-week", mockThisWeek, userId);
}

export function fetchWeeklyMileage(userId) {
  return getJSON("/weekly-mileage", mockWeeklyMileage, userId);
}

export function fetchCalendar(days = 365, userId) {
  return getJSON(`/calendar?days=${days}`, mockCalendar, userId);
}

export function fetchPersonalRecords(userId) {
  return getJSON("/personal-records", mockPersonalRecords, userId);
}

export function fetchVo2maxTrend(userId) {
  return getJSON("/vo2max-trend", mockVo2maxTrend, userId);
}

export function fetchWeeklyInsights(userId) {
  return getJSON("/weekly-insights", mockWeeklyInsights, userId);
}

export function fetchRacePredictions(userId) {
  return getJSON("/race-predictions", mockRacePredictions, userId);
}

export function fetchWellnessTrend(days = 90, userId) {
  return getJSON(`/wellness-trend?days=${days}`, mockWellnessTrend, userId);
}

export function fetchCurrentStatus(userId) {
  return getJSON("/current-status", mockCurrentStatus, userId);
}

export function fetchLastSync() {
  // No user param — freshness is global across runners. Mock stays null so the
  // indicator simply hides when the backend is down (the DataSourceBadge already
  // signals "Demo data" in that case).
  return getJSON("/last-sync", { last_sync: null });
}

export async function triggerSync() {
  try {
    const res = await fetch(`${BASE}/sync-now`, { method: "POST" });
    return await res.json();
  } catch (err) {
    return { ok: false, error: "Backend not reachable (using mock data)" };
  }
}
