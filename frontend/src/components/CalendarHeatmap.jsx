import { useMemo, useState } from "react";

const MS_DAY = 86400000;

// Ramp a run's distance to an opacity of the runner's base color. `rgb` is the
// runner's color as an "r,g,b" string so each heatmap tints in its own hue.
function intensityColor(km, rgb) {
  if (!km || km <= 0) return "var(--color-surface-2)";
  if (km < 4) return `rgba(${rgb},0.35)`;
  if (km < 8) return `rgba(${rgb},0.6)`;
  if (km < 14) return `rgba(${rgb},0.85)`;
  return `rgb(${rgb})`;
}

export default function CalendarHeatmap({ data, rgb = "245,197,24", cell = 10, gap = 3, showHover = true }) {
  const step = cell + gap;
  const [hovered, setHovered] = useState(null);

  const byDate = useMemo(() => {
    const map = {};
    (data || []).forEach((d) => (map[d.date] = d.distance_km));
    return map;
  }, [data]);

  // Build a 53-week x 7-day grid ending today, Sunday-first columns like GitHub.
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const start = new Date(end);
    start.setDate(start.getDate() - 53 * 7 + 1);

    const weeksArr = [];
    const labels = [];
    let cursor = new Date(start);
    let lastMonth = -1;

    for (let w = 0; w < 53; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const iso = cursor.toISOString().slice(0, 10);
        col.push({ iso, inFuture: cursor > today });
        if (d === 0 && cursor.getMonth() !== lastMonth) {
          labels.push({ week: w, label: cursor.toLocaleDateString(undefined, { month: "short" }) });
          lastMonth = cursor.getMonth();
        }
        cursor = new Date(cursor.getTime() + MS_DAY);
      }
      weeksArr.push(col);
    }
    return { weeks: weeksArr, monthLabels: labels };
  }, []);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="relative h-4 mb-1 pl-1">
          {monthLabels.map((m) => (
            <span
              key={m.week}
              className="absolute text-[10px] font-mono text-muted"
              style={{ left: `${m.week * step}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex" style={{ gap }}>
          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap }}>
              {col.map((day) => (
                <div
                  key={day.iso}
                  onMouseEnter={showHover ? () => setHovered(day) : undefined}
                  onMouseLeave={showHover ? () => setHovered(null) : undefined}
                  className="rounded-sm cursor-default"
                  style={{
                    width: cell,
                    height: cell,
                    background: day.inFuture ? "transparent" : intensityColor(byDate[day.iso], rgb),
                    border: day.inFuture ? "1px solid var(--color-line)" : "none",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        {showHover && (
          <div className="mt-3 h-5 text-xs font-mono text-muted">
            {hovered &&
              (hovered.inFuture
                ? null
                : `${hovered.iso} — ${(byDate[hovered.iso] || 0).toFixed(1)} km`)}
          </div>
        )}
      </div>
    </div>
  );
}
