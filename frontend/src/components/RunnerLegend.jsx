import { RUNNER_COLORS, runnerName } from "../utils.js";

// Persistent header legend mapping each runner to their color, so every chart
// and comparison stat across the tabs is readable at a glance.
export default function RunnerLegend({ users }) {
  if (!users || users.length === 0) return null;
  return (
    <div className="flex items-center gap-3 font-mono text-xs">
      {users.slice(0, 2).map((u, i) => (
        <span key={u.id} className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: RUNNER_COLORS[i] }}
          />
          <span className="text-chalk">{runnerName(users, i)}</span>
        </span>
      ))}
    </div>
  );
}
