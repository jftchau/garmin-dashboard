import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchVo2maxTrend, fetchWellnessTrend, fetchCurrentStatus } from "../api.js";
import { useTwoUsers } from "../useTwoUsers.js";
import { useCompact } from "../useCompact.js";
import { RUNNER_COLORS, runnerName } from "../utils.js";

const axisTick = { fill: "var(--color-muted)", fontSize: 10, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
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

export default function InsightsView({ users }) {
  const [vo2A, vo2B] = useTwoUsers(fetchVo2maxTrend, users);
  const [wellA, wellB] = useTwoUsers((uid) => fetchWellnessTrend(90, uid), users);
  const [statA, statB] = useTwoUsers(fetchCurrentStatus, users);
  const compact = useCompact();
  const chartH = compact ? 120 : 170;

  const vo2Data = mergeByDate(vo2A?.trend, vo2B?.trend, "vo2max");
  const rhrData = mergeByDate(wellA, wellB, "resting_hr");
  const hrvData = mergeByDate(wellA, wellB, "hrv_weekly_avg");
  const sleepData = mergeByDate(wellA, wellB, "sleep_seconds", (s) => +(s / 3600).toFixed(1));

  const cards = [
    { label: "Resting HR", unit: "bpm", vals: [statA?.resting_hr, statB?.resting_hr] },
    { label: "HRV", unit: "ms", vals: [statA?.hrv_last_night, statB?.hrv_last_night] },
    { label: "Sleep score", unit: "", vals: [statA?.sleep_score, statB?.sleep_score] },
    { label: "VO₂max", unit: "", vals: [round(vo2A?.current), round(vo2B?.current)] },
  ];

  return (
    <div className="p-4 sm:p-6 short:p-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-surface border border-line rounded-lg p-3 short:p-2">
            <div className="text-muted text-[10px] uppercase tracking-wide font-mono mb-1">
              {c.label} {c.unit && <span className="opacity-70">· {c.unit}</span>}
            </div>
            <div className="flex flex-col gap-0.5">
              {c.vals.map((v, i) => (
                <span key={i} className="stat-mono text-lg leading-tight" style={{ color: RUNNER_COLORS[i] }}>
                  {v ?? "—"}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MiniPanel title="VO₂max" subtitle="per-run estimate">
          <MiniChart data={vo2Data} height={chartH} pad={1} fmt={(v) => v} />
        </MiniPanel>
        <MiniPanel title="Resting heart rate" subtitle="bpm · lower is fitter">
          <MiniChart data={rhrData} height={chartH} pad={2} fmt={(v) => `${v} bpm`} />
        </MiniPanel>
        <MiniPanel title="HRV (weekly avg)" subtitle="ms · higher & stable is better">
          <MiniChart data={hrvData} height={chartH} pad={4} fmt={(v) => `${v} ms`} />
        </MiniPanel>
        <MiniPanel title="Sleep" subtitle="hours per night">
          <MiniChart data={sleepData} height={chartH} pad={1} fmt={(v) => `${v} h`} />
        </MiniPanel>
      </div>
    </div>
  );
}

const round = (v) => (v != null ? Math.round(v) : null);

function MiniChart({ data, height, pad, fmt }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted text-xs font-mono" style={{ height }}>
        No data
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: "var(--color-line)" }} tickLine={false} minTickGap={44} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={30} domain={[`dataMin - ${pad}`, `dataMax + ${pad}`]} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-muted)" }} formatter={(v, n) => [fmt(v), n]} />
        <Line type="monotone" dataKey="a" name="A" stroke={RUNNER_COLORS[0]} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="b" name="B" stroke={RUNNER_COLORS[1]} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MiniPanel({ title, subtitle, children }) {
  return (
    <div className="bg-surface border border-line rounded-lg p-3 short:p-2">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="heading-display text-xs uppercase tracking-wide text-muted">{title}</h3>
        <p className="text-muted text-[10px] font-mono">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
