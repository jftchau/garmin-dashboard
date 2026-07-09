import { useMemo, useState } from "react";
import { formatPace, formatDuration, formatDistanceKm, formatDateShort } from "../utils.js";
import TrainingEffectBadge from "./TrainingEffectBadge.jsx";

const COLUMNS = [
  { key: "start_time", label: "Date" },
  { key: "activity_name", label: "Run" },
  { key: "distance", label: "Distance" },
  { key: "duration", label: "Time" },
  { key: "pace", label: "Pace" },
  { key: "heart_rate_avg", label: "Avg HR" },
];

export default function ActivityTable({ activities, onSelect }) {
  const [sortKey, setSortKey] = useState("start_time");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const list = [...(activities || [])];
    list.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return list;
  }, [activities, sortKey, asc]);

  function toggleSort(key) {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  if (!activities || activities.length === 0) {
    return <p className="text-muted text-sm font-mono py-6">No runs logged yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted border-b border-line">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className="py-2 px-3 font-mono text-xs uppercase tracking-wide cursor-pointer hover:text-volt select-none"
              >
                {col.label} {sortKey === col.key ? (asc ? "↑" : "↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr
              key={a.id}
              onClick={() => onSelect && onSelect(a)}
              className="border-b border-line/60 hover:bg-surface cursor-pointer"
            >
              <td className="py-2 px-3 font-mono whitespace-nowrap">{formatDateShort(a.start_time)}</td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[160px]">{a.activity_name || "—"}</span>
                  <TrainingEffectBadge label={a.training_effect_label} />
                </div>
              </td>
              <td className="py-2 px-3 font-mono text-volt whitespace-nowrap">{formatDistanceKm(a.distance)} km</td>
              <td className="py-2 px-3 font-mono">{formatDuration(a.duration)}</td>
              <td className="py-2 px-3 font-mono">{formatPace(a.pace)}</td>
              <td className="py-2 px-3 font-mono">{a.heart_rate_avg ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
