import { Suspense, lazy } from "react";
import {
  formatPace,
  formatDuration,
  formatDistanceKm,
  formatDateShort,
  formatPower,
  formatTemp,
  formatCalories,
  formatHydration,
  formatStride,
  formatMs,
  formatCm,
  formatPercent,
} from "../utils.js";
import TrainingEffectBadge from "./TrainingEffectBadge.jsx";

const RunMap = lazy(() => import("./RunMap.jsx"));

export default function ActivityModal({ activity, onClose }) {
  if (!activity) return null;

  const title = activity.activity_name || `${formatDistanceKm(activity.distance)} km run`;
  const subtitle = [
    `${formatDistanceKm(activity.distance)} km`,
    activity.location_name,
    formatDateShort(activity.start_time),
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-line">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="heading-display text-lg text-volt">{title}</h3>
              <TrainingEffectBadge label={activity.training_effect_label} />
            </div>
            <p className="text-muted text-sm font-mono mt-0.5">{subtitle}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-chalk text-xl leading-none">
            ×
          </button>
        </div>

        {/* Primary + secondary stat rows */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-line">
          <Stat label="Time" value={formatDuration(activity.duration)} />
          <Stat label="Pace" value={formatPace(activity.pace)} />
          <Stat label="Avg HR" value={activity.heart_rate_avg ?? "—"} />
          <Stat label="Cadence" value={activity.cadence_avg ? `${Math.round(activity.cadence_avg)} spm` : "—"} />
          <Stat label="Avg Power" value={formatPower(activity.avg_power)} />
          <Stat label="Calories" value={formatCalories(activity.calories)} />
          <Stat label="Elev. gain" value={activity.elevation_gain != null ? `${Math.round(activity.elevation_gain)} m` : "—"} />
          <Stat label="Temp" value={formatTemp(activity.temperature)} />
        </div>

        {/* Running dynamics */}
        <div className="p-4 border-b border-line">
          <h4 className="text-xs uppercase tracking-wide text-muted mb-2 font-mono">Running dynamics</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <Stat label="Ground contact" value={formatMs(activity.avg_ground_contact_time)} />
            <Stat label="Stride length" value={formatStride(activity.avg_stride_length)} />
            <Stat label="Vert. osc." value={formatCm(activity.avg_vertical_oscillation)} />
            <Stat label="Vert. ratio" value={formatPercent(activity.avg_vertical_ratio)} />
          </div>
        </div>

        {/* Footer stat line */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-line">
          <Stat label="VO2max" value={activity.vo2max ?? "—"} />
          <Stat label="Aerobic TE" value={activity.training_effect_aerobic != null ? activity.training_effect_aerobic.toFixed(1) : "—"} />
          <Stat label="Hydration" value={formatHydration(activity.water_estimated)} />
          <Stat label="Steps" value={activity.steps != null ? activity.steps.toLocaleString() : "—"} />
        </div>

        <div className="p-4">
          <Suspense
            fallback={
              <div className="h-[260px] flex items-center justify-center text-muted text-sm font-mono">
                Loading map…
              </div>
            }
          >
            <RunMap polyline={activity.polyline} />
          </Suspense>
        </div>

        {activity.splits && activity.splits.length > 0 && (
          <div className="p-4 border-t border-line">
            <h4 className="text-xs uppercase tracking-wide text-muted mb-2 font-mono">Splits</h4>
            <div className="grid grid-cols-4 gap-2 text-xs font-mono">
              {activity.splits.map((s, i) => (
                <div key={i} className="bg-surface-2 rounded px-2 py-1 text-center">
                  <div className="text-muted">{i + 1} km</div>
                  <div className="text-chalk">{formatPace(s.avg_pace)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="stat-mono text-volt text-lg">{value}</div>
      <div className="text-muted text-[11px] uppercase tracking-wide">{label}</div>
    </div>
  );
}
