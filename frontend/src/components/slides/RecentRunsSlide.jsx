import { useEffect, useState } from "react";
import { fetchActivities } from "../../api.js";
import { GlassSlide, GlassCard, RunnerHead, GlassStat, Loading } from "../glass.jsx";
import { formatPace, trainingEffect } from "../../utils.js";

// "Sat 16 Aug" — a run's identity on this slide. Every run is logged from the
// same place and comes back "Jing'an Running", so the date is what differs.
function runDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

const km = (meters) => (meters == null ? "—" : (meters / 1000).toFixed(1));
const pace = (s) => formatPace(s).replace(" /km", "");

const N = 4; // the latest run, plus three before it

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

/**
 * Latest runs, head-to-head. The most recent run is the headline (its
 * distance at stat-lg, pace beneath); the three before it are a walk-closer
 * list. Five equal rows per runner used to force every number down to ~30px.
 */
export default function RecentRunsSlide({ users }) {
  const runs = useRecentRuns(users);
  if (!runs[0] && !runs[1]) return <Loading what="recent runs" />;

  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const [latest, ...older] = runs[i] || [];
        const te = latest ? trainingEffect(latest.training_effect_label) : null;
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            {latest ? (
              <div>
                <div className="t-meta text-muted whitespace-nowrap mb-4">
                  {runDate(latest.start_time)}
                  {te && ` · ${te.text}`}
                </div>
                <GlassStat value={km(latest.distance)} unit="km" size="lg" />
                <div className="t-caption text-soft mt-4 whitespace-nowrap">{pace(latest.pace)} /km</div>
              </div>
            ) : (
              <p className="t-caption text-muted">No recent runs</p>
            )}
            <div className="flex flex-col gap-3">
              {older.map((a) => (
                <div key={a.id} className="flex items-baseline gap-4 whitespace-nowrap">
                  <span className="t-meta text-muted w-[132px] shrink-0">{runDate(a.start_time)}</span>
                  <span className="t-caption text-soft">{km(a.distance)}</span>
                  <span className="t-meta text-muted">km</span>
                  <span className="t-caption text-soft ml-auto">{pace(a.pace)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
