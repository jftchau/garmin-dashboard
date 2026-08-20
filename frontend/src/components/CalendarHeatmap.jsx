import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { intensity, SLATE_RGB } from "../utils.js";

const MS_DAY = 86400000;

// Track an element's content box. The heatmap is a hand-laid grid of 53x7 divs,
// so unlike the Recharts slides it can't just be told height="100%" — it has to
// be measured and the cell size solved for, or it sits in the corner of its
// card leaving the rest of the box empty.
function useBox() {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box];
}

// Ramp a run's distance to an opacity of the runner's base color, using the
// dashboard's shared intensity ramp (`INTENSITY_STEPS` in utils.js) — the same
// steps the heart-rate doughnut uses, so "deeper = more" means one thing
// everywhere. `rgb` is the runner's color as an "r,g,b" string.
function intensityColor(km, rgb) {
  if (!km || km <= 0) return "var(--color-surface-2)";
  if (km < 4) return intensity(rgb, 1);
  if (km < 8) return intensity(rgb, 2);
  if (km < 14) return intensity(rgb, 3);
  return intensity(rgb, 4);
}

// Distance buckets the ramp above encodes, shown in the legend so the color
// scale is self-explanatory. Values are the low edge of each intensity step.
const LEGEND_STEPS = [0, 2, 6, 10, 16];

// A day with only cross-training (no run) gets a neutral slate fill — visibly
// "something happened" without competing with the runner's distance hue.
const CROSS_TRAIN_FILL = `rgba(${SLATE_RGB},0.30)`;

export default function CalendarHeatmap({ data, rgb = "245,165,36", cell = 10, gap = 3, showHover = true }) {
  const [hovered, setHovered] = useState(null);
  const [outerRef, outer] = useBox();
  const [gridRef, gridBox] = useBox();

  // cell="auto": solve the cell size from the space the card actually gives us —
  // width across 53 weeks, height across 7 weekdays — instead of a fixed pixel
  // size that leaves a band of empty card to the right and below. Cells may end
  // up slightly taller than wide (capped at 1.6x) rather than waste the height;
  // any slack beyond that is centred instead of pooling under the grid.
  const auto = cell === "auto";
  const cellW = auto
    ? Math.max(6, Math.floor((outer.w - 52 * gap) / 53))
    : cell;
  const cellH = auto
    ? Math.min(Math.round(cellW * 1.6), Math.max(6, Math.floor((gridBox.h - 6 * gap) / 7)))
    : cell;
  const step = cellW + gap;

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
    <div ref={outerRef} className={auto ? "h-full min-h-0 flex flex-col" : "overflow-x-auto"}>
      {/* Left-aligned grid so it lines up with the card header and the stats
          strip. When auto-sized it spans the full card width by construction;
          at a fixed cell size the overflow-x-auto parent lets it scroll on a
          narrow screen. */}
      <div className={auto ? "flex-1 min-h-0 flex flex-col" : "w-fit"}>
        <div className="relative h-5 mb-1 pl-1 shrink-0">
          {monthLabels.map((m) => (
            <span
              key={m.week}
              className="absolute text-sm font-mono text-muted"
              style={{ left: `${m.week * step}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div ref={gridRef} className={`flex ${auto ? "flex-1 min-h-0 items-center" : ""}`} style={{ gap }}>
          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap }}>
              {col.map((day) => (
                <div
                  key={day.iso}
                  onMouseEnter={showHover ? () => setHovered(day) : undefined}
                  onMouseLeave={showHover ? () => setHovered(null) : undefined}
                  className="rounded-sm cursor-default"
                  style={{
                    width: cellW,
                    height: cellH,
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
          className="flex items-center justify-end gap-1.5 mt-2 text-sm font-mono text-muted shrink-0"
          style={{ width: auto ? "100%" : gridWidth }}
        >
          {hasCrossTrain && (
            <div className="flex items-center gap-1.5 mr-auto">
              <div
                className="rounded-sm"
                style={{ width: cellW, height: cellH, background: CROSS_TRAIN_FILL }}
              />
              <span>Cross-training</span>
            </div>
          )}
          <span>Less</span>
          {LEGEND_STEPS.map((km) => (
            <div
              key={km}
              className="rounded-sm"
              style={{ width: cellW, height: cellH, background: intensityColor(km, rgb) }}
            />
          ))}
          <span>More</span>
        </div>

        {showHover && (
          <div className="mt-3 h-5 text-sm font-mono text-muted">
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
