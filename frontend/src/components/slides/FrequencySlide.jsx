import { fetchCalendar } from "../../api.js";
import { useOneUser } from "../../useTwoUsers.js";
import { useCompact } from "../../useCompact.js";
import Slide, { BigStat, Loading, RunnerTag } from "../Slide.jsx";
import CalendarHeatmap from "../CalendarHeatmap.jsx";
import CalendarStats from "../CalendarStats.jsx";
import { RUNNER_COLORS, RUNNER_RGB } from "../../utils.js";

/**
 * One runner's 12-month run-frequency heatmap.
 *
 * Previously both runners shared this slide with 8px cells, which was
 * unreadable from across the room. One runner per slide buys roughly double the
 * cell size for the same vertical budget.
 */
export default function FrequencySlide({ users, runner = 0 }) {
  const data = useOneUser((uid) => fetchCalendar(365, uid), users, runner);
  const compact = useCompact();

  if (!data) return <Loading what="run history" />;

  const color = RUNNER_COLORS[runner];
  const runDays = data.filter((d) => d.distance_km > 0).length;
  const totalKm = data.reduce((s, d) => s + d.distance_km, 0);
  const crossDays = data.filter((d) => d.cross_train).length;

  return (
    <Slide className="space-y-3 short:space-y-2">
      <div className="flex items-baseline gap-4">
        <RunnerTag users={users} i={runner} size="lg" />
        <span className="font-mono text-xs uppercase tracking-widest text-muted">
          last 12 months
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 short:gap-3">
        <BigStat label="Run days" value={runDays} color={color} size="lg" />
        <BigStat label="Distance" value={totalKm.toFixed(0)} unit="km" color={color} size="lg" />
        <BigStat label="Cross-training days" value={crossDays} color="var(--color-zone4)" size="lg" />
      </div>

      <div className="bg-surface border border-line rounded-xl p-4 short:p-3 flex-1 min-h-0 flex flex-col justify-center">
        <CalendarHeatmap
          data={data}
          rgb={RUNNER_RGB[runner]}
          cell={compact ? 13 : 15}
          gap={3}
          showHover={false}
        />
        <CalendarStats data={data} color={color} rgb={RUNNER_RGB[runner]} />
      </div>
    </Slide>
  );
}
