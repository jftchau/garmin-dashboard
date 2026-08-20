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

// "2026-05-23" -> "May 23", parsed in local time so the day doesn't shift.
// Used for chart axis ticks, where the full ISO date is long and unreadable at
// kiosk distance.
export function axisDate(iso) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Head-to-head runner colors, indexed by position in the users array (Runner A
// = marigold, Runner B = olive green). Mirrors --color-runner-a/-b in
// index.css. RGB strings feed the calendar heatmap's rgba() ramp.
export const RUNNER_COLORS = ["var(--color-runner-a)", "var(--color-runner-b)"];
export const RUNNER_RGB = ["245,165,36", "155,181,59"];

// Neutral + alert channels as rgb strings, for the places that need to ramp
// opacity in an inline style (a chart fill can't take a CSS var with an alpha).
export const SLATE_RGB = "152,162,179";
export const EMBER_RGB = "229,72,77";

// Layer 2 of the palette: "more of the same person" is the SAME hue at a higher
// opacity, never a different hue. One shared ramp, so a heavy week on the
// calendar and a hard heart-rate zone darken the same way. Index 0 = lightest.
export const INTENSITY_STEPS = [0.32, 0.48, 0.66, 0.82, 1];

export const intensity = (rgb, step) =>
  `rgba(${rgb},${INTENSITY_STEPS[Math.max(0, Math.min(INTENSITY_STEPS.length - 1, step))]})`;

// Short display name for a runner slot, falling back to "Runner N" when unnamed.
export function runnerName(users, i) {
  const u = users?.[i];
  return (u && u.name && u.name.trim()) || `Runner ${i + 1}`;
}

// Heart-rate zones are shades of whoever's zones they are: zone N takes step
// N-1 of the shared intensity ramp. Zones used to be five unrelated hues, which
// put five extra colors on screen and made the two runners' doughnuts look like
// different charts rather than the same chart twice.
export const zoneColor = (rgb, zone) => intensity(rgb, Number(zone) - 1);

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

// Map a Garmin trainingEffectLabel to a display label + color. Effort is a
// scale, so it rides the neutral lightness ramp (easy = dim, hard = bright) and
// only the genuinely maximal efforts reach for the one alert hue.
const TE_COLORS = {
  RECOVERY: "var(--color-slate-dim)",
  BASE: "var(--color-slate-dim)",
  AEROBIC_BASE: "var(--color-slate-dim)",
  TEMPO: "var(--color-slate)",
  THRESHOLD: "var(--color-chalk)",
  LACTATE_THRESHOLD: "var(--color-chalk)",
  VO2MAX: "var(--color-ember)",
  ANAEROBIC: "var(--color-ember)",
  SPRINT: "var(--color-ember)",
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
