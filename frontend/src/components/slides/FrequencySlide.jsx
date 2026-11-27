import { useMemo } from "react";
import { fetchCalendar } from "../../api.js";
import { useOneUser } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, GlassStat, MiniStats, Loading } from "../glass.jsx";
import CalendarHeatmap from "../CalendarHeatmap.jsx";
import { calendarStats } from "../CalendarStats.jsx";
import { RUNNER_RGB } from "../../utils.js";

/**
 * One runner's 12-month run frequency. Runs per week is the headline; the
 * year of day-cells is the evidence, sized to fill the card.
 */
export default function FrequencySlide({ users, runner = 0 }) {
  const data = useOneUser((uid) => fetchCalendar(365, uid), users, runner);
  const stats = useMemo(() => calendarStats(data), [data]);

  if (!data) return <Loading what="run history" />;

  const runDays = data.filter((d) => d.distance_km > 0).length;
  const totalKm = data.reduce((s, d) => s + d.distance_km, 0);

  return (
    <GlassSlide>
      <GlassCard runner={runner}>
        <div className="flex items-start justify-between gap-8 shrink-0">
          <div>
            <GlassStat value={stats ? stats.perWeek.toFixed(1) : "—"} unit="runs / week" size="lg" />
            <div className="t-caption text-soft mt-4 whitespace-nowrap">over the last 12 months</div>
          </div>
          <div className="w-[420px] pt-2">
            <MiniStats
              items={[
                { label: "run days", value: runDays },
                { label: "km", value: totalKm.toFixed(0) },
                { label: "busiest day", value: stats?.topWeekday ?? "—" },
              ]}
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 mt-6">
          <CalendarHeatmap data={data} rgb={RUNNER_RGB[runner]} cell="auto" gap={3} showHover={false} />
        </div>
      </GlassCard>
    </GlassSlide>
  );
}
