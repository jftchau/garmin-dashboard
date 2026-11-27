import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  chartMargin,
  xAxisProps,
  yAxisProps,
  gridProps,
  tooltipProps,
  yAxisWidth,
  niceTicks,
  MARK_UNLIT,
  STRENGTH,
  OTHER,
} from "./chart.jsx";

const dayTick = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });

const REF = "rgb(255 255 255 / 0.55)";

// This week's run bar, with last week's same weekday as a bright hairline at
// its height: a reference to beat rather than a second bar competing for the
// eye. Only the latest run is lit; the rest of the week is unlit (design
// rule 4). Recharts groups sibling <Bar>s side by side, so the reference is
// drawn inside this one bar's shape to sit on top of it.
function RunBar({ x, y, width, height, background, payload, kmMax, color }) {
  const prev = payload?.prevKm || 0;
  const refY = background && kmMax > 0 ? background.y + background.height - (prev / kmMax) * background.height : null;
  const refW = width * 1.4;
  return (
    <g>
      {height > 0 && <rect x={x} y={y} width={width} height={height} rx={6} fill={payload.lit ? color : MARK_UNLIT} />}
      {prev > 0 && refY != null && (
        <rect x={x - (refW - width) / 2} y={refY - 2} width={refW} height={4} rx={2} fill={REF} />
      )}
    </g>
  );
}

const hrs = (h) => (h >= 1 ? `${h.toFixed(1)} h` : `${Math.round(h * 60)} min`);

function WeekTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows = [
    ["This week", `${d.km ?? 0} km`],
    ["Last week", `${d.prevKm ?? 0} km`],
    d.strengthH ? ["Strength", hrs(d.strengthH)] : null,
    d.otherH ? ["Other", hrs(d.otherH)] : null,
  ].filter(Boolean);
  return (
    <div style={tooltipProps.contentStyle} className="px-4 py-3">
      <div className="text-muted mb-1">{dayTick(label)}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-6 justify-between">
          <span className="text-muted">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * One runner's training week: run km per day (left axis) against last week's
 * same day, plus stacked strength / other cross-training hours (right axis).
 *
 * Two axes because the units genuinely differ: km is the running headline,
 * but through summer the non-running load is what explains a light week.
 * `week` is an /api/this-week payload; the chart fills its parent.
 */
export default function WeekVolumeChart({ week, color }) {
  const daily = week?.daily_distance_km || [];
  const prev = week?.prev_daily_distance_km || [];
  const cross = week?.daily_cross_training_min || [];

  // Zip by weekday index: both series are Mon→Sun, so index i is the same
  // weekday in each week (matching dates would never line up).
  const todayStr = new Date().toLocaleDateString("en-CA");
  const data = daily.map((d, i) => {
    const future = d.date > todayStr;
    const c = cross[i] || {};
    return {
      date: d.date,
      km: future ? null : d.distance_km,
      prevKm: prev[i]?.distance_km ?? 0,
      strengthH: future ? null : +((c.strength_min || 0) / 60).toFixed(2),
      otherH: future ? null : +((c.other_min || 0) / 60).toFixed(2),
    };
  });
  // The one lit mark: the most recent day with a run.
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].km > 0) {
      data[i].lit = true;
      break;
    }
  }

  const km = niceTicks(0, Math.max(1, ...data.map((d) => Math.max(d.km || 0, d.prevKm || 0))), 3);
  const hr = niceTicks(0, Math.max(1, ...data.map((d) => (d.strengthH || 0) + (d.otherH || 0))), 3);
  const hTick = (v) => `${v}h`;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={chartMargin} barGap={10} barCategoryGap="22%">
            <CartesianGrid {...gridProps} yAxisId="km" />
            <XAxis dataKey="date" {...xAxisProps} tickFormatter={dayTick} interval={0} />
            <YAxis yAxisId="km" {...yAxisProps} domain={km.domain} ticks={km.ticks} width={yAxisWidth(km.ticks)} />
            <YAxis
              yAxisId="hours"
              orientation="right"
              {...yAxisProps}
              domain={hr.domain}
              ticks={hr.ticks}
              tickFormatter={hTick}
              width={yAxisWidth(hr.ticks.map(hTick))}
            />
            <Tooltip content={<WeekTooltip />} cursor={tooltipProps.cursor} />
            <Bar
              yAxisId="km"
              dataKey="km"
              background={{ fill: "transparent" }}
              shape={(p) => <RunBar {...p} kmMax={km.domain[1]} color={color} />}
              isAnimationActive={false}
            />
            <Bar yAxisId="hours" dataKey="strengthH" stackId="cross" fill={STRENGTH} maxBarSize={22} isAnimationActive={false} />
            <Bar
              yAxisId="hours"
              dataKey="otherH"
              stackId="cross"
              fill={OTHER}
              maxBarSize={22}
              radius={[6, 6, 0, 0]}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Hand-rolled key: the reference line isn't a real series, and plain
          words read better than Recharts' legend. */}
      <div className="shrink-0 flex items-center gap-x-7 mt-3 t-meta text-muted">
        <Key fill={color} label="latest run" />
        <Key fill={MARK_UNLIT} label="km" />
        <Key line label="last week" />
        <Key fill={STRENGTH} label="strength h" />
        <Key fill={OTHER} label="other h" />
      </div>
    </div>
  );
}

export function Key({ fill, label, line = false }) {
  return (
    <span className="flex items-center gap-[10px] whitespace-nowrap">
      {line ? (
        <span className="w-[22px] h-[4px] rounded-full" style={{ background: REF }} />
      ) : (
        <span className="w-[16px] h-[16px] rounded-[4px]" style={{ background: fill }} />
      )}
      {label}
    </span>
  );
}
