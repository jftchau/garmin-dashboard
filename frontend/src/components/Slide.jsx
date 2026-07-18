import { RUNNER_COLORS, runnerName } from "../utils.js";

// Shared furniture for the wall-display slides.
//
// The dashboard is read from several metres away, so every slide carries ONE
// idea at a large size rather than a dense grid of panels. These helpers keep
// the type scale consistent: labels stay small and muted, values are huge.

// Slides are flex columns that fill the space the header and nav leave behind.
// Children marked `flex-1 min-h-0` (usually the chart card) absorb whatever is
// left, so a graphic is always as large as the screen allows — on the Pi and on
// a desktop monitor alike, without per-slide pixel heights to keep in sync.
export default function Slide({ children, className = "" }) {
  return (
    <div className={`flex-1 min-h-0 flex flex-col px-5 sm:px-6 short:px-4 pb-4 short:pb-2 ${className}`}>
      {children}
    </div>
  );
}

// Card wrapper for a graphic. `grow` makes it claim the leftover height and
// gives its children a definite height to size against.
export function Panel({ title, right, children, className = "", grow = false }) {
  return (
    <div
      className={`bg-surface border border-line rounded-xl p-4 short:p-3 ${
        grow ? "flex-1 min-h-0 flex flex-col" : ""
      } ${className}`}
    >
      {(title || right) && (
        <div className="flex items-baseline justify-between mb-3 short:mb-2 gap-3 shrink-0">
          {title && (
            <h3 className="heading-display text-base short:text-sm uppercase tracking-wide text-muted">
              {title}
            </h3>
          )}
          {right}
        </div>
      )}
      {grow ? <div className="flex-1 min-h-0">{children}</div> : children}
    </div>
  );
}

// A single headline number. `size` steps the value type; labels stay constant so
// the eye can scan a row of these without re-anchoring.
export function BigStat({ label, value, unit, color = "var(--color-chalk)", size = "xl" }) {
  const valueClass = {
    xl: "text-6xl short:text-5xl",
    lg: "text-5xl short:text-4xl",
    md: "text-4xl short:text-3xl",
  }[size];

  return (
    <div className="min-w-0">
      <div className="font-mono text-xs short:text-[11px] uppercase tracking-widest text-muted mb-1">
        {label}
      </div>
      <div className={`stat-mono ${valueClass} leading-none truncate`} style={{ color }}>
        {value ?? "—"}
        {unit && <span className="text-2xl short:text-xl text-muted ml-1.5">{unit}</span>}
      </div>
    </div>
  );
}

// Runner name chip, color-coded to match every chart series on the dashboard.
export function RunnerTag({ users, i, size = "md" }) {
  const cls = size === "lg" ? "text-2xl short:text-xl" : "text-base short:text-sm";
  return (
    <span
      className={`heading-display font-semibold tracking-wide ${cls}`}
      style={{ color: RUNNER_COLORS[i] }}
    >
      {runnerName(users, i)}
    </span>
  );
}

export function Loading({ what = "data" }) {
  return <p className="text-muted font-mono text-lg p-6">Loading {what}…</p>;
}
