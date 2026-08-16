import { useEffect, useState } from "react";
import { fetchActivities } from "../../api.js";
import Slide, { Loading, RunnerTag } from "../Slide.jsx";
import { formatDistanceKm, formatPace, formatDateShort, RUNNER_COLORS, trainingEffect } from "../../utils.js";

const N = 4; // runs per runner — enough to fill the column at a readable row size

// Fetch the most recent runs for both runners. fetchActivities returns all
// activity types; we filter to runs so cross-training doesn't crowd the list.
function useRecentRuns(users) {
  const [runs, setRuns] = useState([null, null]);
  const idA = users?.[0]?.id;
  const idB = users?.[1]?.id;
  useEffect(() => {
    let alive = true;
    const isRun = (a) => (a.activity_type || "running").includes("running");
    const get = (id, slot) =>
      id != null &&
      fetchActivities(20, 0, id).then((r) => {
        if (!alive) return;
        setRuns((prev) => {
          const next = [...prev];
          next[slot] = (r.activities || []).filter(isRun).slice(0, N);
          return next;
        });
      });
    setRuns([null, null]);
    get(idA, 0);
    get(idB, 1);
    return () => {
      alive = false;
    };
  }, [idA, idB]);
  return runs;
}

function RunRow({ a, color }) {
  const te = trainingEffect(a.training_effect_label);
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 short:py-1.5 border-b border-line/50 last:border-0">
      <div className="min-w-0">
        <div className="font-mono text-base short:text-sm truncate" style={{ color }}>
          {a.activity_name || "Run"}
        </div>
        <div className="font-mono text-sm text-muted">{formatDateShort(a.start_time)}</div>
      </div>
      <div className="flex items-baseline gap-5 short:gap-4 shrink-0">
        <span className="stat-mono text-2xl short:text-xl" style={{ color }}>
          {formatDistanceKm(a.distance)}
          <span className="text-sm text-muted ml-1">km</span>
        </span>
        <span className="stat-mono text-xl short:text-lg text-chalk w-[7.5ch] text-right">
          {formatPace(a.pace).replace(" /km", "")}
        </span>
        {te && (
          <span className="font-mono text-sm px-2 py-0.5 rounded" style={{ color: te.color, background: "var(--color-surface-2)" }}>
            {te.text}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The last few runs for each runner, side by side. The kiosk dropped the full
 * activity log (nothing to click on a display), but "what did we run lately" is
 * exactly what a wall display should answer — so this shows it as a few large
 * rows rather than a dense scrollable table.
 */
export default function RecentRunsSlide({ users }) {
  const runs = useRecentRuns(users);

  if (!runs[0] && !runs[1]) return <Loading what="recent runs" />;

  return (
    <Slide>
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 short:gap-3">
        {(users || []).slice(0, 2).map((u, i) => {
          const color = RUNNER_COLORS[i];
          const list = runs[i];
          return (
            <div key={u.id} className="bg-surface border border-line rounded-xl p-4 short:p-3 flex flex-col min-h-0">
              <div className="mb-2 short:mb-1 shrink-0">
                <RunnerTag users={users} i={i} size="lg" />
              </div>
              <div className="flex-1 min-h-0 flex flex-col justify-center">
                {list && list.length ? (
                  list.map((a) => <RunRow key={a.id} a={a} color={color} />)
                ) : (
                  <p className="font-mono text-base text-muted">No recent runs</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Slide>
  );
}
