import { fetchRunningForm } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, LabelStat, Loading } from "../glass.jsx";

// The four form metrics worth showing side by side, with how to render each
// from the raw average the API returns.
//
// `good` is the band Garmin's own running-dynamics scale calls the top ~30% of
// runners, so a number on this slide can be read without knowing the metric:
// cadence high, ground contact and vertical oscillation low. `higherIsBetter`
// says which side of the band is the good side.
//
// Stride length deliberately has no band — it scales with leg length and pace,
// so there is no population range that means anything for one runner.
const METRICS = [
  { key: "cadence_spm", label: "Cadence · spm", fmt: (v) => Math.round(v), good: [174, 183], band: "174–183", higherIsBetter: true },
  { key: "stride_cm", label: "Stride · cm", fmt: (v) => Math.round(v) },
  { key: "ground_contact_ms", label: "Contact · ms", fmt: (v) => Math.round(v), good: [208, 240], band: "208–240", higherIsBetter: false },
  { key: "vertical_osc_cm", label: "Bounce · cm", fmt: (v) => (v >= 10 ? Math.round(v) : v.toFixed(1)), good: [6.7, 8.3], band: "6.7–8.3", higherIsBetter: false },
];

// Where a value sits against its band, as one short line. Inside the band, or
// outside it the good way, is quiet text; outside it the way that costs you
// is brighter text. Not the alert hue: that is kept for genuine extremes, and
// a few steps per minute of cadence isn't one.
function verdict(m, v) {
  if (!m.good) return { text: "varies with height", color: "var(--color-muted)" };
  if (v == null) return { text: " " };
  const [lo, hi] = m.good;
  if (v >= lo && v <= hi) return { text: `good · ${m.band}`, color: "var(--color-muted)" };
  const okSide = m.higherIsBetter ? v > hi : v < lo;
  return {
    text: `${v > hi ? "high" : "low"} · ${m.band}`,
    color: okSide ? "var(--color-muted)" : "var(--color-chalk)",
  };
}

/**
 * Running form, head-to-head — cadence, stride, ground contact and vertical
 * oscillation, averaged over each runner's recent runs. Tier C: dense by
 * nature, so the numbers take stat-md and the bands are walk-closer notes.
 */
export default function RunningFormSlide({ users }) {
  // Wrap so the user id lands in fetchRunningForm's userId param — passing the
  // bare fn would put the id in the leading `runs` argument instead.
  const forms = useTwoUsers((uid) => fetchRunningForm(30, uid), users);

  if (!forms[0] && !forms[1]) return <Loading what="running form" />;

  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const avgs = forms[i]?.averages || {};
        return (
          <GlassCard key={u.id} runner={i}>
            <div className="flex items-center justify-between gap-4">
              <RunnerHead users={users} i={i} />
              <span className="t-meta text-muted whitespace-nowrap">{forms[i]?.runs_counted ?? 0} runs</span>
            </div>
            {/* A half-card cell is 186px: three digits at stat-md fit, "10.2"
                doesn't. Hence stride in cm, and bounce rounded from 10 cm. */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              {METRICS.map((m) => {
                const v = avgs[m.key];
                const vd = verdict(m, v);
                return (
                  <LabelStat
                    key={m.key}
                    label={m.label}
                    value={v != null ? m.fmt(v) : "—"}
                    note={vd.text}
                    noteColor={vd.color}
                  />
                );
              })}
            </div>
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
