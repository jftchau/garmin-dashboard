import { fetchThisWeek } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, GlassStat, Loading } from "../glass.jsx";
import HRZoneDoughnut from "../HRZoneDoughnut.jsx";
import { RUNNER_RGB } from "../../utils.js";

// "45 min" / "3.3 h": "44:40" reads as a pace on this dashboard, and a big
// week as "12 h 30 min" would overflow the card at caption size.
function hoursMins(secs) {
  const m = Math.round(secs / 60);
  return m < 60 ? `${m} min` : `${(m / 60).toFixed(1)} h`;
}

const totalSecs = (zones) => Object.values(zones || {}).reduce((s, v) => s + v, 0);

// Share of the week's heart-rate time spent easy (zones 1–2): the one number
// that says whether the week was built on easy running.
function easyShare(zones) {
  const total = totalSecs(zones);
  if (!total) return null;
  return Math.round((((zones["1"] || 0) + (zones["2"] || 0)) / total) * 100);
}

/**
 * Heart-rate zones this week, head-to-head. The headline is the easy share;
 * the doughnut and its five-row key are the walk-closer detail.
 */
export default function HRZonesSlide({ users }) {
  const weeks = useTwoUsers(fetchThisWeek, users);
  if (!weeks[0] && !weeks[1]) return <Loading what="heart rate zones" />;

  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const zones = weeks[i]?.heart_rate_zone_seconds || {};
        const secs = totalSecs(zones);
        const easy = easyShare(zones);
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            <div>
              <GlassStat value={easy ?? "—"} unit={easy != null ? "%" : null} size="lg" />
              <div className="t-caption text-soft mt-4 whitespace-nowrap">
                {secs ? `easy, of ${hoursMins(secs)}` : "no heart rate yet"}
              </div>
            </div>
            <HRZoneDoughnut zoneSeconds={zones} rgb={RUNNER_RGB[i]} />
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
