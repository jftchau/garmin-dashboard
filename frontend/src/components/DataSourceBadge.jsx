import { useDataSource } from "../useDataSource.js";

// Header badge that warns when the numbers on screen are the mock fallback
// (shown when the backend is unreachable). Loud on purpose — mock values can
// otherwise look like real, wrong data.
export default function DataSourceBadge() {
  const source = useDataSource();

  // Live data is the normal case and says nothing from across the room, so only
  // the alert ("Demo data") is shown: the one alert hue, as a chip with a glyph
  // and a word.
  if (source !== "mock") return null;

  return (
    <span
      title="Backend unreachable — showing built-in sample data, not your Garmin activity."
      className="t-meta inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-ember/20 border border-ember text-chalk font-semibold whitespace-nowrap"
    >
      ⚠ Demo data
    </span>
  );
}
