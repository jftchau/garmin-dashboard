import { useMemo } from "react";
import { fetchWeeklyMileage } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, Panel, RunnerTag } from "../Slide.jsx";
import WeeklyMileageChart from "../WeeklyMileageChart.jsx";
import { RUNNER_COLORS, runnerName, axisDate } from "../../utils.js";

const WEEKS = 26; // trend slide: half a year of weekly points reads as a shape

// Summary slide window. 26 weeks of totals is an oddly arbitrary block of time
// to sum ("we ran 412 km ... since when?"); three months is a period people
// actually think in, so the summary is cut to the weeks that started within it.
const SUMMARY_MONTHS = 3;

function summaryCutoff() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - SUMMARY_MONTHS);
  return d.toISOString().slice(0, 10);
}

// Union both runners' weekly series into one row per week for overlaid lines.
function useMerged(users) {
  const [weeklyA, weeklyB] = useTwoUsers(fetchWeeklyMileage, users);
  const merged = useMemo(() => {
    const map = new Map();
    (weeklyA || []).forEach((w) =>
      map.set(w.week_start, { week_start: w.week_start, a: w.distance_km, b: null })
    );
    (weeklyB || []).forEach((w) => {
      const e = map.get(w.week_start) || { week_start: w.week_start, a: null, b: null };
      e.b = w.distance_km;
      map.set(w.week_start, e);
    });
    return [...map.values()].sort((x, y) => (x.week_start < y.week_start ? -1 : 1));
  }, [weeklyA, weeklyB]);
  return [merged, weeklyA, weeklyB];
}

const series = (users) => [
  { dataKey: "a", color: RUNNER_COLORS[0], name: runnerName(users, 0) },
  { dataKey: "b", color: RUNNER_COLORS[1], name: runnerName(users, 1) },
];

export function MileageTrendSlide({ users }) {
  const [merged] = useMerged(users);

  if (!merged.length) return <Loading what="weekly mileage" />;

  return (
    <Slide>
      <Panel grow title={`Kilometres per week · last ${WEEKS} weeks`}>
        <WeeklyMileageChart data={merged.slice(-WEEKS)} series={series(users)} height="100%" tickFormatter={axisDate} />
      </Panel>
    </Slide>
  );
}

// Total / average / best week over the visible window, per runner. Averages
// over weeks the runner actually logged, so a missing runner doesn't drag the
// other's average down.
function summarize(rows, key) {
  const vals = rows.map((r) => r[key]).filter((v) => v != null);
  if (!vals.length) return { total: "—", avg: "—", best: "—" };
  const total = vals.reduce((s, v) => s + v, 0);
  return {
    total: total.toFixed(0),
    avg: (total / vals.length).toFixed(1),
    best: Math.max(...vals).toFixed(1),
  };
}

export function MileageSummarySlide({ users }) {
  const [merged] = useMerged(users);
  if (!merged.length) return <Loading what="weekly mileage" />;

  const cutoff = summaryCutoff();
  const rows = merged.filter((r) => r.week_start >= cutoff);
  const from = rows.length ? rows[0].week_start : cutoff;

  return (
    <Slide className="space-y-3 short:space-y-2">
      <p className="font-mono text-lg short:text-base uppercase tracking-widest text-muted shrink-0">
        Last 3 months · {rows.length} weeks from {axisDate(from)}
      </p>
      {(users || []).slice(0, 2).map((u, i) => {
        const s = summarize(rows, i === 0 ? "a" : "b");
        const color = RUNNER_COLORS[i];
        return (
          <div key={u.id} className="bg-surface border border-line rounded-xl p-5 short:p-3 flex-1 min-h-0 flex flex-col justify-center">
            <div className="mb-3 short:mb-2">
              <RunnerTag users={users} i={i} size="xl" />
            </div>
            <div className="grid grid-cols-3 gap-4 short:gap-3">
              <BigStat label="Total" value={s.total} unit="km" color={color} size="hero" />
              <BigStat label="Avg / week" value={s.avg} unit="km" color={color} size="hero" />
              <BigStat label="Best week" value={s.best} unit="km" color={color} size="hero" />
            </div>
          </div>
        );
      })}
    </Slide>
  );
}
