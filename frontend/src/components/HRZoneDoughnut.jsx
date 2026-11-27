import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatDuration, zoneColor } from "../utils.js";
import { tooltipProps } from "./chart.jsx";

export const ZONES = ["1", "2", "3", "4", "5"];
const ZONE_LABELS = { "1": "Easy", "2": "Aerobic", "3": "Tempo", "4": "Threshold", "5": "Max" };

/**
 * One runner's weekly time-in-zone: a fixed-size doughnut with a five-row key
 * beside it. Every zone is always listed (dimmed when unused) so the two
 * runners' keys line up row for row on the head-to-head slide. Zones are
 * shades of the runner's own colour — the depth of the shade, not a change of
 * hue, carries the effort.
 */
export default function HRZoneDoughnut({ zoneSeconds, rgb, size = 172 }) {
  const byZone = zoneSeconds || {};
  const total = ZONES.reduce((s, z) => s + (byZone[z] || 0), 0);
  const data = ZONES.filter((z) => (byZone[z] || 0) > 0).map((z) => ({
    zone: z,
    label: `Z${z} ${ZONE_LABELS[z]}`,
    seconds: byZone[z],
  }));

  return (
    <div className="flex items-center gap-6">
      <PieChart width={size} height={size} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={data.length ? data : [{ zone: "0", seconds: 1 }]}
          dataKey="seconds"
          nameKey="label"
          innerRadius="58%"
          outerRadius="100%"
          paddingAngle={data.length > 1 ? 2 : 0}
          stroke="none"
          isAnimationActive={false}
        >
          {(data.length ? data : [{ zone: "0" }]).map((e) => (
            <Cell key={e.zone} fill={e.zone === "0" ? "rgb(255 255 255 / 0.08)" : zoneColor(rgb, e.zone)} />
          ))}
        </Pie>
        {data.length > 0 && <Tooltip {...tooltipProps} formatter={(v) => formatDuration(v)} />}
      </PieChart>

      <div className="flex-1 min-w-0 flex flex-col gap-[10px]">
        {ZONES.map((z) => {
          const secs = byZone[z] || 0;
          const share = total ? Math.round((secs / total) * 100) : 0;
          return (
            <div key={z} className={`flex items-center gap-3 t-meta whitespace-nowrap ${secs ? "" : "opacity-40"}`}>
              <span className="w-[14px] h-[14px] rounded-[4px] shrink-0" style={{ background: zoneColor(rgb, z) }} />
              <span className="text-muted">{ZONE_LABELS[z]}</span>
              <span className="ml-auto text-soft">{secs ? `${share}%` : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
