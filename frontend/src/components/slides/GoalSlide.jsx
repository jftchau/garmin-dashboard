import { fetchThisWeek } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, GlassStat, Loading, glowRgba } from "../glass.jsx";
import { RUNNER_COLORS } from "../../utils.js";

// Days of the week still to come after today (Mon–Sun weeks).
function daysLeft() {
  const idx = (new Date().getDay() + 6) % 7; // 0 = Monday
  return 6 - idx;
}

// The lit mark and its unlit track. Past 100% the fill stops at the end of
// the track; the number above says by how much.
function GoalBar({ pct, i }) {
  return (
    <div className="h-5 rounded-full bg-unlit overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          background: RUNNER_COLORS[i],
          boxShadow: `0 0 22px ${glowRgba(i)}`,
        }}
      />
    </div>
  );
}

/**
 * Weekly goal, head-to-head. The percentage is the number (hero); the bar
 * shows it, and "32 of 50 km" is the walk-closer detail. Goals live on the
 * users table (goal_distance_km, set with PATCH /api/users/<id>); the slide is
 * hidden until at least one runner has one (`requires` in slides.jsx).
 */
export default function GoalSlide({ users }) {
  const weeks = useTwoUsers(fetchThisWeek, users);
  if (!weeks[0] && !weeks[1]) return <Loading what="this week" />;

  const shown = (users || []).slice(0, 2);
  const left = daysLeft();

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const goal = u.goal_distance_km;
        const km = weeks[i]?.total_distance_km ?? 0;
        const pct = goal ? Math.round((km / goal) * 100) : null;
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            {goal ? (
              <>
                <GlassStat value={pct} unit="%" size="hero" stepAt={4} />
                <div>
                  <GoalBar pct={pct} i={i} />
                  <div className="flex items-baseline justify-between gap-4 mt-4 whitespace-nowrap">
                    <span className="t-caption text-soft">
                      {/* Whole km: the percentage carries the precision, and
                          "52.3 of 50 km" plus "3 days left" overflows the card. */}
                      {Math.round(km)} of {Math.round(goal)} km
                    </span>
                    <span className="t-meta text-muted">
                      {pct >= 100 ? "met ✓" : left === 0 ? "last day" : `${left} day${left > 1 ? "s" : ""} left`}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="t-caption text-muted">No weekly goal set</p>
            )}
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
