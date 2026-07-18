import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchTrainingMix } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { Loading, RunnerTag } from "../Slide.jsx";

const WEEKS = 10;

const axisTick = { fill: "var(--color-muted)", fontSize: 12, fontFamily: "var(--font-mono)" };

// Activity-type palette, shared with WeekVolumeChart so "orange = strength" and
// "green = other training" mean the same thing on every slide.
const BUCKETS = [
  { key: "run_hours", label: "Running", color: "var(--color-volt)" },
  { key: "strength_hours", label: "Strength", color: "var(--color-zone4)" },
  { key: "other_hours", label: "Other", color: "var(--color-zone2)" },
];

const weekTick = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });

const hrs = (h) => `${(+h).toFixed(1)} h`;

function MixTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const total = BUCKETS.reduce((s, b) => s + (d[b.key] || 0), 0);
  return (
    <div className="px-3 py-2 rounded-md border border-line bg-surface-2 font-mono text-xs">
      <div className="text-muted mb-1">week of {weekTick(label)}</div>
      {BUCKETS.map((b) => (
        <div key={b.key} className="flex justify-between gap-4">
          <span style={{ color: b.color }}>{b.label}</span>
          <span>{hrs(d[b.key] || 0)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-line mt-1 pt-1">
        <span className="text-muted">Total</span>
        <span>{hrs(total)}</span>
      </div>
    </div>
  );
}

function MixChart({ data, height }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center text-muted font-mono text-sm" style={{ height }}>
        No data
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
        <XAxis
          dataKey="week_start"
          tick={axisTick}
          tickFormatter={weekTick}
          interval={0}
          axisLine={{ stroke: "var(--color-line)" }}
          tickLine={false}
        />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={34} />
        <Tooltip content={<MixTooltip />} cursor={{ fill: "var(--color-line)", opacity: 0.3 }} />
        {BUCKETS.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            stackId="mix"
            fill={b.color}
            radius={i === BUCKETS.length - 1 ? [3, 3, 0, 0] : undefined}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Weekly training HOURS split running / strength / other, for both runners.
 *
 * Everything else on the dashboard is measured in km, which quietly implies
 * running is the only training that counts. Through summer that's misleading —
 * mileage drops while gym and other work picks up — so this slide switches to
 * time, the one unit every activity type shares.
 */
export default function TrainingMixSlide({ users }) {
  const [mixA, mixB] = useTwoUsers((uid) => fetchTrainingMix(WEEKS, uid), users);

  if (!mixA && !mixB) return <Loading what="training mix" />;

  const mixes = [mixA, mixB];

  return (
    <Slide className="space-y-2">
      <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs short:text-[11px]">
        <span className="text-muted uppercase tracking-widest">Hours per week · last {WEEKS} weeks</span>
        {BUCKETS.map((b) => (
          <span key={b.key} className="flex items-center gap-1.5 text-muted">
            <span className="w-3 h-3 rounded-sm" style={{ background: b.color }} />
            {b.label}
          </span>
        ))}
      </div>

      {/* Runners stacked, not side by side: 10 weekly bars need the full 1024px
          to stay readable at distance — halving the width crams the labels. */}
      <div className="flex-1 min-h-0 grid grid-rows-2 gap-4 short:gap-3">
        {(users || []).slice(0, 2).map((u, i) => (
          <div
            key={u.id}
            className="bg-surface border border-line rounded-xl p-4 short:p-2 flex flex-col min-h-0"
          >
            <div className="mb-1 shrink-0">
              <RunnerTag users={users} i={i} />
            </div>
            <div className="flex-1 min-h-0">
              <MixChart data={mixes[i]} height="100%" />
            </div>
          </div>
        ))}
      </div>
    </Slide>
  );
}
