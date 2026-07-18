import { fetchThisWeek } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { Loading, RunnerTag } from "../Slide.jsx";
import HRZoneDoughnut from "../HRZoneDoughnut.jsx";
import { formatDuration } from "../../utils.js";

const totalSecs = (zones) =>
  Object.values(zones || {}).reduce((s, v) => s + v, 0);

export default function HRZonesSlide({ users }) {
  const weeks = useTwoUsers(fetchThisWeek, users);

  if (!weeks[0] && !weeks[1]) return <Loading what="heart rate zones" />;

  return (
    <Slide>
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 short:gap-3">
        {(users || []).slice(0, 2).map((u, i) => {
          const secs = totalSecs(weeks[i]?.heart_rate_zone_seconds);
          return (
            <div
              key={u.id}
              className="bg-surface border border-line rounded-xl p-4 short:p-3 flex flex-col min-h-0"
            >
              <div className="flex items-baseline justify-between mb-1 shrink-0">
                <RunnerTag users={users} i={i} size="lg" />
                <span className="stat-mono text-xl short:text-lg text-muted">
                  {secs ? formatDuration(secs) : "—"}
                </span>
              </div>
              <div className="flex-1 min-h-0">
                <HRZoneDoughnut zoneSeconds={weeks[i]?.heart_rate_zone_seconds} height="100%" />
              </div>
            </div>
          );
        })}
      </div>
    </Slide>
  );
}
