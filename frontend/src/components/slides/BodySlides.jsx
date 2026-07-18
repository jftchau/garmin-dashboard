import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchVo2maxTrend, fetchWellnessTrend, fetchCurrentStatus } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, RunnerTag } from "../Slide.jsx";
import { RUNNER_COLORS } from "../../utils.js";

const axisTick = { fill: "var(--color-muted)", fontSize: 12, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 13,
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

const round = (v) => (v != null ? Math.round(v) : null);

function TrendChart({ data, height, pad, fmt }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center text-muted font-mono text-sm" style={{ height }}>
        No data
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} minTickGap={52} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} domain={[`dataMin - ${pad}`, `dataMax + ${pad}`]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} formatter={(v, n) => [fmt(v), n]} />
        <Line type="monotone" dataKey="a" name="A" stroke={RUNNER_COLORS[0]} strokeWidth={3} dot={false} connectNulls activeDot={{ r: 5 }} isAnimationActive={false} />
        <Line type="monotone" dataKey="b" name="B" stroke={RUNNER_COLORS[1]} strokeWidth={3} dot={false} connectNulls activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function TrendPanel({ title, subtitle, children }) {
  return (
    <div className="bg-surface border border-line rounded-xl p-4 short:p-3 flex flex-col min-h-0">
      <div className="flex items-baseline justify-between mb-2 short:mb-1 gap-3 shrink-0">
        <h3 className="heading-display text-base short:text-sm uppercase tracking-wide text-muted">{title}</h3>
        <p className="text-muted text-xs font-mono">{subtitle}</p>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

// Two trends side by side. Splitting the old 2x2 grid of tiny charts across two
// slides doubles each chart's height — the lines are now readable at distance.
function TrendPairSlide({ panels }) {
  return (
    <Slide>
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 short:gap-3">
        {panels.map((p) => (
          <TrendPanel key={p.title} title={p.title} subtitle={p.subtitle}>
            <TrendChart data={p.data} height="100%" pad={p.pad} fmt={p.fmt} />
          </TrendPanel>
        ))}
      </div>
    </Slide>
  );
}

export function HeartTrendsSlide({ users }) {
  const [wellA, wellB] = useTwoUsers((uid) => fetchWellnessTrend(90, uid), users);
  if (!wellA && !wellB) return <Loading what="wellness" />;

  return (
    <TrendPairSlide
      panels={[
        {
          title: "Resting heart rate",
          subtitle: "bpm · lower is fitter",
          data: mergeByDate(wellA, wellB, "resting_hr"),
          pad: 2,
          fmt: (v) => `${v} bpm`,
        },
        {
          title: "HRV (weekly avg)",
          subtitle: "ms · higher & stable is better",
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
  const [wellA, wellB] = useTwoUsers((uid) => fetchWellnessTrend(90, uid), users);
  if (!vo2A && !vo2B && !wellA && !wellB) return <Loading what="fitness" />;

  return (
    <TrendPairSlide
      panels={[
        {
          title: "VO₂max",
          subtitle: "per-run estimate",
          data: mergeByDate(vo2A?.trend, vo2B?.trend, "vo2max"),
          pad: 1,
          fmt: (v) => v,
        },
        {
          title: "Sleep",
          subtitle: "hours per night",
          data: mergeByDate(wellA, wellB, "sleep_seconds", (s) => +(s / 3600).toFixed(1)),
          pad: 1,
          fmt: (v) => `${v} h`,
        },
      ]}
    />
  );
}

export function StatusSlide({ users }) {
  const [statA, statB] = useTwoUsers(fetchCurrentStatus, users);
  const [vo2A, vo2B] = useTwoUsers(fetchVo2maxTrend, users);

  if (!statA && !statB) return <Loading what="current status" />;

  const stats = [statA, statB];
  const vo2 = [vo2A, vo2B];

  return (
    <Slide className="space-y-3 short:space-y-2">
      {(users || []).slice(0, 2).map((u, i) => {
        const s = stats[i];
        const color = RUNNER_COLORS[i];
        return (
          <div key={u.id} className="bg-surface border border-line rounded-xl p-5 short:p-3 flex-1 min-h-0 flex flex-col justify-center">
            <div className="mb-3 short:mb-2">
              <RunnerTag users={users} i={i} size="lg" />
            </div>
            <div className="grid grid-cols-4 gap-4 short:gap-3">
              <BigStat label="Resting HR" value={s?.resting_hr} unit="bpm" color={color} />
              <BigStat label="HRV" value={s?.hrv_last_night} unit="ms" color={color} />
              <BigStat label="Sleep score" value={s?.sleep_score} color={color} />
              <BigStat label="VO₂max" value={round(vo2[i]?.current)} color={color} />
            </div>
          </div>
        );
      })}
    </Slide>
  );
}
