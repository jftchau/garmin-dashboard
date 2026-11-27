import { fetchThisWeek } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, GlassStat, MiniStats, Loading } from "../glass.jsx";
import { formatPace, signed } from "../../utils.js";

// Week totals run to hours, and H:MM:SS is more precision than a weekly total
// deserves — so hours:minutes.
function hoursMinutes(sec) {
  if (sec == null || isNaN(sec)) return "—";
  const total = Math.round(sec / 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Signed week-over-week change in running volume, e.g. "+4.2 vs last week".
// No red/green: the sign already says which way it went, and a lighter week
// isn't a failure. The unit is the number's own ("km" beside it).
function deltaText(week) {
  if (!week || week.prev_total_distance_km == null) return null;
  const diff = +(week.total_distance_km - week.prev_total_distance_km).toFixed(1);
  return `${signed(diff)} vs last week`;
}

// Head-to-head, v2 glass: one number per runner (distance, at stat-xl), with
// the week's runs, time and pace below it in the walk-closer tier. Jeffrey's
// card on the left lit from the top-left, Eugenia's on the right from the
// bottom-right (design/README.md, "The room").
export default function WeekTotalsSlide({ users }) {
  const weeks = useTwoUsers(fetchThisWeek, users);
  if (!weeks[0] && !weeks[1]) return <Loading what="this week" />;

  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const w = weeks[i];
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            <div>
              <GlassStat value={w?.total_distance_km != null ? w.total_distance_km.toFixed(1) : "—"} unit="km" />
              <div className="t-caption text-soft mt-5 whitespace-nowrap">{deltaText(w) ?? " "}</div>
            </div>
            <MiniStats
              items={[
                { label: "runs", value: w?.activities?.length ?? "—" },
                { label: "hours", value: w ? hoursMinutes(w.total_duration_sec) : "—" },
                {
                  label: "pace /km",
                  value: w?.avg_pace_sec_per_km ? formatPace(w.avg_pace_sec_per_km).replace(" /km", "") : "—",
                },
              ]}
            />
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
