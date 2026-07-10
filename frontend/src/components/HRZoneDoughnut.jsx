import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatDuration, ZONE_COLORS } from "../utils.js";

const ZONE_LABELS = {
  "1": "Z1 Easy",
  "2": "Z2 Aerobic",
  "3": "Z3 Tempo",
  "4": "Z4 Threshold",
  "5": "Z5 Max",
};

export default function HRZoneDoughnut({ zoneSeconds, height = 220 }) {
  const data = Object.entries(zoneSeconds || {})
    .filter(([, secs]) => secs > 0)
    .map(([zone, secs]) => ({ zone, label: ZONE_LABELS[zone] || `Z${zone}`, seconds: secs }));

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted text-xs font-mono text-center px-2"
        style={{ height }}
      >
        No heart rate data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="seconds"
          nameKey="label"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          stroke="var(--color-ink)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.zone} fill={ZONE_COLORS[entry.zone]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-line)",
            borderRadius: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
          formatter={(value) => formatDuration(value)}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
