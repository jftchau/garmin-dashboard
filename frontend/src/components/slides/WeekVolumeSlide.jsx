import { fetchThisWeek } from "../../api.js";
import { useOneUser } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, Panel } from "../Slide.jsx";
import WeekVolumeChart from "../WeekVolumeChart.jsx";
import { RUNNER_COLORS } from "../../utils.js";

// Total cross-training hours logged this week, across both buckets.
function crossHours(week) {
  const days = week?.daily_cross_training_min || [];
  const mins = days.reduce((s, d) => s + (d.strength_min || 0) + (d.other_min || 0), 0);
  return mins / 60;
}

/**
 * One runner's training week. Split per runner (rather than head-to-head like
 * most slides) because this chart carries four things at once — run km, last
 * week's run km, strength hours and other-training hours — and doubling that
 * would make it unreadable from across the room.
 */
export default function WeekVolumeSlide({ users, runner = 0 }) {
  const week = useOneUser(fetchThisWeek, users, runner);

  if (!week) return <Loading what="this week" />;

  const color = RUNNER_COLORS[runner];
  const hours = crossHours(week);
  const diff = +(week.total_distance_km - (week.prev_total_distance_km ?? 0)).toFixed(1);

  return (
    <Slide className="space-y-3 short:space-y-2">
      <div className="grid grid-cols-4 gap-4 short:gap-3">
        <BigStat label="Run this week" value={week.total_distance_km} unit="km" color={color} size="lg" />
        <BigStat label="Last week" value={week.prev_total_distance_km ?? "—"} unit="km" color="var(--color-muted)" size="lg" />
        <BigStat
          label="Change"
          value={`${diff >= 0 ? "+" : ""}${diff}`}
          unit="km"
          color={diff >= 0 ? "var(--color-zone2)" : "var(--color-zone4)"}
          size="lg"
        />
        <BigStat
          label="Cross-training"
          value={hours ? hours.toFixed(1) : "0"}
          unit="h"
          color="var(--color-zone4)"
          size="lg"
        />
      </div>

      <Panel grow>
        <WeekVolumeChart week={week} color={color} />
      </Panel>
    </Slide>
  );
}
