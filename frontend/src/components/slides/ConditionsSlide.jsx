import { useMemo } from "react";
import { ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchConditions } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, LabelStat, AlertChip, RunnerDot, Loading, glowRgba } from "../glass.jsx";
import { chartMargin, xAxisProps, yAxisProps, gridProps, tooltipProps, yAxisWidth, niceTicks, endDot, lastIndexOf } from "../chart.jsx";
import { Key } from "../WeekVolumeChart.jsx";
import { formatDateShort, RUNNER_COLORS, runnerName, SLATE_RGB } from "../../utils.js";

// Temperature → bar fill. The bar's height already states the temperature, so
// the fill only has to answer "comfortable month or brutal one": the neutral
// warm grey, brighter as it gets hotter (design rule 3, told apart by
// lightness). The alert hue is kept for the one genuine extreme, as a chip.
function heatFill(t) {
  if (t == null) return "rgb(255 255 255 / 0.08)";
  if (t < 18) return `rgba(${SLATE_RGB},0.22)`;
  if (t < 24) return `rgba(${SLATE_RGB},0.34)`;
  if (t < 30) return `rgba(${SLATE_RGB},0.50)`;
  return `rgba(${SLATE_RGB},0.70)`;
}

const monthTick = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" });

// Both runners share a climate, so temperature merges into one household view:
// run-weighted average temp, the hotter max, and combined run counts. Distance
// stays split per runner (km_a / km_b), because "how much did we run in that
// heat" is the half of the story each runner answers differently.
function mergeConditions(a, b) {
  const map = new Map();
  const add = (cond, slot) => {
    (cond?.months || []).forEach((m) => {
      const e = map.get(m.month) || { month: m.month, tSum: 0, tRuns: 0, max: null, runs: 0, km_a: null, km_b: null };
      if (m.avg_temp != null) {
        e.tSum += m.avg_temp * m.runs;
        e.tRuns += m.runs;
      }
      if (m.max_temp != null) e.max = e.max == null ? m.max_temp : Math.max(e.max, m.max_temp);
      e.runs += m.runs;
      const key = slot === 0 ? "km_a" : "km_b";
      e[key] = (e[key] || 0) + (m.distance_km || 0);
      map.set(m.month, e);
    });
  };
  add(a, 0);
  add(b, 1);
  const months = [...map.values()]
    .sort((x, y) => (x.month < y.month ? -1 : 1))
    .map((e) => ({
      month: e.month,
      avg_temp: e.tRuns ? Math.round((e.tSum / e.tRuns) * 10) / 10 : null,
      max_temp: e.max,
      runs: e.runs,
      km_a: e.km_a != null ? Math.round(e.km_a) : null,
      km_b: e.km_b != null ? Math.round(e.km_b) : null,
    }));
  const hottest = [a?.hottest, b?.hottest].filter(Boolean).sort((x, y) => y.temperature - x.temperature)[0] || null;
  return { months, hottest };
}

/**
 * Running conditions — monthly average run temperature with the volume each
 * runner actually ran in it.
 *
 * Added because running volume alone reads as "slacking off" when the real
 * story is heat: as the months warm, mileage gives way to cross-training. The
 * temperature bars only make that point next to the kilometres, so both are on
 * one chart — heat on the left axis, each runner's monthly km on the right.
 */
export default function ConditionsSlide({ users }) {
  const [condA, condB] = useTwoUsers((uid) => fetchConditions(8, uid), users);
  const { months, hottest } = useMemo(() => mergeConditions(condA, condB), [condA, condB]);

  if (!condA && !condB) return <Loading what="conditions" />;

  const latest = months[months.length - 1];
  const hotRuns = months.reduce((s, m) => s + (m.max_temp != null && m.max_temp >= 30 ? m.runs : 0), 0);

  const t = niceTicks(0, Math.max(10, ...months.map((m) => m.avg_temp || 0)), 3);
  const k = niceTicks(0, Math.max(10, ...months.flatMap((m) => [m.km_a || 0, m.km_b || 0])), 3);
  const deg = (v) => `${v}°`;
  const shown = (users || []).slice(0, 2);
  const ends = [lastIndexOf(months, "km_a"), lastIndexOf(months, "km_b")];

  return (
    <GlassSlide>
      <GlassCard>
        <div className="grid grid-cols-3 gap-8 shrink-0">
          <LabelStat label="This month · avg °C" value={latest?.avg_temp ?? "—"} note={latest ? `${latest.runs} runs` : " "} />
          <div className="min-w-0">
            <LabelStat label="Hottest run · °C" value={hottest ? hottest.temperature : "—"} />
            <div className="mt-2">
              {hottest ? <AlertChip>{formatDateShort(hottest.date)} · {(+hottest.distance_km).toFixed(1)} km</AlertChip> : null}
            </div>
          </div>
          <LabelStat
            label="This month · km run"
            value={latest ? Math.round((latest.km_a || 0) + (latest.km_b || 0)) : "—"}
            note={`${hotRuns} runs in 30°C+ months`}
          />
        </div>

        <div className="flex-1 min-h-0 mt-5">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={months} margin={chartMargin} barCategoryGap="28%">
              <CartesianGrid {...gridProps} yAxisId="temp" />
              <XAxis dataKey="month" {...xAxisProps} tickFormatter={monthTick} interval={0} />
              <YAxis yAxisId="temp" {...yAxisProps} domain={t.domain} ticks={t.ticks} tickFormatter={deg} width={yAxisWidth(t.ticks.map(deg))} />
              <YAxis yAxisId="km" orientation="right" {...yAxisProps} domain={k.domain} ticks={k.ticks} width={yAxisWidth(k.ticks)} />
              <Tooltip
                {...tooltipProps}
                labelFormatter={monthTick}
                formatter={(v, n, p) =>
                  n === "temp" ? [`${v}°C avg · ${p.payload.max_temp}°C peak · ${p.payload.runs} runs`, "Temp"] : [`${v} km`, n === "km_a" ? runnerName(users, 0) : runnerName(users, 1)]
                }
              />
              <Bar yAxisId="temp" dataKey="avg_temp" name="temp" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {months.map((m) => (
                  <Cell key={m.month} fill={heatFill(m.avg_temp)} />
                ))}
              </Bar>
              {shown.map((u, i) => (
                <Line
                  key={u.id}
                  yAxisId="km"
                  type="monotone"
                  dataKey={i === 0 ? "km_a" : "km_b"}
                  name={i === 0 ? "km_a" : "km_b"}
                  stroke={RUNNER_COLORS[i]}
                  strokeWidth={4}
                  dot={endDot(ends[i], RUNNER_COLORS[i], glowRgba(i))}
                  activeDot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="shrink-0 flex items-center gap-x-7 mt-3 t-meta text-muted">
          <Key fill={heatFill(27)} label="avg run temp °C" />
          {shown.map((u, i) => (
            <span key={u.id} className="flex items-center gap-[10px] whitespace-nowrap">
              <RunnerDot i={i} size={14} />
              {runnerName(users, i)} km
            </span>
          ))}
        </div>
      </GlassCard>
    </GlassSlide>
  );
}
