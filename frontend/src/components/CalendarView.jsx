import { useEffect, useState } from "react";
import { fetchCalendar } from "../api.js";
import CalendarHeatmap from "./CalendarHeatmap.jsx";

export default function CalendarView() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchCalendar(365).then(setData);
  }, []);

  const totalRunDays = data ? data.filter((d) => d.distance_km > 0).length : 0;

  return (
    <div className="p-4 sm:p-6 short:p-3 space-y-6 short:space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="heading-display text-xl short:text-lg text-volt">Run frequency</h2>
        <span className="text-muted text-sm font-mono">last 12 months</span>
      </div>

      <div className="bg-surface border border-line rounded-lg p-4 short:p-3">
        {data ? <CalendarHeatmap data={data} /> : <p className="text-muted font-mono">Loading…</p>}
      </div>

      {data && (
        <div className="flex gap-8">
          <Stat label="Days run" value={totalRunDays} />
          <Stat label="Total distance" value={`${data.reduce((s, d) => s + d.distance_km, 0).toFixed(0)} km`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="stat-mono text-2xl text-chalk">{value}</div>
      <div className="text-muted text-[11px] uppercase tracking-wide font-mono">{label}</div>
    </div>
  );
}
