import { useEffect, useMemo, useState } from "react";
import { fetchActivities, fetchWeeklyMileage } from "../api.js";
import WeeklyMileageChart from "./WeeklyMileageChart.jsx";
import ActivityTable from "./ActivityTable.jsx";
import { useCompact } from "../useCompact.js";

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

export default function HistoryView({ onSelectActivity }) {
  const [weekly, setWeekly] = useState(null);
  const [activities, setActivities] = useState(null);
  const [range, setRange] = useState("26w");
  const compact = useCompact();

  useEffect(() => {
    fetchWeeklyMileage().then(setWeekly);
    fetchActivities(200, 0).then((res) => setActivities(res.activities));
  }, []);

  const filteredWeekly = useMemo(() => (weekly ? filterByRange(weekly, range) : []), [weekly, range]);

  return (
    <div className="p-4 sm:p-6 short:p-3 space-y-6 short:space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="heading-display text-xl short:text-lg text-volt">History</h2>
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
        <h3 className="heading-display text-sm uppercase tracking-wide text-muted mb-3 short:mb-2">Weekly mileage</h3>
        {weekly ? (
          <WeeklyMileageChart data={filteredWeekly} height={compact ? 190 : 260} />
        ) : (
          <p className="text-muted font-mono">Loading…</p>
        )}
      </div>

      <div className="bg-surface border border-line rounded-lg p-4 short:p-3">
        <h3 className="heading-display text-sm uppercase tracking-wide text-muted mb-3 short:mb-2">Activity log</h3>
        {activities ? (
          <ActivityTable activities={activities} onSelect={onSelectActivity} />
        ) : (
          <p className="text-muted font-mono">Loading…</p>
        )}
      </div>
    </div>
  );
}
