import { fetchCalendar } from "../api.js";
import { useTwoUsers } from "../useTwoUsers.js";
import CalendarHeatmap from "./CalendarHeatmap.jsx";
import CalendarStats from "./CalendarStats.jsx";
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

  return (
    <div className="p-4 sm:p-6 short:p-3 space-y-4 short:space-y-2">
      <div className="flex items-baseline gap-3">
        <h2 className="heading-display text-xl short:text-lg text-volt">Run frequency</h2>
        <span className="text-muted text-sm font-mono">last 12 months</span>
      </div>

      {runners.map((u, i) => {
        const days = daysRun(data[i]);
        const km = totalKm(data[i]);
        return (
          <div key={u.id} className="bg-surface border border-line rounded-lg p-4 short:p-3">
            <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
              <div className="font-mono text-xs font-semibold" style={{ color: RUNNER_COLORS[i] }}>
                {runnerName(users, i)}
              </div>
              {data[i] && (
                <div className="font-mono text-[11px] text-muted">
                  <span style={{ color: RUNNER_COLORS[i] }}>{days ?? "—"}</span> days ·{" "}
                  <span style={{ color: RUNNER_COLORS[i] }}>
                    {km != null ? km.toFixed(0) : "—"}
                  </span>{" "}
                  km
                </div>
              )}
            </div>
            {data[i] ? (
              <>
                <CalendarHeatmap data={data[i]} rgb={RUNNER_RGB[i]} cell={8} gap={2} showHover={false} />
                <CalendarStats data={data[i]} color={RUNNER_COLORS[i]} rgb={RUNNER_RGB[i]} />
              </>
            ) : (
              <p className="text-muted text-xs font-mono">No data</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
