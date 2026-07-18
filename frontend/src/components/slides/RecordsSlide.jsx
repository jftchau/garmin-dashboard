import { fetchPersonalRecords, fetchRacePredictions } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { Loading } from "../Slide.jsx";
import { formatDuration, formatDateShort, RUNNER_COLORS, runnerName } from "../../utils.js";

// Our PR distance keys mapped to the race-prediction fields.
const PREDICTION_KEY = {
  "5K": "time_5k",
  "10K": "time_10k",
  HALF: "time_half_marathon",
  MARATHON: "time_marathon",
};

/**
 * Personal bests for a subset of distances.
 *
 * The five distances used to share one slide, which forced small tiles. Split
 * across two slides (`distances` prop) each tile gets roughly double the width,
 * so the times are legible from across the room.
 */
export default function RecordsSlide({ users, distances }) {
  const [recA, recB] = useTwoUsers(fetchPersonalRecords, users);
  const [predA, predB] = useTwoUsers(fetchRacePredictions, users);

  if (!recA && !recB) return <Loading what="records" />;

  const byDist = [recA, recB].map((rec) => Object.fromEntries((rec || []).map((r) => [r.distance_name, r])));
  const preds = [predA, predB];
  const template = (recA || recB).filter((r) => distances.includes(r.distance_name));

  return (
    <Slide>
      <div
        className={`flex-1 min-h-0 grid gap-4 short:gap-3 ${
          template.length > 2 ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        {template.map((t) => {
          const dist = t.distance_name;
          const predKey = PREDICTION_KEY[dist];
          return (
            <div
              key={dist}
              className="bg-surface border border-line rounded-xl p-5 short:p-3 text-center flex flex-col justify-center min-h-0"
            >
              <div className="heading-display text-lg short:text-base uppercase tracking-widest text-muted mb-4 short:mb-3">
                {t.label}
              </div>
              <div className="space-y-4 short:space-y-3">
                {(users || []).slice(0, 2).map((u, i) => {
                  const r = byDist[i][dist];
                  const predicted = predKey && preds[i] ? preds[i][predKey] : null;
                  return (
                    <div key={u.id} className={i === 1 ? "pt-4 short:pt-3 border-t border-line/60" : ""}>
                      <div
                        className="font-mono text-xs uppercase tracking-widest mb-1"
                        style={{ color: RUNNER_COLORS[i] }}
                      >
                        {runnerName(users, i)}
                      </div>
                      <div
                        className="stat-mono text-5xl short:text-4xl leading-none"
                        style={{ color: RUNNER_COLORS[i] }}
                      >
                        {r?.best_time_sec ? formatDuration(r.best_time_sec) : "—"}
                      </div>
                      <div className="text-muted text-xs font-mono mt-1.5">
                        {r?.achieved_at ? formatDateShort(r.achieved_at) : "—"}
                        {predicted != null && <span> · pred {formatDuration(predicted)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Slide>
  );
}
