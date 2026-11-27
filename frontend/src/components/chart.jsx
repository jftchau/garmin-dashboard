import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RUNNER_COLORS } from "../utils.js";
import { glowRgba } from "./glass.jsx";

// Shared Recharts styling for the v2 glass slides (design/README.md).
//
// Recharts can't read CSS, so the `axis` step of the type scale (28px / 500)
// has to be handed to it as numbers here. Two things follow from 28px ticks
// that the v1 charts got wrong:
//
//   - YAxis `width` must fit the widest tick label or the leading digits clip
//     ("49.2" rendered as "9.2"). yAxisWidth() measures the labels instead of
//     guessing a fixed width.
//   - Fewer ticks. At 2.25 m an axis is for whoever walks over, so 3–4 round
//     steps from niceTicks() beat Recharts' default five-plus.

export const AXIS_PX = 28;
const AXIS_FONT = `500 ${AXIS_PX}px Outfit, system-ui, sans-serif`;

export const axisTick = {
  fill: "var(--color-muted)",
  fontSize: AXIS_PX,
  fontFamily: "Outfit, system-ui, sans-serif",
  fontWeight: 500,
};

// Hairline grid on the value axis only; no dashes (they shimmer at distance).
export const gridProps = { vertical: false, stroke: "rgb(255 255 255 / 0.07)" };

// X axis: room for the 28px tick plus its margin, or the labels clip at the
// bottom of the plot.
export const xAxisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: { stroke: "var(--color-line)" },
  tickMargin: 10,
  height: AXIS_PX + 16,
};

// interval 0: draw every tick we ask for. Recharts otherwise drops ticks it
// thinks collide at 28px, and a short chart can lose its 0.
// Plot margin. The top tick's text box (35px at 28px) is centred on the top
// gridline, so the plot starts 20px down or that label clips.
export const chartMargin = { top: 20, right: 0, left: 0, bottom: 0 };

export const yAxisProps = { tick: axisTick, tickLine: false, axisLine: false, tickMargin: 10, interval: 0 };

// For a desktop viewer hovering a chart; the kiosk never shows one.
export const tooltipProps = {
  contentStyle: {
    background: "var(--color-surface-2)",
    border: "1px solid var(--color-line)",
    borderRadius: 12,
    fontFamily: "Outfit, system-ui, sans-serif",
    fontSize: 24,
  },
  labelStyle: { color: "var(--color-muted)" },
  cursor: { fill: "rgb(255 255 255 / 0.04)" },
};

// Colours for marks (design rule 4: one lit mark per chart).
export const MARK_UNLIT = "rgb(255 255 255 / 0.16)";
export const STRENGTH = "var(--color-slate)";
export const OTHER = "var(--color-slate-dim)";

let ctx;
function textWidth(s) {
  if (typeof document === "undefined") return String(s).length * 16;
  ctx ??= document.createElement("canvas").getContext("2d");
  ctx.font = AXIS_FONT;
  // Canvas can't set tabular figures, and a proportional "1" is far narrower
  // than the tabular one the chart draws: measure every digit as a "0".
  return ctx.measureText(String(s).replace(/[0-9]/g, "0")).width;
}

// Width for a YAxis that will show `labels`: the widest label, its tick
// margin, and a few px of slack.
export function yAxisWidth(labels) {
  const w = Math.max(0, ...labels.map(textWidth));
  return Math.ceil(w) + yAxisProps.tickMargin + 6;
}

// Round ticks covering [min, max] in about `count` steps of 1, 2, 2.5 or 5
// x 10^n. Returns { ticks, domain } to hand straight to a YAxis.
export function niceTicks(min, max, count = 3) {
  if (!isFinite(min) || !isFinite(max)) return { ticks: [0, 1], domain: [0, 1] };
  if (max - min < 1e-9) {
    max = min + 1;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { ticks, domain: [lo, hi] };
}

// The lit end of a line: the runner's dot with its halo, on the last point
// only. Pass as a Line's `dot` so the rest of the line stays bare.
export function endDot(lastIndex, color, glow) {
  return function EndDot({ cx, cy, index }) {
    if (index !== lastIndex || cx == null || cy == null) return null;
    return (
      <g key={`end-${index}`}>
        <circle cx={cx} cy={cy} r={14} fill={glow} />
        <circle cx={cx} cy={cy} r={7} fill={color} />
      </g>
    );
  };
}

/**
 * One runner's trend with no axes: the line, a faint dot where the window
 * starts and the runner's lit dot where it ends. Beneath a headline number,
 * the shape is all a sparkline has to say; `rows` are { date, v }.
 */
export function Sparkline({ rows, i, pad = 1 }) {
  const vals = rows.map((r) => r.v).filter((v) => v != null);
  if (vals.length < 2) return null;
  const lo = Math.min(...vals) - pad;
  const hi = Math.max(...vals) + pad;
  const last = lastIndexOf(rows, "v");
  const first = rows.findIndex((r) => r.v != null);
  const color = RUNNER_COLORS[i];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 16, right: 16, left: 16, bottom: 16 }}>
        <YAxis hide domain={[lo, hi]} />
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={4}
          dot={({ cx, cy, index }) =>
            index === first ? (
              <circle key="start" cx={cx} cy={cy} r={6} fill="rgb(255 255 255 / 0.35)" />
            ) : (
              endDot(last, color, glowRgba(i))({ cx, cy, index })
            )
          }
          activeDot={false}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Index of the last row where `key` has a value (the line's live end).
export const lastIndexOf = (rows, key) => {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i][key] != null) return i;
  return -1;
};

/**
 * Both runners on one line chart: rows of { [xKey], a, b }. Each line is its
 * runner's mark, lit at its live end with the runner's dot; the dots in the
 * card above stand in for a legend. `yPad` widens the value range so a flat
 * month doesn't fill the plot edge to edge; `zero` pins the axis at 0.
 */
export function TwoLineChart({ data, xKey, xFormat, yFormat = (v) => v, yPad = 0, zero = false, minTickGap = 56, tipFormat }) {
  const vals = data.flatMap((r) => [r.a, r.b]).filter((v) => v != null);
  const lo = zero ? 0 : Math.min(...vals) - yPad;
  const hi = Math.max(...vals) + yPad;
  const y = niceTicks(lo, hi, 3);
  const ends = [lastIndexOf(data, "a"), lastIndexOf(data, "b")];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ ...chartMargin, right: 18 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} {...xAxisProps} tickFormatter={xFormat} minTickGap={minTickGap} />
        <YAxis {...yAxisProps} domain={y.domain} ticks={y.ticks} tickFormatter={yFormat} width={yAxisWidth(y.ticks.map(yFormat))} />
        <Tooltip {...tooltipProps} labelFormatter={xFormat} formatter={tipFormat} />
        {["a", "b"].map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            name={k}
            stroke={RUNNER_COLORS[i]}
            strokeWidth={4}
            dot={endDot(ends[i], RUNNER_COLORS[i], glowRgba(i))}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
