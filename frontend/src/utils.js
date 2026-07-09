export function formatPace(secPerKm) {
  if (secPerKm == null || isNaN(secPerKm)) return "—";
  // Round to whole seconds first so 359.6s → 6:00, not 5:60.
  const total = Math.round(secPerKm);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${String(sec).padStart(2, "0")} /km`;
}

export function formatDuration(totalSeconds) {
  if (totalSeconds == null || isNaN(totalSeconds)) return "—";
  // Round to whole seconds first so carries roll up correctly (e.g. 119.6s → 2:00).
  const total = Math.round(totalSeconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDistanceKm(meters) {
  if (meters == null) return "—";
  return (meters / 1000).toFixed(2);
}

export function formatDateShort(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDayLabel(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export const ZONE_COLORS = {
  "1": "var(--color-zone1)",
  "2": "var(--color-zone2)",
  "3": "var(--color-zone3)",
  "4": "var(--color-zone4)",
  "5": "var(--color-zone5)",
};

// --- Tier-1 enrichment formatters (metrics sourced from the run summary) ---

export function formatPower(watts) {
  if (watts == null) return "—";
  return `${Math.round(watts)} W`;
}

export function formatTemp(c) {
  if (c == null) return "—";
  return `${Math.round(c)}°C`;
}

export function formatCalories(cal) {
  if (cal == null) return "—";
  return `${Math.round(cal)}`;
}

export function formatHydration(ml) {
  if (ml == null) return "—";
  return `${(ml / 1000).toFixed(2)} L`;
}

export function formatStride(cm) {
  if (cm == null) return "—";
  return `${(cm / 100).toFixed(2)} m`;
}

export function formatMs(ms) {
  if (ms == null) return "—";
  return `${Math.round(ms)} ms`;
}

export function formatCm(cm) {
  if (cm == null) return "—";
  return `${cm.toFixed(1)} cm`;
}

export function formatPercent(v) {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

export function formatSleep(seconds) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// Prettify a Garmin status enum like "PRODUCTIVE" or "HRV_BALANCED_5".
export function prettyStatus(s) {
  if (!s) return "—";
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Map a Garmin trainingEffectLabel to a display label + zone-palette color.
const TE_COLORS = {
  RECOVERY: "var(--color-zone1)",
  BASE: "var(--color-zone2)",
  AEROBIC_BASE: "var(--color-zone2)",
  TEMPO: "var(--color-zone3)",
  THRESHOLD: "var(--color-zone4)",
  LACTATE_THRESHOLD: "var(--color-zone4)",
  VO2MAX: "var(--color-zone5)",
  ANAEROBIC: "var(--color-zone5)",
  SPRINT: "var(--color-zone5)",
};

export function trainingEffect(label) {
  if (!label) return null;
  const color = TE_COLORS[label] || "var(--color-muted)";
  const text = label
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { text, color };
}
