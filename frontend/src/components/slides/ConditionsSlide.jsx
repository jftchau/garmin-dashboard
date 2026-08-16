import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchConditions } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, Panel } from "../Slide.jsx";
import { formatDateShort } from "../../utils.js";

const axisTick = { fill: "var(--color-muted)", fontSize: 17, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-line)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 14,
};

// Temperature → heat color, reusing the zone palette (cool blue → hot red) so a
// warm month reads as warm at a glance without a legend.
function heatColor(t) {
  if (t == null) return "var(--color-line)";
  if (t < 18) return "var(--color-zone1)";
  if (t < 24) return "var(--color-zone2)";
  if (t < 29) return "var(--color-zone3)";
  if (t < 33) return "var(--color-zone4)";
  return "var(--color-zone5)";
}

const monthTick = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" });

// Both runners share a climate, so merge their months into one household view:
// run-weighted average temp, the hotter max, and combined run counts.
function mergeConditions(a, b) {
  const map = new Map();
  const add = (cond) => {
    (cond?.months || []).forEach((m) => {
      const e = map.get(m.month) || { month: m.month, tSum: 0, tRuns: 0, max: null, runs: 0 };
      if (m.avg_temp != null) {
        e.tSum += m.avg_temp * m.runs;
        e.tRuns += m.runs;
      }
      if (m.max_temp != null) e.max = e.max == null ? m.max_temp : Math.max(e.max, m.max_temp);
      e.runs += m.runs;
      map.set(m.month, e);
    });
  };
  add(a);
  add(b);
  const months = [...map.values()]
    .sort((x, y) => (x.month < y.month ? -1 : 1))
    .map((e) => ({
      month: e.month,
      avg_temp: e.tRuns ? Math.round((e.tSum / e.tRuns) * 10) / 10 : null,
      max_temp: e.max,
      runs: e.runs,
    }));
  const hottest = [a?.hottest, b?.hottest]
    .filter(Boolean)
    .sort((x, y) => y.temperature - x.temperature)[0] || null;
  return { months, hottest };
}

/**
 * Running conditions — monthly average temperature, trending up through summer.
 *
 * Added because running volume alone reads as "slacking off" when the real
 * story is heat: as the months warm, mileage gives way to cross-training. This
 * slide makes the weather explicit so the two read together.
 */
export default function ConditionsSlide({ users }) {
  const [condA, condB] = useTwoUsers((uid) => fetchConditions(8, uid), users);

  const { months, hottest } = useMemo(() => mergeConditions(condA, condB), [condA, condB]);

  if (!condA && !condB) return <Loading what="conditions" />;

  const latest = months[months.length - 1];
  const hotRuns = months.reduce((s, m) => s + (m.max_temp != null && m.max_temp >= 30 ? m.runs : 0), 0);

  return (
    <Slide className="space-y-3 short:space-y-2">
      <div className="grid grid-cols-3 gap-4 short:gap-3 shrink-0">
        <BigStat label="This month · avg" value={latest?.avg_temp ?? "—"} unit="°C" color={heatColor(latest?.avg_temp)} />
        <BigStat
          label="Hottest run"
          value={hottest ? hottest.temperature : "—"}
          unit="°C"
          color={heatColor(hottest?.temperature)}
        />
        <BigStat label="Runs in 30°C+ months" value={hotRuns} color="var(--color-zone4)" size="md" />
      </div>

      <Panel grow title="Average run temperature · by month">
        <div className="h-full flex flex-col">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="month" tick={axisTick} tickFormatter={monthTick} interval={0} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} unit="°" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "var(--color-muted)" }}
                  cursor={{ fill: "var(--color-line)", opacity: 0.3 }}
                  labelFormatter={monthTick}
                  formatter={(v, n, p) => [`${v}°C avg · ${p.payload.max_temp}°C peak · ${p.payload.runs} runs`, "Temp"]}
                />
                <Bar dataKey="avg_temp" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {months.map((m) => (
                    <Cell key={m.month} fill={heatColor(m.avg_temp)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {hottest && (
            <p className="shrink-0 mt-2 short:mt-1 font-mono text-sm text-muted">
              Peak: <span style={{ color: "var(--color-zone5)" }}>{hottest.temperature}°C</span> on{" "}
              {formatDateShort(hottest.date)} · {hottest.distance_km} km
            </p>
          )}
        </div>
      </Panel>
    </Slide>
  );
}
