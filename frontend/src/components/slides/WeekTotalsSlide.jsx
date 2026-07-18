import { fetchThisWeek } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, RunnerTag } from "../Slide.jsx";
import { formatDuration, formatPace, RUNNER_COLORS } from "../../utils.js";

// Signed week-over-week change in running volume, e.g. "+4.2 km vs last week".
function Delta({ week }) {
  if (!week || week.prev_total_distance_km == null) return null;
  const diff = +(week.total_distance_km - week.prev_total_distance_km).toFixed(1);
  const color = diff >= 0 ? "var(--color-zone2)" : "var(--color-zone4)";
  return (
    <div className="font-mono text-sm short:text-xs text-muted mt-1">
      <span style={{ color }}>
        {diff >= 0 ? "+" : ""}
        {diff} km
      </span>{" "}
      vs last week ({week.prev_total_distance_km} km)
    </div>
  );
}

export default function WeekTotalsSlide({ users }) {
  const weeks = useTwoUsers(fetchThisWeek, users);
  if (!weeks[0] && !weeks[1]) return <Loading what="this week" />;

  const range = weeks[0] || weeks[1];

  return (
    <Slide className="space-y-3 short:space-y-2">
      <p className="font-mono text-sm short:text-xs text-muted">
        {range?.week_start} → {range?.week_end}
      </p>

      {(users || []).slice(0, 2).map((u, i) => {
        const w = weeks[i];
        const color = RUNNER_COLORS[i];
        return (
          <div key={u.id} className="bg-surface border border-line rounded-xl p-5 short:p-3 flex-1 min-h-0 flex flex-col justify-center">
            <div className="flex items-baseline justify-between gap-3 mb-3 short:mb-2">
              <RunnerTag users={users} i={i} size="lg" />
              <Delta week={w} />
            </div>
            <div className="grid grid-cols-4 gap-4 short:gap-3">
              <BigStat label="Distance" value={w?.total_distance_km ?? "—"} unit="km" color={color} />
              <BigStat label="Time" value={w ? formatDuration(w.total_duration_sec) : "—"} color={color} size="lg" />
              <BigStat
                label="Avg pace"
                value={w?.avg_pace_sec_per_km ? formatPace(w.avg_pace_sec_per_km).replace(" /km", "") : "—"}
                unit="/km"
                color={color}
                size="lg"
              />
              <BigStat label="Runs" value={w?.activities?.length ?? "—"} color={color} />
            </div>
          </div>
        );
      })}
    </Slide>
  );
}
