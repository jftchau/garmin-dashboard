import { useMemo } from "react";
import { fetchWeeklyMileage } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, LabelStat, CardTitle, Loading } from "../glass.jsx";
import { TwoLineChart } from "../chart.jsx";
import { runnerName, axisDate } from "../../utils.js";

const YEAR = new Date().getFullYear();

// Running cumulative distance for one runner's weekly series, this calendar
// year only. Returns [{ week_start, km }] where km is the year-to-date total up
// to and including that week.
function cumulative(weekly) {
  let total = 0;
  return (weekly || [])
    .filter((w) => w.week_start >= `${YEAR}-01-01`)
    .map((w) => {
      total += w.distance_km || 0;
      return { week_start: w.week_start, km: Math.round(total) };
    });
}

/**
 * Year-to-date cumulative distance, both runners on one chart — a season-long
 * "who's ahead" race. Each runner's total is the headline; the two climbing
 * lines are the evidence, and whoever's higher is winning. Derived from
 * /weekly-mileage (no new endpoint).
 */
export default function YearToDateSlide({ users }) {
  const [weeklyA, weeklyB] = useTwoUsers(fetchWeeklyMileage, users);

  const { data, totals } = useMemo(() => {
    const a = cumulative(weeklyA);
    const b = cumulative(weeklyB);
    const map = new Map();
    a.forEach((d) => map.set(d.week_start, { week_start: d.week_start, a: d.km, b: null }));
    b.forEach((d) => {
      const e = map.get(d.week_start) || { week_start: d.week_start, a: null, b: null };
      e.b = d.km;
      map.set(d.week_start, e);
    });
    const merged = [...map.values()].sort((x, y) => (x.week_start < y.week_start ? -1 : 1));
    // Carry each runner's last-known total forward so the lines don't drop to a
    // gap on a week only the other runner logged.
    let la = 0, lb = 0;
    merged.forEach((r) => {
      if (r.a == null) r.a = la; else la = r.a;
      if (r.b == null) r.b = lb; else lb = r.b;
    });
    return { data: merged, totals: [la, lb] };
  }, [weeklyA, weeklyB]);

  if (!weeklyA && !weeklyB) return <Loading what="year to date" />;

  const shown = (users || []).slice(0, 2);
  const leader = shown.length < 2 || totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1;
  const gap = Math.abs(totals[0] - totals[1]);

  return (
    <GlassSlide>
      <GlassCard>
        <div className="grid grid-cols-2 gap-8 shrink-0">
          {shown.map((u, i) => (
            <LabelStat
              key={u.id}
              dot={i}
              label={`${runnerName(users, i)} · km in ${YEAR}`}
              value={totals[i]}
              size="lg"
              stepAt={5}
              note={leader === i ? `ahead by ${gap} km` : leader == null && shown.length > 1 ? "dead heat" : " "}
              noteColor="var(--color-soft)"
            />
          ))}
        </div>
        <div className="flex-1 min-h-0 mt-6 flex flex-col gap-2">
          <CardTitle>cumulative km</CardTitle>
          <div className="flex-1 min-h-0">
            <TwoLineChart data={data} xKey="week_start" xFormat={axisDate} zero minTickGap={70} tipFormat={(v) => `${v} km`} />
          </div>
        </div>
      </GlassCard>
    </GlassSlide>
  );
}
