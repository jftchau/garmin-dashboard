import { useEffect, useState } from "react";
import { fetchPersonalRecords, fetchRacePredictions } from "../api.js";
import { formatDuration, formatDateShort } from "../utils.js";

// Map our PR distance keys to the race-prediction fields.
const PREDICTION_KEY = {
  "5K": "time_5k",
  "10K": "time_10k",
  HALF: "time_half_marathon",
  MARATHON: "time_marathon",
};

export default function RecordsView({ onSelectActivity }) {
  const [records, setRecords] = useState(null);
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    fetchPersonalRecords().then(setRecords);
    fetchRacePredictions().then(setPredictions);
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h2 className="heading-display text-xl text-volt">Personal records</h2>

      {!records ? (
        <p className="text-muted font-mono">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {records.map((r) => {
            const predKey = PREDICTION_KEY[r.distance_name];
            const predicted = predictions && predKey ? predictions[predKey] : null;
            const delta =
              predicted != null && r.best_time_sec != null ? predicted - r.best_time_sec : null;
            return (
              <div
                key={r.distance_name}
                onClick={() => r.activity_id && onSelectActivity && onSelectActivity({ id: r.activity_id })}
                className={`bg-surface border border-line rounded-lg p-4 text-center ${
                  r.activity_id ? "cursor-pointer hover:border-volt" : "opacity-50"
                }`}
              >
                <div className="text-muted text-xs uppercase tracking-wide font-mono mb-2">{r.label}</div>
                <div className="stat-mono text-2xl text-volt">
                  {r.best_time_sec ? formatDuration(r.best_time_sec) : "—"}
                </div>
                <div className="text-muted text-[11px] font-mono mt-1">
                  {r.achieved_at ? formatDateShort(r.achieved_at) : "Not yet set"}
                </div>

                {predicted != null && (
                  <div className="mt-3 pt-3 border-t border-line">
                    <div className="text-muted text-[10px] uppercase tracking-wide font-mono">Predicted</div>
                    <div className="stat-mono text-sm text-chalk">{formatDuration(predicted)}</div>
                    {delta != null && (
                      <div
                        className="text-[10px] font-mono mt-0.5"
                        style={{ color: delta < 0 ? "var(--color-zone2)" : "var(--color-muted)" }}
                      >
                        {delta < 0
                          ? `${formatDuration(-delta)} faster`
                          : delta > 0
                          ? `${formatDuration(delta)} slower`
                          : "on PR"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="lane-rule" />

      <p className="text-muted text-sm font-mono">
        PRs are recalculated from your full run history (closest match within ±3% of the target).
        Predicted times are Garmin's current race estimates — a green gap means Garmin thinks you can
        beat your logged PR.
      </p>
    </div>
  );
}
