import { fetchThisWeek } from "../../api.js";
import { useOneUser } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, GlassStat, MiniStats, Loading } from "../glass.jsx";
import WeekVolumeChart from "../WeekVolumeChart.jsx";
import { RUNNER_COLORS, signed } from "../../utils.js";

// Total cross-training hours logged this week, across both buckets.
function crossHours(week) {
  const days = week?.daily_cross_training_min || [];
  const mins = days.reduce((s, d) => s + (d.strength_min || 0) + (d.other_min || 0), 0);
  return mins / 60;
}

/**
 * One runner's training week. Split per runner (rather than head-to-head)
 * because the chart carries four things at once — run km, last week's km,
 * strength hours and other hours — and doubling that would make it unreadable
 * from across the room.
 *
 * Tier B: the week's km is the headline; the chart is the evidence beneath.
 */
export default function WeekVolumeSlide({ users, runner = 0 }) {
  const week = useOneUser(fetchThisWeek, users, runner);
  if (!week) return <Loading what="this week" />;

  const total = week.total_distance_km ?? 0;
  const last = week.prev_total_distance_km;
  const diff = last != null ? +(total - last).toFixed(1) : null;
  const hours = crossHours(week);

  return (
    <GlassSlide>
      <GlassCard runner={runner}>
        <div className="flex items-start justify-between gap-8 shrink-0">
          <div>
            <GlassStat value={total} unit="km" size="lg" />
            <div className="t-caption text-soft mt-4 whitespace-nowrap">
              {diff == null ? "run this week" : `${signed(diff)} vs last week`}
            </div>
          </div>
          <div className="w-[400px] pt-2">
            <MiniStats
              items={[
                { label: "last week km", value: last ?? "—" },
                { label: "cross-training h", value: hours.toFixed(1) },
              ]}
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 mt-6">
          <WeekVolumeChart week={week} color={RUNNER_COLORS[runner]} />
        </div>
      </GlassCard>
    </GlassSlide>
  );
}
