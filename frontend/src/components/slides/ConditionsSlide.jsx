import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchConditions } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, Panel } from "../Slide.jsx";
import { formatDateShort, RUNNER_COLORS, runnerName, SLATE_RGB, EMBER_RGB } from "../../utils.js";

const axisTick = { fill: "var(--color-muted)", fontSize: 17, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 14,
};

// Temperature → bar color. The bar's height already states the temperature
// exactly, so color only has to answer "is this a comfortable month or a brutal
// one": neutral grey deepening with the heat, and the one alert hue once a
// month averages 30°C+. This replaced a five-hue blue→red ramp, five colors
// that existed nowhere else on the dashboard.
function heatColor(t) {
  if (t == null) return "var(--color-line)";
  if (t < 18) return `rgba(${SLATE_RGB},0.30)`;
  if (t < 24) return `rgba(${SLATE_RGB},0.45)`;
  if (t < 30) return `rgba(${SLATE_RGB},0.62)`;
  if (t < 33) return `rgba(${EMBER_RGB},0.45)`;
  return `rgba(${EMBER_RGB},0.70)`;
}

const monthTick = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" });

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
      km_a: e.km_a,
      km_b: e.km_b,
    }));
  const hottest = [a?.hottest, b?.hottest]
    .filter(Boolean)
    .sort((x, y) => y.temperature - x.temperature)[0] || null;
  return { months, hottest };
}

/**
 * Running conditions — monthly average temperature with the volume actually run
 * in it, month by month.
 *
 * Added because running volume alone reads as "slacking off" when the real
 * story is heat: as the months warm, mileage gives way to cross-training. The
 * temperature bars only make that point next to the kilometres, so both are on
 * the one chart — heat on the left axis, each runner's monthly km on the right.
 */
export default function ConditionsSlide({ users }) {
  const [condA, condB] = useTwoUsers((uid) => fetchConditions(8, uid), users);

  const { months, hottest } = useMemo(() => mergeConditions(condA, condB), [condA, condB]);

  if (!condA && !condB) return <Loading what="conditions" />;

  const latest = months[months.length - 1];
  const hotRuns = months.reduce((s, m) => s + (m.max_temp != null && m.max_temp >= 30 ? m.runs : 0), 0);

  return (
    <Slide className="space-y-3 short:space-y-2">
      <div className="grid grid-cols-4 gap-4 short:gap-3 shrink-0">
        <BigStat label="This month · avg" value={latest?.avg_temp ?? "—"} unit="°C" color="var(--color-chalk)" size="lg" />
        <BigStat
          label="Hottest run"
          value={hottest ? hottest.temperature : "—"}
          unit="°C"
          // The single genuine extreme on the slide — the only headline that
          // earns the alert hue.
          color="var(--color-ember)"
          size="lg"
        />
        <BigStat
          label="This month · run"
          value={latest ? ((latest.km_a || 0) + (latest.km_b || 0)).toFixed(0) : "—"}
          unit="km"
          color="var(--color-chalk)"
          size="lg"
        />
        <BigStat label="Runs in 30°C+ months" value={hotRuns} color="var(--color-chalk)" size="lg" />
      </div>

      <Panel grow title="Run temperature (bars, °C) · kilometres run (lines)">
        <div className="h-full flex flex-col">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="month" tick={axisTick} tickFormatter={monthTick} interval={0} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} />
                <YAxis yAxisId="temp" tick={axisTick} axisLine={false} tickLine={false} width={48} unit="°" />
                <YAxis yAxisId="km" orientation="right" tick={axisTick} axisLine={false} tickLine={false} width={56} unit="km" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "var(--color-muted)" }}
                  cursor={{ fill: "var(--color-line)", opacity: 0.3 }}
                  labelFormatter={monthTick}
                  formatter={(v, n, p) =>
                    n === "Temp"
                      ? [`${v}°C avg · ${p.payload.max_temp}°C peak · ${p.payload.runs} runs`, n]
                      : [`${v} km`, n]
                  }
                />
                <Legend wrapperStyle={{ fontSize: 15, fontFamily: "var(--font-mono)" }} iconSize={10} />
                {/* `fill` is what the legend swatch picks up — the per-month
                    <Cell>s override it on the bars themselves. Without it the
                    legend square renders black on the dark card. The fills are
                    already part-transparent so the km lines read across them. */}
                <Bar yAxisId="temp" dataKey="avg_temp" name="Temp" fill={`rgba(${SLATE_RGB},0.62)`} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {months.map((m) => (
                    <Cell key={m.month} fill={heatColor(m.avg_temp)} />
                  ))}
                </Bar>
                <Line yAxisId="km" type="monotone" dataKey="km_a" name={runnerName(users, 0)} stroke={RUNNER_COLORS[0]} strokeWidth={3} dot={{ r: 3, strokeWidth: 0, fill: RUNNER_COLORS[0] }} connectNulls isAnimationActive={false} />
                <Line yAxisId="km" type="monotone" dataKey="km_b" name={runnerName(users, 1)} stroke={RUNNER_COLORS[1]} strokeWidth={3} dot={{ r: 3, strokeWidth: 0, fill: RUNNER_COLORS[1] }} connectNulls isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {hottest && (
            <p className="shrink-0 mt-2 short:mt-1 font-mono text-sm text-muted">
              Peak: <span style={{ color: "var(--color-ember)" }}>{hottest.temperature}°C</span> on{" "}
              {formatDateShort(hottest.date)} · {hottest.distance_km} km
            </p>
          )}
        </div>
      </Panel>
    </Slide>
  );
}
