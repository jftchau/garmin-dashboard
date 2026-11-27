import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchTrainingMix } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, LabelStat, Empty, Loading } from "../glass.jsx";
import { chartMargin, xAxisProps, yAxisProps, gridProps, tooltipProps, yAxisWidth, niceTicks, MARK_UNLIT, STRENGTH, OTHER } from "../chart.jsx";
import { Key } from "../WeekVolumeChart.jsx";
import { RUNNER_COLORS, runnerName } from "../../utils.js";

const WEEKS = 10;

const weekTick = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "numeric", day: "numeric" });

const h1 = (v) => (+v || 0).toFixed(1);

function MixTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows = [
    ["Running", d.run_hours],
    ["Strength", d.strength_hours],
    ["Other", d.other_hours],
  ];
  return (
    <div style={tooltipProps.contentStyle} className="px-4 py-3">
      <div className="text-muted mb-1">week of {weekTick(label)}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-6">
          <span className="text-muted">{k}</span>
          <span>{h1(v)} h</span>
        </div>
      ))}
    </div>
  );
}

// Ten weeks of stacked hours. Running sits at the bottom of each stack and is
// lit only for this week (design rule 4); past weeks' running is unlit, and
// cross-training keeps its two warm greys.
function MixChart({ data, color }) {
  if (!data?.length) return <Empty />;
  const y = niceTicks(0, Math.max(1, ...data.map((d) => (d.run_hours || 0) + (d.strength_hours || 0) + (d.other_hours || 0))), 2);
  const last = data.length - 1;
  const hTick = (v) => `${v}h`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={chartMargin} barCategoryGap="24%">
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="week_start" {...xAxisProps} tickFormatter={weekTick} interval={1} />
        <YAxis {...yAxisProps} domain={y.domain} ticks={y.ticks} tickFormatter={hTick} width={yAxisWidth(y.ticks.map(hTick))} />
        <Tooltip content={<MixTooltip />} cursor={tooltipProps.cursor} />
        <Bar dataKey="run_hours" stackId="mix" isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={d.week_start} fill={i === last ? color : MARK_UNLIT} />
          ))}
        </Bar>
        <Bar dataKey="strength_hours" stackId="mix" fill={STRENGTH} isAnimationActive={false} />
        <Bar dataKey="other_hours" stackId="mix" fill={OTHER} radius={[6, 6, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Weekly training HOURS split running / strength / other, per runner.
 *
 * Everything else on the dashboard is measured in km, which quietly implies
 * running is the only training that counts. Through summer that's misleading —
 * mileage drops while gym and other work picks up — so this slide switches to
 * time, the one unit every activity type shares. The headline is this week's
 * total hours; the ten-week stacks are the evidence.
 *
 * Runners are stacked, not side by side: ten weekly bars need the full width.
 */
export default function TrainingMixSlide({ users }) {
  const [mixA, mixB] = useTwoUsers((uid) => fetchTrainingMix(WEEKS, uid), users);
  if (!mixA && !mixB) return <Loading what="training mix" />;

  const mixes = [mixA, mixB];
  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide className="grid-rows-[1fr_1fr_auto] gap-y-4!">
      {shown.map((u, i) => {
        const data = mixes[i] || [];
        const w = data[data.length - 1] || {};
        const total = (w.run_hours || 0) + (w.strength_hours || 0) + (w.other_hours || 0);
        return (
          <GlassCard key={u.id} runner={i} tight className="flex-row! justify-start! items-center gap-8">
            <div className="w-[250px] shrink-0">
              <LabelStat
                dot={i}
                label={`${runnerName(users, i)} · this week, h`}
                value={h1(total)}
                note={`${h1(w.run_hours)} run · ${h1((w.strength_hours || 0) + (w.other_hours || 0))} other`}
              />
            </div>
            <div className="flex-1 min-w-0 h-full">
              <MixChart data={data} color={RUNNER_COLORS[i]} />
            </div>
          </GlassCard>
        );
      })}
      <div className="flex items-center justify-end gap-x-7 t-meta text-muted">
        <span className="flex items-center gap-[10px]">
          <span className="w-[16px] h-[16px] rounded-[4px]" style={{ background: `linear-gradient(90deg, ${RUNNER_COLORS[0]} 50%, ${RUNNER_COLORS[1]} 50%)` }} />
          running this week
        </span>
        <Key fill={MARK_UNLIT} label="running" />
        <Key fill={STRENGTH} label="strength" />
        <Key fill={OTHER} label="other" />
      </div>
    </GlassSlide>
  );
}
