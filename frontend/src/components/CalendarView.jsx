import { fetchCalendar } from "../api.js";
import { useTwoUsers } from "../useTwoUsers.js";
import CalendarHeatmap from "./CalendarHeatmap.jsx";
import CompareTable from "./CompareTable.jsx";
import { RUNNER_COLORS, RUNNER_RGB, runnerName } from "../utils.js";

const daysRun = (data) => (data ? data.filter((d) => d.distance_km > 0).length : null);
const totalKm = (data) => (data ? data.reduce((s, d) => s + d.distance_km, 0) : null);

export default function CalendarView({ users }) {
  const [dataA, dataB] = useTwoUsers((uid) => fetchCalendar(365, uid), users);

  if (!dataA && !dataB) {
    return <p className="text-muted font-mono p-6">Loading…</p>;
  }

  const runners = (users || []).slice(0, 2);
  const data = [dataA, dataB];

  const rows = [
    {
      label: "Days run",
      values: [daysRun(dataA) ?? "—", daysRun(dataB) ?? "—"],
    },
    {
      label: "Total distance",
      values: [
        totalKm(dataA) != null ? `${totalKm(dataA).toFixed(0)} km` : "—",
        totalKm(dataB) != null ? `${totalKm(dataB).toFixed(0)} km` : "—",
      ],
    },
  ];

  return (
    <div className="p-4 sm:p-6 short:p-3 space-y-4 short:space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="heading-display text-xl short:text-lg text-volt">Run frequency</h2>
        <span className="text-muted text-sm font-mono">last 12 months</span>
      </div>

      {runners.map((u, i) => (
        <div key={u.id} className="bg-surface border border-line rounded-lg p-4 short:p-3">
          <div className="font-mono text-xs font-semibold mb-2" style={{ color: RUNNER_COLORS[i] }}>
            {runnerName(users, i)}
          </div>
          {data[i] ? (
            <CalendarHeatmap data={data[i]} rgb={RUNNER_RGB[i]} cell={9} gap={2} showHover={false} />
          ) : (
            <p className="text-muted text-xs font-mono">No data</p>
          )}
        </div>
      ))}

      <div className="bg-surface border border-line rounded-lg p-4 short:p-3">
        <CompareTable users={users} rows={rows} />
      </div>
    </div>
  );
}
