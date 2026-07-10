import { RUNNER_COLORS, runnerName } from "../utils.js";

// Head-to-head metric table: rows of metrics, one color-coded column per runner.
// rows: [{ label, values: [runnerAValue, runnerBValue] }]. Used by several tabs
// (This Week totals, History summary, Insights current status).
export default function CompareTable({ users, rows, big = false }) {
  const runners = (users || []).slice(0, 2);
  const valueSize = big ? "text-2xl short:text-xl" : "text-lg";

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-line">
          <th className="text-left py-2 short:py-1 pr-3 font-mono text-[11px] uppercase tracking-wide text-muted font-medium">
            Metric
          </th>
          {runners.map((u, i) => (
            <th
              key={u.id}
              className="text-right py-2 short:py-1 pl-3 font-mono text-xs font-semibold"
              style={{ color: RUNNER_COLORS[i] }}
            >
              {runnerName(users, i)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-line/50">
            <td className="py-2 short:py-1 pr-3 font-mono text-xs uppercase tracking-wide text-muted whitespace-nowrap">
              {r.label}
            </td>
            {runners.map((u, i) => (
              <td
                key={u.id}
                className={`py-2 short:py-1 pl-3 text-right stat-mono ${valueSize} whitespace-nowrap`}
                style={{ color: RUNNER_COLORS[i] }}
              >
                {r.values[i] ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
