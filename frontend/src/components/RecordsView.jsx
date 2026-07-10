import { fetchPersonalRecords, fetchRacePredictions } from "../api.js";
import { useTwoUsers } from "../useTwoUsers.js";
import { formatDuration, formatDateShort, RUNNER_COLORS, runnerName } from "../utils.js";

// Map our PR distance keys to the race-prediction fields.
const PREDICTION_KEY = {
  "5K": "time_5k",
  "10K": "time_10k",
  HALF: "time_half_marathon",
  MARATHON: "time_marathon",
};

export default function RecordsView({ users }) {
  const [recA, recB] = useTwoUsers(fetchPersonalRecords, users);
  const [predA, predB] = useTwoUsers(fetchRacePredictions, users);

  if (!recA && !recB) {
    return <p className="text-muted font-mono p-6">Loading…</p>;
  }

  // Use whichever runner loaded as the canonical distance list; look up the other.
  const template = recA || recB;
  const bByDist = Object.fromEntries((recB || []).map((r) => [r.distance_name, r]));
  const aByDist = Object.fromEntries((recA || []).map((r) => [r.distance_name, r]));
  const preds = [predA, predB];

  return (
    <div className="p-4 sm:p-6 short:p-3 space-y-4 short:space-y-3">
      <h2 className="heading-display text-xl short:text-lg text-volt">Personal records</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {template.map((t) => {
          const dist = t.distance_name;
          const recs = [aByDist[dist], bByDist[dist]];
          const predKey = PREDICTION_KEY[dist];
          return (
            <div key={dist} className="bg-surface border border-line rounded-lg p-4 text-center">
              <div className="text-muted text-sm uppercase tracking-wide font-mono mb-4">{t.label}</div>
              <div className="space-y-4">
                {recs.map((r, i) => {
                  const predicted = predKey && preds[i] ? preds[i][predKey] : null;
                  return (
                    <div key={i} className={i === 1 ? "pt-4 border-t border-line/60" : ""}>
                      <div className="font-mono text-[11px] uppercase tracking-wide mb-1" style={{ color: RUNNER_COLORS[i] }}>
                        {runnerName(users, i)}
                      </div>
                      <div className="stat-mono text-2xl" style={{ color: RUNNER_COLORS[i] }}>
                        {r && r.best_time_sec ? formatDuration(r.best_time_sec) : "—"}
                      </div>
                      <div className="text-muted text-[11px] font-mono mt-1">
                        {r && r.achieved_at ? formatDateShort(r.achieved_at) : "—"}
                        {predicted != null && (
                          <div className="mt-0.5">pred {formatDuration(predicted)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-muted text-xs font-mono">
        Best times from each runner's full history (±3% of the target). "pred" is Garmin's current race estimate.
      </p>
    </div>
  );
}
