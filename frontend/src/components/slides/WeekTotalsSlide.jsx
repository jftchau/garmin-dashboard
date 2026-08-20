import { fetchThisWeek } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, RunnerTag } from "../Slide.jsx";
import { formatPace, RUNNER_COLORS } from "../../utils.js";

// Week totals run to hours, and H:MM:SS is both too long to set at headline
// size and more precision than a weekly total deserves — so hours:minutes, with
// the unit moved into the label to buy the digits the full column width.
function hoursMinutes(sec) {
  if (sec == null || isNaN(sec)) return "—";
  const total = Math.round(sec / 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Signed week-over-week change in running volume, e.g. "+4.2 km vs last week".
function Delta({ week }) {
  if (!week || week.prev_total_distance_km == null) return null;
  const diff = +(week.total_distance_km - week.prev_total_distance_km).toFixed(1);
  // No red/green here: the sign already says which way it went, and a lighter
  // week isn't a failure — coloring it as one put two more hues on the slide.
  const color = "var(--color-chalk)";
  return (
    <div className="font-mono text-lg short:text-base text-muted mt-1">
      <span style={{ color }}>
        {diff >= 0 ? "+" : ""}
        {diff} km
      </span>{" "}
      vs last week ({week.prev_total_distance_km} km)
    </div>
  );
}

export default function WeekTotalsSlide({ users }) {
  const weeks = useTwoUsers(fetchThisWeek, users);
  if (!weeks[0] && !weeks[1]) return <Loading what="this week" />;

  const range = weeks[0] || weeks[1];

  return (
    <Slide className="space-y-3 short:space-y-2">
      <p className="font-mono text-lg short:text-base text-muted shrink-0">
        {range?.week_start} → {range?.week_end}
      </p>

      {(users || []).slice(0, 2).map((u, i) => {
        const w = weeks[i];
        const color = RUNNER_COLORS[i];
        return (
          <div key={u.id} className="bg-surface border border-line rounded-xl p-5 short:p-3 flex-1 min-h-0 flex flex-col justify-center">
            <div className="flex items-baseline justify-between gap-3 mb-3 short:mb-2">
              <RunnerTag users={users} i={i} size="xl" />
              <Delta week={w} />
            </div>
            {/* Units live in the labels here (not beside the value) so each
                number gets the whole column and can be set as large as the
                widest case — "23.6 km" — allows.

                Spread, not a 4-column grid: equal columns sized every stat to
                the widest one, which left "RUNS 2" trailing most of a column of
                empty card. justify-between sizes each stat to its own content
                and splits the leftover space into equal gaps. */}
            <div className="flex items-start justify-between gap-4 short:gap-3">
              <BigStat
                label="Distance"
                value={w?.total_distance_km != null ? w.total_distance_km.toFixed(1) : "—"}
                unit="km"
                color={color}
                size="hero"
              />
              <BigStat label="Time · h:mm" value={w ? hoursMinutes(w.total_duration_sec) : "—"} color={color} size="hero" />
              <BigStat
                label="Avg pace · /km"
                value={w?.avg_pace_sec_per_km ? formatPace(w.avg_pace_sec_per_km).replace(" /km", "") : "—"}
                color={color}
                size="hero"
              />
              <BigStat label="Runs" value={w?.activities?.length ?? "—"} color={color} size="hero" />
            </div>
          </div>
        );
      })}
    </Slide>
  );
}
