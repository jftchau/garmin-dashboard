import { useMemo } from "react";
import { fetchWeeklyMileage } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, GlassStat, MiniStats, LabelStat, CardTitle, Loading } from "../glass.jsx";
import { TwoLineChart } from "../chart.jsx";
import { runnerName, axisDate } from "../../utils.js";

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

// Tier B: each runner's latest week is the headline, measured against their
// best week in the window; the 26-week lines are the evidence.
export function MileageTrendSlide({ users }) {
  const [merged] = useMerged(users);
  if (!merged.length) return <Loading what="weekly mileage" />;

  const rows = merged.slice(-WEEKS);
  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide>
      <GlassCard>
        <div className="grid grid-cols-2 gap-8 shrink-0">
          {shown.map((u, i) => {
            const key = i === 0 ? "a" : "b";
            const vals = rows.map((r) => r[key]).filter((v) => v != null);
            const latest = vals.length ? vals[vals.length - 1] : null;
            const best = vals.length ? Math.max(...vals) : null;
            return (
              <LabelStat
                key={u.id}
                dot={i}
                label={`${runnerName(users, i)} · this week, km`}
                value={latest != null ? latest.toFixed(1) : "—"}
                note={best != null ? `best ${best.toFixed(1)} in ${WEEKS} weeks` : " "}
              />
            );
          })}
        </div>
        <div className="flex-1 min-h-0 mt-6 flex flex-col gap-2">
          <CardTitle>km per week</CardTitle>
          <div className="flex-1 min-h-0">
            <TwoLineChart data={rows} xKey="week_start" xFormat={axisDate} zero tipFormat={(v) => `${v} km`} />
          </div>
        </div>
      </GlassCard>
    </GlassSlide>
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
  const shown = (users || []).slice(0, 2);

  // Head-to-head, v2 glass: the three-month total is the number; average and
  // best week support it in the walk-closer tier.
  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const s = summarize(rows, i === 0 ? "a" : "b");
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            <div>
              <GlassStat value={s.total} unit="km" />
              <div className="t-caption text-soft mt-5 whitespace-nowrap">
                {rows.length} weeks from {axisDate(from)}
              </div>
            </div>
            <MiniStats
              items={[
                { label: "km / week", value: s.avg },
                { label: "best week", value: s.best },
              ]}
            />
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
