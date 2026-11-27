import { fetchVo2maxTrend, fetchWellnessTrend, fetchCurrentStatus } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, LabelStat, CardTitle, Empty, Loading } from "../glass.jsx";
import { TwoLineChart } from "../chart.jsx";
import { axisDate, runnerName } from "../../utils.js";

// Window for the two trend slides. 90 days squeezed a quarter of a year into
// the card, so day-to-day movement turned into noise; a month of points is
// what this display can actually resolve.
const TREND_DAYS = 30;

const sinceCutoff = () => {
  const d = new Date();
  d.setDate(d.getDate() - TREND_DAYS);
  return d.toISOString().slice(0, 10);
};

// Union two runners' time series into one row per date: { date, a, b }.
function mergeByDate(arrA, arrB, key, map = (v) => v) {
  const m = new Map();
  (arrA || []).forEach((d) => d[key] != null && m.set(d.date, { date: d.date, a: map(d[key]), b: null }));
  (arrB || []).forEach((d) => {
    if (d[key] == null) return;
    const e = m.get(d.date) || { date: d.date, a: null, b: null };
    e.b = map(d[key]);
    m.set(d.date, e);
  });
  return [...m.values()].sort((x, y) => (x.date < y.date ? -1 : 1));
}

const latestOf = (rows, key) => {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i][key] != null) return rows[i][key];
  return null;
};

const round = (v) => (v != null ? Math.round(v) : null);

// One metric: each runner's latest value as the headline (their dot doubles as
// the chart's legend), the 30-day lines beneath as evidence.
function TrendCard({ users, title, note, data, pad, fmt, digits = 0 }) {
  const shown = (users || []).slice(0, 2);
  return (
    <GlassCard>
      <CardTitle right={note}>{title}</CardTitle>
      <div className="grid grid-cols-2 gap-6 mt-5 shrink-0">
        {shown.map((u, i) => {
          const v = latestOf(data, i === 0 ? "a" : "b");
          return <LabelStat key={u.id} dot={i} label={runnerName(users, i)} value={v != null ? v.toFixed(digits) : "—"} />;
        })}
      </div>
      <div className="flex-1 min-h-0 mt-5">
        {data.length ? (
          <TwoLineChart data={data} xKey="date" xFormat={axisDate} yPad={pad} minTickGap={70} tipFormat={fmt} />
        ) : (
          <Empty />
        )}
      </div>
    </GlassCard>
  );
}

// Two metrics side by side, each on its own neutral card.
function TrendPairSlide({ users, cards }) {
  return (
    <GlassSlide cols={2}>
      {cards.map((c) => (
        <TrendCard key={c.title} users={users} {...c} />
      ))}
    </GlassSlide>
  );
}

export function HeartTrendsSlide({ users }) {
  const [wellA, wellB] = useTwoUsers((uid) => fetchWellnessTrend(TREND_DAYS, uid), users);
  if (!wellA && !wellB) return <Loading what="wellness" />;

  return (
    <TrendPairSlide
      users={users}
      cards={[
        {
          title: "Resting HR · bpm",
          data: mergeByDate(wellA, wellB, "resting_hr"),
          pad: 2,
          fmt: (v) => `${v} bpm`,
        },
        {
          title: "HRV · ms",
          note: "weekly avg",
          data: mergeByDate(wellA, wellB, "hrv_weekly_avg"),
          pad: 4,
          fmt: (v) => `${v} ms`,
        },
      ]}
    />
  );
}

export function FitnessTrendsSlide({ users }) {
  const [vo2A, vo2B] = useTwoUsers(fetchVo2maxTrend, users);
  const [wellA, wellB] = useTwoUsers((uid) => fetchWellnessTrend(TREND_DAYS, uid), users);
  if (!vo2A && !vo2B && !wellA && !wellB) return <Loading what="fitness" />;

  // /vo2max-trend has no window parameter — it returns the whole per-run
  // series, so the 30-day cut happens here.
  const cutoff = sinceCutoff();
  const recent = (trend) => (trend || []).filter((d) => d.date >= cutoff);

  return (
    <TrendPairSlide
      users={users}
      cards={[
        {
          title: "VO₂max",
          note: "per-run estimate",
          data: mergeByDate(recent(vo2A?.trend), recent(vo2B?.trend), "vo2max"),
          pad: 1,
          // Whole numbers, as the watch shows it ("48.2" also overflows a
          // half-card cell at stat-md).
          fmt: (v) => v,
        },
        {
          title: "Sleep · hours",
          note: "per night",
          data: mergeByDate(wellA, wellB, "sleep_seconds", (s) => +(s / 3600).toFixed(1)),
          pad: 1,
          digits: 1,
          fmt: (v) => `${v} h`,
        },
      ]}
    />
  );
}

/**
 * Today's readiness, head-to-head: four numbers per runner in a 2x2 grid.
 * Two digits fit stat-lg in a half-width cell; a three-digit value (HRV can
 * pass 100) steps down to stat-md rather than overflow.
 */
export function StatusSlide({ users }) {
  const [statA, statB] = useTwoUsers(fetchCurrentStatus, users);
  const [vo2A, vo2B] = useTwoUsers(fetchVo2maxTrend, users);

  if (!statA && !statB) return <Loading what="current status" />;

  const stats = [statA, statB];
  const vo2 = [vo2A, vo2B];
  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const s = stats[i];
        const cell = (label, value) => <LabelStat label={label} value={value} size="lg" stepAt={3} />;
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-7">
              {cell("Resting HR · bpm", s?.resting_hr)}
              {cell("HRV · ms", s?.hrv_last_night)}
              {cell("Sleep score", s?.sleep_score)}
              {cell("VO₂max", round(vo2[i]?.current))}
            </div>
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
