import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const axisTick = { fill: "var(--color-muted)", fontSize: 13, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 13,
};

// Cross-training colors. Deliberately NOT the runner colors: on this chart the
// runner is already identified by the slide title, so the palette is free to
// encode activity type instead.
const STRENGTH_COLOR = "var(--color-zone4)";
const OTHER_COLOR = "var(--color-zone2)";

const dayTick = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });

// Round a max up to a readable axis ceiling (0 -> 1 so an empty week still
// renders a sane grid rather than collapsing to a single line).
function niceMax(v) {
  if (!v || v <= 0) return 1;
  const step = v <= 5 ? 1 : v <= 20 ? 5 : v <= 60 ? 10 : 20;
  return Math.ceil(v / step) * step;
}

// This week's run bar, drawn with last week's same-weekday volume as a wider,
// faint slab behind it. Recharts groups sibling <Bar>s side by side, so the
// comparison is painted inside this one bar's shape to get a true overlay.
function RunBar(props) {
  const { x, y, width, height, background, fill, payload, kmMax } = props;
  const prev = payload?.prevKm || 0;
  const ghostH = background && kmMax > 0 ? (prev / kmMax) * background.height : 0;
  const ghostW = width * 1.5;

  return (
    <g>
      {ghostH > 0 && (
        <rect
          x={x - (ghostW - width) / 2}
          y={background.y + background.height - ghostH}
          width={ghostW}
          height={ghostH}
          fill={fill}
          opacity={0.18}
          rx={3}
        />
      )}
      {height > 0 && <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} />}
    </g>
  );
}

function WeekTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows = [
    ["This week", `${d.km ?? 0} km`],
    ["Last week", `${d.prevKm ?? 0} km`],
    d.strengthH ? ["Strength", `${hrs(d.strengthH)}`] : null,
    d.otherH ? ["Other", `${hrs(d.otherH)}`] : null,
  ].filter(Boolean);

  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <div className="text-muted mb-1">{dayTick(label)}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-4 justify-between">
          <span className="text-muted">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

const hrs = (h) => (h >= 1 ? `${h.toFixed(1)} h` : `${Math.round(h * 60)} min`);

/**
 * One runner's training week: run distance (left axis, km) with last week's
 * volume ghosted behind, plus stacked strength / other cross-training hours on
 * the right axis.
 *
 * Two axes because the units genuinely differ — km is still the headline
 * running metric, but through summer the non-running load is what actually
 * explains a light mileage week, so it has to be visible on the same chart.
 *
 * `week` is an /api/this-week payload. The chart fills its parent, which must
 * therefore have a definite height (see Slide/Panel).
 */
export default function WeekVolumeChart({ week, color }) {
  const daily = week?.daily_distance_km || [];
  const prev = week?.prev_daily_distance_km || [];
  const cross = week?.daily_cross_training_min || [];

  // Zip by weekday index: both series are ordered Mon→Sun, so index i is the
  // same weekday in each week (matching dates would never line up).
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

  const kmMax = niceMax(Math.max(0, ...data.map((d) => Math.max(d.km || 0, d.prevKm || 0))));
  const hourMax = niceMax(Math.max(0, ...data.map((d) => (d.strengthH || 0) + (d.otherH || 0))));

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={axisTick}
            tickFormatter={dayTick}
            interval={0}
            axisLine={{ stroke: "var(--color-line)" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="km"
            domain={[0, kmMax]}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <YAxis
            yAxisId="hours"
            orientation="right"
            domain={[0, hourMax]}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<WeekTooltip />} cursor={{ fill: "var(--color-line)", opacity: 0.3 }} />
          <Bar
            yAxisId="km"
            dataKey="km"
            fill={color}
            background={{ fill: "transparent" }}
            shape={(p) => <RunBar {...p} kmMax={kmMax} />}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="hours"
            dataKey="strengthH"
            stackId="cross"
            fill={STRENGTH_COLOR}
            maxBarSize={26}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="hours"
            dataKey="otherH"
            stackId="cross"
            fill={OTHER_COLOR}
            maxBarSize={26}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>

      {/* Hand-rolled legend: the ghost bars aren't a real Recharts series, and a
          bigger, plain-language key reads better at distance than the default. */}
      <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 short:mt-1 font-mono text-xs short:text-[11px]">
        <Key color={color} label="This week · km" />
        <Key color={color} label="Last week · km" opacity={0.28} wide />
        <Key color={STRENGTH_COLOR} label="Strength · h" />
        <Key color={OTHER_COLOR} label="Other training · h" />
      </div>
    </div>
  );
}

function Key({ color, label, opacity = 1, wide = false }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span
        className="rounded-sm"
        style={{ background: color, opacity, width: wide ? 16 : 9, height: 11 }}
      />
      {label}
    </span>
  );
}
