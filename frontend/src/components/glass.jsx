import { RUNNER_COLORS, runnerName } from "../utils.js";

// Building blocks for the v2 "dark glass" slides (design/README.md).
//
// Sizes here are fixed px from the type scale in index.css (.t-*), derived for
// a 1024×600 panel read from 2.25 m. Content budget: 549px under the 48px
// header and 3px progress rule; this frame spends 18px above and 28px below,
// with 40px gutters and 20px between cards.

// The slide body. `cols` lays cards side by side (head-to-head = 2).
export function GlassSlide({ children, cols = 1, className = "" }) {
  return (
    <div
      className={`flex-1 min-h-0 grid gap-5 px-10 pt-[18px] pb-7 ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

// A glass card. `runner` (0 | 1) lights it from that runner's outer corner;
// omit it for a neutral glow. `tight` is the four-stat padding.
export function GlassCard({ runner, tight = false, children, className = "" }) {
  const glow = runner === 0 ? "glass-a" : runner === 1 ? "glass-b" : "glass-n";
  const pad = tight ? "px-7 py-[22px]" : "px-8 py-7";
  return <div className={`glass ${glow} ${pad} flex flex-col justify-between ${className}`}>{children}</div>;
}

// The runner's dot and name: identity lives in the dot (a lit mark, with its
// halo) and the card's light. The name itself stays neutral text.
export function RunnerHead({ users, i }) {
  return (
    <div className="flex items-center gap-[14px] min-w-0">
      <span
        className="w-[22px] h-[22px] rounded-full shrink-0"
        style={{ background: RUNNER_COLORS[i], boxShadow: `0 0 22px ${glowRgba(i)}` }}
      />
      <span className="t-label truncate">{runnerName(users, i)}</span>
    </div>
  );
}

const glowRgba = (i) => (i === 0 ? "rgb(255 145 71 / 0.6)" : "rgb(122 167 255 / 0.6)");

// A number with its unit beside it, top-aligned. Numbers are always text-1,
// whoever they belong to (orange text on glass is only ~5.6:1).
//
// A head-to-head card (396px inside) fits three digits plus "km" at stat-xl
// (88.8 km leaves 7px). A fourth digit (1088, 100.0) steps down to stat-lg
// rather than overflow.
export function GlassStat({ value, unit, size = "xl" }) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "").length;
  const step = size === "xl" && digits >= 4 ? "lg" : size;
  const cls = { hero: "t-hero", xl: "t-stat-xl", lg: "t-stat-lg", md: "t-stat-md" }[step];
  return (
    <div className="flex items-start gap-[10px] min-w-0">
      <span className={cls}>{value ?? "—"}</span>
      {unit && <span className="t-unit mt-[6px]">{unit}</span>}
    </div>
  );
}

// A row of small supporting figures in the walk-closer tier: value in caption
// size, its name beneath in meta. For whoever is standing at the screen.
export function MiniStats({ items }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <div className="t-caption text-soft whitespace-nowrap">{it.value ?? "—"}</div>
          <div className="t-meta text-muted mt-2 whitespace-nowrap">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
