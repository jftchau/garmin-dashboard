import { useMemo } from "react";

const MS_DAY = 86400000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Parse a "YYYY-MM-DD" string as a *local* midnight date. `new Date(str)` would
// parse it as UTC and shift the weekday by a day in western timezones.
function localDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Monday-first weekday index (0 = Mon … 6 = Sun) for a Date.
const mondayIdx = (date) => (date.getDay() + 6) % 7;

const dayDiff = (a, b) => Math.round((a - b) / MS_DAY);

// Derive the frequency stats surfaced on the Calendar tab from the run-day list
// the /calendar endpoint returns ([{ date, distance_km }], run days only).
function calendarStats(data) {
  const runDays = (data || [])
    .filter((d) => d.distance_km > 0)
    .map((d) => d.date)
    .sort();
  if (runDays.length === 0) return null;

  const dates = runDays.map(localDate);

  // Weekday histogram (Mon-first).
  const byWeekday = Array(7).fill(0);
  dates.forEach((d) => byWeekday[mondayIdx(d)]++);
  const peakCount = Math.max(...byWeekday);
  const topWeekday = WEEKDAYS[byWeekday.indexOf(peakCount)];

  // Longest run of consecutive calendar days, and the longest gap between runs.
  let longestStreak = 1;
  let longestGap = 0;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const gap = dayDiff(dates[i], dates[i - 1]);
    if (gap === 1) {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 1;
      longestGap = Math.max(longestGap, gap - 1); // days without a run
    }
  }

  // Current streak: consecutive days with a run ending today (or yesterday, so a
  // streak still counts before that day's run is logged).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let currentStreak = 0;
  const daysSinceLast = dayDiff(today, dates[dates.length - 1]);
  if (daysSinceLast <= 1) {
    currentStreak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      if (dayDiff(dates[i], dates[i - 1]) === 1) currentStreak++;
      else break;
    }
  }

  // Runs per week over the window actually covered (first run → today).
  const spanDays = Math.max(1, dayDiff(today, dates[0]) + 1);
  const perWeek = runDays.length / (spanDays / 7);

  return {
    perWeek,
    currentStreak,
    longestStreak,
    longestGap,
    topWeekday,
    byWeekday,
    peakCount,
  };
}

function Stat({ label, value, unit, color }) {
  return (
    <div className="whitespace-nowrap">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="stat-mono text-lg short:text-base leading-tight" style={{ color }}>
        {value}
        {unit && <span className="text-xs text-muted ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

// Frequency stats + a Mon-Sun weekday-distribution sparkline for one runner,
// computed entirely from the /calendar run-day list. Laid out as ONE compact
// horizontal strip (not a stacked grid) so both runners still fit the 1024x600
// Pi screen with no scroll — see CLAUDE.md "Raspberry Pi display fit".
export default function CalendarStats({ data, color, rgb }) {
  const stats = useMemo(() => calendarStats(data), [data]);
  if (!stats) return null;

  return (
    <div className="mt-3 short:mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
      <Stat label="Runs / week" value={stats.perWeek.toFixed(1)} color={color} />
      <Stat label="Current streak" value={stats.currentStreak} unit="d" color={color} />
      <Stat label="Longest streak" value={stats.longestStreak} unit="d" color={color} />
      <Stat label="Longest layoff" value={stats.longestGap} unit="d" color={color} />
      <Stat label="Busiest day" value={stats.topWeekday} color={color} />

      <div className="ml-auto">
        <div className="font-mono text-[10px] uppercase tracking-wide text-muted mb-1">By weekday</div>
        <div className="flex items-end gap-1 h-9 short:h-7">
          {stats.byWeekday.map((count, i) => (
            <div key={i} className="flex flex-col items-center justify-end h-full gap-0.5 w-5 short:w-4">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${stats.peakCount ? (count / stats.peakCount) * 100 : 0}%`,
                  minHeight: count > 0 ? 3 : 0,
                  background: `rgb(${rgb})`,
                }}
                title={`${WEEKDAYS[i]}: ${count} runs`}
              />
              <span className="font-mono text-[9px] text-muted">{WEEKDAYS[i][0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
