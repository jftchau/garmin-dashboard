import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatDuration, zoneColor } from "../utils.js";

const ZONES = ["1", "2", "3", "4", "5"];
const ZONE_LABELS = {
  "1": "Easy",
  "2": "Aerobic",
  "3": "Tempo",
  "4": "Threshold",
  "5": "Max",
};

/**
 * One runner's weekly time-in-zone as a doughnut.
 *
 * The legend is rendered OUTSIDE the chart, as a fixed five-column strip that
 * always lists all five zones (dimmed when unused). Recharts' own <Legend>
 * lived inside the plot area and wrapped to a second row whenever a runner had
 * a Z5 entry, which stole height from the pie — so the two runners' doughnuts
 * came out different sizes on the head-to-head slide. A constant-height legend
 * outside the container keeps both circles identical no matter which zones each
 * runner hit, and showing every zone makes the two strips line up for reading
 * across. Each runner's zones are shades of that runner's own color, so the
 * two cards stay visibly theirs and the depth of the shade — not a hue change —
 * carries the effort.
 */
export default function HRZoneDoughnut({ zoneSeconds, rgb, height = "100%" }) {
  const byZone = zoneSeconds || {};
  const total = ZONES.reduce((s, z) => s + (byZone[z] || 0), 0);
  const data = ZONES.filter((z) => (byZone[z] || 0) > 0).map((z) => ({
    zone: z,
    label: `Z${z} ${ZONE_LABELS[z]}`,
    seconds: byZone[z],
  }));

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-lg font-mono text-center px-2">
        No heart rate data
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data}
              dataKey="seconds"
              nameKey="label"
              innerRadius="55%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="var(--color-ink)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.zone} fill={zoneColor(rgb, entry.zone)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-line)",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 14,
              }}
              formatter={(value) => formatDuration(value)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Fixed-height legend: five columns, always. */}
      <div className="shrink-0 mt-2 short:mt-1 grid grid-cols-5 gap-1 text-center">
        {ZONES.map((z) => {
          const secs = byZone[z] || 0;
          const share = total ? Math.round((secs / total) * 100) : 0;
          return (
            // Zone number and name sit on their own lines so every column is
            // exactly three rows tall — "Z4 Threshold" on one line would wrap
            // and shove that column's percentage out of alignment.
            <div key={z} className={secs ? "" : "opacity-40"}>
              <div className="h-1 rounded-full mb-1" style={{ background: zoneColor(rgb, z) }} />
              <div className="font-mono text-base leading-tight" style={{ color: zoneColor(rgb, z) }}>
                Z{z}
              </div>
              <div className="font-mono text-sm leading-tight text-muted whitespace-nowrap">
                {ZONE_LABELS[z]}
              </div>
              <div className="stat-mono text-xl short:text-lg leading-tight text-chalk">
                {secs ? `${share}%` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
