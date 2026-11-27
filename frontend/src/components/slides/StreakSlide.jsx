import { useMemo } from "react";
import { fetchWeeklyMileage } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, GlassStat, Loading, glowRgba } from "../glass.jsx";
import { RUNNER_COLORS, isoDay, parseDay, mondayOf, addDays } from "../../utils.js";

const SHOWN_WEEKS = 12;

// Weekly streak, Strava's definition: consecutive Monday–Sunday weeks with at
// least one run. The current week doesn't break a streak until it's over, so
// a streak still counts from last week while this week is run-free.
export function weekStreak(weekly, today = new Date()) {
  const ran = new Set(
    (weekly || []).filter((w) => (w.distance_km || 0) > 0).map((w) => isoDay(mondayOf(parseDay(w.week_start))))
  );
  const thisMonday = mondayOf(today);
  const thisWeek = ran.has(isoDay(thisMonday));

  let current = 0;
  for (let m = thisWeek ? thisMonday : addDays(thisMonday, -7); ran.has(isoDay(m)); m = addDays(m, -7)) current++;

  let longest = 0;
  let run = 0;
  let prev = null;
  [...ran].sort().forEach((iso) => {
    const m = parseDay(iso);
    run = prev && isoDay(addDays(prev, 7)) === iso ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = m;
  });

  // The last SHOWN_WEEKS weeks, oldest first, ending with this one.
  const weeks = Array.from({ length: SHOWN_WEEKS }, (_, k) => {
    const m = addDays(thisMonday, -7 * (SHOWN_WEEKS - 1 - k));
    return { iso: isoDay(m), ran: ran.has(isoDay(m)), now: k === SHOWN_WEEKS - 1 };
  });

  return { current, longest, thisWeek, weeks };
}

// One dot per week: a week with a run is a filled (unlit) dot, an empty week a
// faint ring, and this week — once it has a run — the one lit dot.
function WeekDots({ weeks, i }) {
  return (
    <div className="flex items-center justify-between">
      {weeks.map((w) => {
        const lit = w.now && w.ran;
        return (
          <span
            key={w.iso}
            className="w-[24px] h-[24px] rounded-full box-border"
            style={
              lit
                ? { background: RUNNER_COLORS[i], boxShadow: `0 0 22px ${glowRgba(i)}` }
                : w.ran
                  ? { background: "rgb(255 255 255 / 0.30)" }
                  : { border: "3px solid rgb(255 255 255 / 0.16)" }
            }
          />
        );
      })}
    </div>
  );
}

/**
 * Streak, head-to-head: weeks in a row with a run, at hero size. The point of
 * a wall display: you see the number, and you go for a run to keep it.
 */
export default function StreakSlide({ users }) {
  const [wA, wB] = useTwoUsers(fetchWeeklyMileage, users);
  const streaks = useMemo(() => [weekStreak(wA), weekStreak(wB)], [wA, wB]);
  if (!wA && !wB) return <Loading what="streaks" />;

  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const s = streaks[i];
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            <div>
              <GlassStat value={s.current} unit={s.current === 1 ? "week" : "weeks"} size="hero" stepAt={3} />
              <div className="t-caption text-soft mt-5 whitespace-nowrap">
                {s.current === 0 ? "run this week to start" : s.thisWeek ? "this week ✓" : "run this week to keep it"}
              </div>
            </div>
            <div>
              <WeekDots weeks={s.weeks} i={i} />
              <div className="flex justify-between t-meta text-muted mt-3 whitespace-nowrap">
                <span>last {SHOWN_WEEKS} weeks</span>
                <span>longest {s.longest}</span>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
