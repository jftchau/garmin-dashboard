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

// Distance buckets the ramp above encodes, shown in the legend so the color
// scale is self-explanatory. Values are the low edge of each intensity step.
const LEGEND_STEPS = [0, 2, 6, 10, 16];

// A day with only cross-training (no run) gets a neutral slate fill — visibly
// "something happened" without competing with the runner's distance hue.
const CROSS_TRAIN_FILL = "rgba(148,163,184,0.30)";

export default function CalendarHeatmap({ data, rgb = "245,197,24", cell = 10, gap = 3, showHover = true }) {
  const step = cell + gap;
  const [hovered, setHovered] = useState(null);

  const byDate = useMemo(() => {
    const map = {};
    (data || []).forEach((d) => (map[d.date] = d.distance_km));
    return map;
  }, [data]);

  // Days with cross-training only (a non-run activity, no run that day).
  const crossDates = useMemo(() => {
    const s = new Set();
    (data || []).forEach((d) => d.cross_train && s.add(d.date));
    return s;
  }, [data]);

  const hasCrossTrain = crossDates.size > 0;

  // Fill for one day: run intensity wins; else a cross-training marker; else empty.
  const dayFill = (iso) => {
    const km = byDate[iso];
    if (km > 0) return intensityColor(km, rgb);
    if (crossDates.has(iso)) return CROSS_TRAIN_FILL;
    return intensityColor(0, rgb);
  };

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

  const gridWidth = weeks.length * step;

  return (
    <div className="overflow-x-auto">
      {/* w-fit + mx-auto centers the fixed-width grid on wide cards, while the
          overflow-x-auto parent still lets it scroll on a narrow screen. */}
      <div className="mx-auto w-fit">
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
                    background: day.inFuture ? "transparent" : dayFill(day.iso),
                    border: day.inFuture ? "1px solid var(--color-line)" : "none",
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend: the distance→intensity ramp, right-aligned under the grid. */}
        <div
          className="flex items-center justify-end gap-1.5 mt-2 text-[10px] font-mono text-muted"
          style={{ width: gridWidth }}
        >
          {hasCrossTrain && (
            <div className="flex items-center gap-1.5 mr-auto">
              <div
                className="rounded-sm"
                style={{ width: cell, height: cell, background: CROSS_TRAIN_FILL }}
              />
              <span>Cross-training</span>
            </div>
          )}
          <span>Less</span>
          {LEGEND_STEPS.map((km) => (
            <div
              key={km}
              className="rounded-sm"
              style={{ width: cell, height: cell, background: intensityColor(km, rgb) }}
            />
          ))}
          <span>More</span>
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
