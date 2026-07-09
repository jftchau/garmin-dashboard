import { useDataSource } from "../useDataSource.js";

// Header badge that tells you at a glance whether the numbers on screen are
// live backend data or the mock fallback (shown when the backend is
// unreachable). Mock is styled loud on purpose — mock values can otherwise
// look like real, wrong data.
export default function DataSourceBadge() {
  const source = useDataSource();

  if (source === "unknown") return null;

  const mock = source === "mock";
  const label = mock ? "Demo data" : "Live data";

  return (
    <span
      title={
        mock
          ? "Backend unreachable — showing built-in sample data, not your Garmin activity."
          : "Connected to the backend — showing your synced Garmin data."
      }
      className={`inline-flex items-center gap-1.5 rounded-full font-mono text-[11px] px-2.5 py-1 border ${
        mock
          ? "bg-zone4/15 border-zone4 text-zone4"
          : "bg-surface border-line text-muted"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${mock ? "bg-zone4" : "bg-zone2"}`}
      />
      {label}
    </span>
  );
}
