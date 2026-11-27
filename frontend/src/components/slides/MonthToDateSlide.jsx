import { fetchCalendar } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, GlassStat, MiniStats, Loading } from "../glass.jsx";
import { isoDay, monthName, signed } from "../../utils.js";

// Enough days back to reach the 1st of last month from any day of this one.
const DAYS = 70;

// This month so far, and last month up to the same day of the month (capped
// at its length), from the /calendar run-day list.
export function monthToDate(days, today = new Date()) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const dom = today.getDate();
  const startThis = isoDay(new Date(y, m, 1));
  const startPrev = isoDay(new Date(y, m - 1, 1));
  const lastOfPrev = new Date(y, m, 0).getDate();
  const endPrev = isoDay(new Date(y, m - 1, Math.min(dom, lastOfPrev)));

  const runs = (days || []).filter((d) => d.distance_km > 0);
  const now = runs.filter((d) => d.date >= startThis);
  const prev = runs.filter((d) => d.date >= startPrev && d.date <= endPrev);
  const sum = (arr) => arr.reduce((s, d) => s + d.distance_km, 0);
  return {
    km: sum(now),
    prevKm: sum(prev),
    runs: now.length,
    longest: now.length ? Math.max(...now.map((d) => d.distance_km)) : null,
  };
}

/**
 * Month to date, head-to-head: this month's km so far, against last month by
 * the same day. Tier A, between the week and the year.
 */
export default function MonthToDateSlide({ users }) {
  const cals = useTwoUsers((uid) => fetchCalendar(DAYS, uid), users);
  if (!cals[0] && !cals[1]) return <Loading what="this month" />;

  const shown = (users || []).slice(0, 2);
  const today = new Date();
  const prevName = monthName(new Date(today.getFullYear(), today.getMonth() - 1, 1), "short");

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const s = monthToDate(cals[i], today);
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            <div>
              <GlassStat value={s.km.toFixed(1)} unit="km" />
              <div className="t-caption text-soft mt-5 whitespace-nowrap">
                {signed(Math.round(s.km - s.prevKm))} vs {prevName} so far
              </div>
            </div>
            <MiniStats
              items={[
                { label: "runs", value: s.runs },
                { label: "longest km", value: s.longest != null ? s.longest.toFixed(1) : "—" },
              ]}
            />
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
