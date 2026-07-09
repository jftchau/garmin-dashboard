import { useEffect, useState } from "react";
import { fetchThisWeek } from "../api.js";
import HRZoneDoughnut from "./HRZoneDoughnut.jsx";
import WeeklyMileageChart from "./WeeklyMileageChart.jsx";
import ActivityTable from "./ActivityTable.jsx";
import { formatDuration, formatPace } from "../utils.js";
import { useCompact } from "../useCompact.js";

// Short weekday label ("Mon") from a YYYY-MM-DD string, parsed in local time.
const dayTick = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });

export default function WeekView({ onSelectActivity }) {
  const [week, setWeek] = useState(null);
  const compact = useCompact();
  const chartH = compact ? 165 : 220;

  useEffect(() => {
    fetchThisWeek().then(setWeek);
  }, []);

  if (!week) {
    return <p className="text-muted font-mono p-6">Loading this week…</p>;
  }

  // Only show bars for days that have actually happened — leave upcoming days
  // (after today) empty so the chart doesn't imply future dates already passed.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const dailyData = (week.daily_distance_km || []).map((d) => ({
    ...d,
    distance_km: d.date > todayStr ? null : d.distance_km,
  }));

  return (
    <div className="p-4 sm:p-6 short:p-3 space-y-6 short:space-y-3">
      {/* GPS-watch-style readout: the week's headline number, large and mono */}
      <div className="flex flex-wrap items-end gap-x-10 short:gap-x-6 gap-y-2">
        <div>
          <div className="stat-mono text-5xl sm:text-6xl short:text-4xl text-volt">
            {week.total_distance_km}
            <span className="text-xl text-muted ml-2">km</span>
          </div>
          <div className="text-muted text-xs uppercase tracking-wide mt-1 font-mono">
            {week.week_start} → {week.week_end}
          </div>
        </div>
        <Stat label="Time" value={formatDuration(week.total_duration_sec)} />
        <Stat label="Avg pace" value={formatPace(week.avg_pace_sec_per_km)} />
        <Stat label="Runs" value={week.activities.length} />
      </div>

      <div className="lane-rule" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 short:gap-3">
        <Panel title="Daily mileage">
          <WeeklyMileageChart data={dailyData} dataKeyX="date" dataKeyY="distance_km" bar tickFormatter={dayTick} height={chartH} />
        </Panel>
        <Panel title="Heart rate zones">
          <HRZoneDoughnut zoneSeconds={week.heart_rate_zone_seconds} height={chartH} />
        </Panel>
      </div>

      <Panel title="This week's runs">
        <ActivityTable activities={week.activities} onSelect={onSelectActivity} />
      </Panel>
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

function Panel({ title, children }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-4 short:p-3">
      <h3 className="heading-display text-sm uppercase tracking-wide text-muted mb-3 short:mb-2">{title}</h3>
      {children}
    </div>
  );
}
