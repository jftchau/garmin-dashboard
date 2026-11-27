import { useMemo } from "react";
import { fetchCalendar } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, GlassStat, MiniStats, Loading } from "../glass.jsx";
import { calendarStats } from "../CalendarStats.jsx";

/**
 * Run frequency over the last 12 months, head-to-head: runs per week is the
 * number; run days, longest daily streak and busiest weekday support it.
 * (Was two per-runner slides with a 12-month heatmap; the training-log slides
 * now carry the day-by-day picture.)
 */
export default function FrequencySlide({ users }) {
  const cals = useTwoUsers((uid) => fetchCalendar(365, uid), users);
  const stats = useMemo(() => cals.map((c) => calendarStats(c)), [cals]);
  if (!cals[0] && !cals[1]) return <Loading what="run history" />;

  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const s = stats[i];
        const runDays = (cals[i] || []).filter((d) => d.distance_km > 0).length;
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            <div>
              <GlassStat value={s ? s.perWeek.toFixed(1) : "—"} />
              <div className="t-caption text-soft mt-5 whitespace-nowrap">runs a week</div>
            </div>
            <MiniStats
              items={[
                { label: "run days", value: runDays },
                { label: "best streak", value: s ? `${s.longestStreak} d` : "—" },
                { label: "busiest", value: s?.topWeekday ?? "—" },
              ]}
            />
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
