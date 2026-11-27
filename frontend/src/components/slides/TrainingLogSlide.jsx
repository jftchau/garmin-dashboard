import { useLayoutEffect, useRef, useState } from "react";
import { fetchCalendar } from "../../api.js";
import { useOneUser } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, GlassStat, MiniStats, Loading, glowRgba } from "../glass.jsx";
import { MARK_UNLIT } from "../chart.jsx";
import { RUNNER_COLORS, isoDay, mondayOf, addDays, monthName } from "../../utils.js";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Dot diameter for a run: AREA proportional to distance (so a 20 km long run
// reads as four 5 km runs, not two), up to the full cell at 20 km.
const FULL_KM = 20;
const dotSize = (km, cell) => Math.max(16, Math.round((cell - 10) * Math.sqrt(Math.min(km, FULL_KM) / FULL_KM)));

// The current month as Monday-first week rows (4–6 of them). Days outside the
// month are blank; days after today are blank too.
function monthGrid(days, today) {
  const byDate = new Map((days || []).map((d) => [d.date, d]));
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayIso = isoDay(today);
  const rows = [];
  for (let m = mondayOf(first); m <= last; m = addDays(m, 7)) {
    rows.push(
      Array.from({ length: 7 }, (_, k) => {
        const d = addDays(m, k);
        const iso = isoDay(d);
        const inMonth = d.getMonth() === today.getMonth();
        return { iso, blank: !inMonth || iso > todayIso, day: byDate.get(iso) };
      })
    );
  }
  return rows;
}

// Fit the cell size to the box the grid is given: 7 across, `rows` down.
// `ready` re-runs it once the grid mounts (the first render is "Loading").
function useCell(rows, ready) {
  const ref = useRef(null);
  const [cell, setCell] = useState(64);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setCell(Math.max(36, Math.min(72, Math.floor(width / 7), Math.floor(height / rows))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows, ready]);
  return [ref, cell];
}

/**
 * One runner's training log for the current month, Strava-style: one dot per
 * day, sized by distance, on a Monday-first week grid. The latest run is the
 * one lit dot; other runs are unlit; a cross-training-only day is a ring; a
 * rest day a speck. Replaces the 12-month heatmap: a dot's size survives
 * distance far better than a cell's shade.
 */
export default function TrainingLogSlide({ users, runner = 0 }) {
  const days = useOneUser((uid) => fetchCalendar(45, uid), users, runner);
  const today = new Date();
  const grid = monthGrid(days, today);
  const [boxRef, cell] = useCell(grid.length, !!days);

  if (!days) return <Loading what="training log" />;

  const monthIso = isoDay(today).slice(0, 7);
  const runs = days.filter((d) => d.date.startsWith(monthIso) && d.distance_km > 0);
  const latest = runs.length ? runs[runs.length - 1].date : null;
  const km = runs.reduce((s, d) => s + d.distance_km, 0);
  const color = RUNNER_COLORS[runner];

  return (
    <GlassSlide>
      <GlassCard runner={runner} className="flex-row! gap-10">
        <div className="w-[280px] shrink-0 flex flex-col justify-between">
          <div>
            <GlassStat value={runs.length} unit={runs.length === 1 ? "run" : "runs"} size="hero" stepAt={3} />
            <div className="t-caption text-soft mt-5 whitespace-nowrap">in {monthName(today)}</div>
          </div>
          <MiniStats items={[{ label: "km", value: km.toFixed(0) }, { label: "longest", value: runs.length ? Math.max(...runs.map((d) => d.distance_km)).toFixed(1) : "—" }]} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="grid grid-cols-7 shrink-0 t-meta text-muted mb-2" style={{ width: cell * 7, marginLeft: "auto" }}>
            {WEEKDAYS.map((w, k) => (
              <span key={k} className="text-center">{w}</span>
            ))}
          </div>
          <div ref={boxRef} className="flex-1 min-h-0 flex flex-col items-end justify-center">
            {grid.map((row, r) => (
              <div key={r} className="grid grid-cols-7" style={{ width: cell * 7, height: cell }}>
                {row.map((c) => {
                  let mark = null;
                  if (!c.blank) {
                    const run = c.day?.distance_km > 0;
                    if (run) {
                      const s = dotSize(c.day.distance_km, cell);
                      const lit = c.iso === latest;
                      mark = (
                        <span
                          className="rounded-full"
                          style={{
                            width: s,
                            height: s,
                            background: lit ? color : MARK_UNLIT,
                            boxShadow: lit ? `0 0 22px ${glowRgba(runner)}` : undefined,
                          }}
                        />
                      );
                    } else if (c.day?.cross_train) {
                      mark = <span className="w-[22px] h-[22px] rounded-full border-[3px] border-muted box-border" />;
                    } else {
                      mark = <span className="w-[8px] h-[8px] rounded-full" style={{ background: MARK_UNLIT }} />;
                    }
                  }
                  return (
                    <span key={c.iso} className="flex items-center justify-center">
                      {mark}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="shrink-0 flex items-center justify-end gap-7 mt-3 t-meta text-muted whitespace-nowrap">
            <span className="flex items-center gap-[10px]">
              <span className="w-[20px] h-[20px] rounded-full" style={{ background: MARK_UNLIT }} />
              run, size = km
            </span>
            <span className="flex items-center gap-[10px]">
              <span className="w-[20px] h-[20px] rounded-full" style={{ background: color }} />
              latest
            </span>
            <span className="flex items-center gap-[10px]">
              <span className="w-[20px] h-[20px] rounded-full border-[3px] border-muted box-border" />
              cross-training
            </span>
          </div>
        </div>
      </GlassCard>
    </GlassSlide>
  );
}
