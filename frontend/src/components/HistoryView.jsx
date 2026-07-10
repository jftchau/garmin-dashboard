import { useMemo, useState } from "react";
import { fetchWeeklyMileage } from "../api.js";
import { useTwoUsers } from "../useTwoUsers.js";
import { useCompact } from "../useCompact.js";
import WeeklyMileageChart from "./WeeklyMileageChart.jsx";
import CompareTable from "./CompareTable.jsx";
import { RUNNER_COLORS, runnerName } from "../utils.js";

const RANGE_OPTIONS = [
  { id: "12w", label: "12 weeks" },
  { id: "26w", label: "26 weeks" },
  { id: "1y", label: "1 year" },
  { id: "all", label: "All time" },
];

function filterByRange(weeklyData, range) {
  if (range === "all") return weeklyData;
  const weeksBack = { "12w": 12, "26w": 26, "1y": 52 }[range] ?? 12;
  return weeklyData.slice(-weeksBack);
}

// Total / average-per-week / best week for one runner's series key over the
// filtered rows. Averages over weeks the runner actually logged (non-null).
function summarize(rows, key) {
  const vals = rows.map((r) => r[key]).filter((v) => v != null);
  if (vals.length === 0) return { total: "—", avg: "—", best: "—" };
  const total = vals.reduce((s, v) => s + v, 0);
  return {
    total: `${total.toFixed(0)} km`,
    avg: `${(total / vals.length).toFixed(1)} km`,
    best: `${Math.max(...vals).toFixed(1)} km`,
  };
}

export default function HistoryView({ users }) {
  const [weeklyA, weeklyB] = useTwoUsers(fetchWeeklyMileage, users);
  const [range, setRange] = useState("26w");
  const compact = useCompact();

  // Union both runners' weekly series into one row per week for overlaid lines.
  const merged = useMemo(() => {
    const map = new Map();
    (weeklyA || []).forEach((w) => map.set(w.week_start, { week_start: w.week_start, a: w.distance_km, b: null }));
    (weeklyB || []).forEach((w) => {
      const e = map.get(w.week_start) || { week_start: w.week_start, a: null, b: null };
      e.b = w.distance_km;
      map.set(w.week_start, e);
    });
    return [...map.values()].sort((x, y) => (x.week_start < y.week_start ? -1 : 1));
  }, [weeklyA, weeklyB]);

  const filtered = filterByRange(merged, range);
  const sumA = summarize(filtered, "a");
  const sumB = summarize(filtered, "b");
  const rows = [
    { label: "Total distance", values: [sumA.total, sumB.total] },
    { label: "Avg / week", values: [sumA.avg, sumB.avg] },
    { label: "Best week", values: [sumA.best, sumB.best] },
  ];

  const series = [
    { dataKey: "a", color: RUNNER_COLORS[0], name: runnerName(users, 0) },
    { dataKey: "b", color: RUNNER_COLORS[1], name: runnerName(users, 1) },
  ];

  return (
    <div className="p-4 sm:p-6 short:p-3 space-y-4 short:space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="heading-display text-xl short:text-lg text-volt">Weekly mileage</h2>
        <div className="flex gap-1 bg-surface border border-line rounded-lg p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRange(opt.id)}
              className={`text-xs font-mono px-3 py-1.5 rounded ${
                range === opt.id ? "bg-volt text-ink" : "text-muted hover:text-chalk"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-lg p-4 short:p-3">
        {merged.length ? (
          <WeeklyMileageChart data={filtered} series={series} height={compact ? 210 : 280} />
        ) : (
          <p className="text-muted font-mono">Loading…</p>
        )}
      </div>

      <div className="bg-surface border border-line rounded-lg p-4 short:p-3">
        <CompareTable users={users} rows={rows} />
      </div>
    </div>
  );
}
