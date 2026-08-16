import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchWeeklyMileage } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, Panel } from "../Slide.jsx";
import { RUNNER_COLORS, runnerName, axisDate } from "../../utils.js";

const axisTick = { fill: "var(--color-muted)", fontSize: 17, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 14,
};

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
 * "who's ahead" race. Reads well from across the room: two lines climbing, and
 * whoever's higher is winning. Derived from /weekly-mileage (no new endpoint).
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

  const leader = totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1;
  const gap = Math.abs(totals[0] - totals[1]);

  const series = [
    { key: "a", color: RUNNER_COLORS[0] },
    { key: "b", color: RUNNER_COLORS[1] },
  ];

  return (
    <Slide className="space-y-3 short:space-y-2">
      <div className="grid grid-cols-3 gap-4 short:gap-3 shrink-0">
        <BigStat label={`${runnerName(users, 0)} · ${YEAR}`} value={totals[0]} unit="km" color={RUNNER_COLORS[0]} />
        <BigStat label={`${runnerName(users, 1)} · ${YEAR}`} value={totals[1]} unit="km" color={RUNNER_COLORS[1]} />
        <BigStat
          label={leader == null ? "Dead heat" : "Leader"}
          value={leader == null ? "—" : runnerName(users, leader)}
          unit={leader == null ? "" : `+${gap} km`}
          color={leader == null ? "var(--color-muted)" : RUNNER_COLORS[leader]}
          size="md"
        />
      </div>

      <Panel grow title={`Cumulative distance · ${YEAR}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 32, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
            <XAxis dataKey="week_start" tick={axisTick} tickFormatter={axisDate} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} minTickGap={44} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} labelFormatter={axisDate} formatter={(v, n) => [`${v} km`, n === "a" ? runnerName(users, 0) : runnerName(users, 1)]} />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={3.5} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </Slide>
  );
}
