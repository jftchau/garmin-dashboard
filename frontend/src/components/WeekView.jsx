import HRZoneDoughnut from "./HRZoneDoughnut.jsx";
import WeeklyMileageChart from "./WeeklyMileageChart.jsx";
import CompareTable from "./CompareTable.jsx";
import { fetchThisWeek } from "../api.js";
import { useTwoUsers } from "../useTwoUsers.js";
import { useCompact } from "../useCompact.js";
import { formatDuration, formatPace, RUNNER_COLORS, runnerName } from "../utils.js";

// Short weekday label ("Mon") from a YYYY-MM-DD string, parsed in local time.
const dayTick = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });

const km = (v) => (v != null ? `${v} km` : "—");

export default function WeekView({ users }) {
  const [weekA, weekB] = useTwoUsers(fetchThisWeek, users);
  const compact = useCompact();
  const chartH = compact ? 150 : 210;

  if (!weekA && !weekB) {
    return <p className="text-muted font-mono p-6">Loading this week…</p>;
  }

  const range = weekA || weekB;
  const rows = [
    { label: "Distance", values: [km(weekA?.total_distance_km), km(weekB?.total_distance_km)] },
    { label: "Time", values: [fmtDur(weekA), fmtDur(weekB)] },
    { label: "Avg pace", values: [fmtPace(weekA), fmtPace(weekB)] },
    { label: "Runs", values: [weekA?.activities?.length ?? "—", weekB?.activities?.length ?? "—"] },
  ];

  // Merge both runners' daily distance into one row per day; leave upcoming days
  // empty so the grouped bars don't imply future dates already happened.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const bByDate = Object.fromEntries((weekB?.daily_distance_km || []).map((d) => [d.date, d.distance_km]));
  const daily = (range?.daily_distance_km || []).map((d) => ({
    date: d.date,
    a: d.date > todayStr ? null : (weekA ? d.distance_km : null),
    b: d.date > todayStr ? null : (weekB ? bByDate[d.date] ?? 0 : null),
  }));

  const series = [
    { dataKey: "a", color: RUNNER_COLORS[0], name: runnerName(users, 0) },
    { dataKey: "b", color: RUNNER_COLORS[1], name: runnerName(users, 1) },
  ];

  return (
    <div className="p-4 sm:p-6 short:p-3 space-y-4 short:space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 short:gap-3">
        <Panel title={`This week · ${range?.week_start} → ${range?.week_end}`}>
          <CompareTable users={users} rows={rows} big />
        </Panel>
        <Panel title="Daily mileage">
          <WeeklyMileageChart data={daily} dataKeyX="date" bar tickFormatter={dayTick} series={series} height={chartH} />
        </Panel>
      </div>

      <Panel title="Heart rate zones">
        <div className="grid grid-cols-2 gap-4 short:gap-3">
          {[weekA, weekB].map((w, i) => (
            <div key={i}>
              <div className="text-center font-mono text-xs mb-1" style={{ color: RUNNER_COLORS[i] }}>
                {runnerName(users, i)}
              </div>
              <HRZoneDoughnut zoneSeconds={w?.heart_rate_zone_seconds} height={compact ? 135 : 175} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const fmtDur = (w) => (w ? formatDuration(w.total_duration_sec) : "—");
const fmtPace = (w) => (w ? formatPace(w.avg_pace_sec_per_km) : "—");

function Panel({ title, children }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-4 short:p-3">
      <h3 className="heading-display text-sm uppercase tracking-wide text-muted mb-3 short:mb-2">{title}</h3>
      {children}
    </div>
  );
}
