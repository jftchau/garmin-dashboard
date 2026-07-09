import { trainingEffect } from "../utils.js";

// Small colored pill for a run's Garmin training-effect label
// (Recovery / Base / Tempo / Threshold / VO2Max / ...).
export default function TrainingEffectBadge({ label, className = "" }) {
  const te = trainingEffect(label);
  if (!te) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${className}`}
      style={{ color: te.color, border: `1px solid ${te.color}`, opacity: 0.95 }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: te.color }} />
      {te.text}
    </span>
  );
}
