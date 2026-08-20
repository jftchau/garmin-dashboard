import { fetchRunningForm } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, RunnerTag } from "../Slide.jsx";
import { RUNNER_COLORS } from "../../utils.js";

// The four form metrics worth showing side by side, with how to render each
// from the raw average the API returns.
//
// `good` is the band Garmin's own running-dynamics scale calls the top ~30% of
// runners, so a number on this slide can be read without knowing the metric:
// cadence high, ground contact and vertical oscillation low. `higherIsBetter`
// says which side of the band is the good side, so a value outside it can be
// labelled "below"/"above" rather than just "off".
//
// Stride length deliberately has no band — it scales with leg length and pace,
// so there is no population range that means anything for one runner.
const METRICS = [
  {
    key: "cadence_spm",
    label: "Cadence",
    unit: "spm",
    fmt: (v) => Math.round(v),
    good: [174, 183],
    guide: "Good 174–183 ↑",
    higherIsBetter: true,
  },
  {
    key: "stride_cm",
    label: "Stride",
    unit: "m",
    fmt: (v) => (v / 100).toFixed(2),
    guide: "Varies with height & pace",  // no meaningful population band
  },
  {
    key: "ground_contact_ms",
    label: "Ground contact",
    unit: "ms",
    fmt: (v) => Math.round(v),
    good: [208, 240],
    guide: "Good 208–240 ↓",
    higherIsBetter: false,
  },
  {
    key: "vertical_osc_cm",
    label: "Vert. oscillation",
    unit: "cm",
    fmt: (v) => v.toFixed(1),
    good: [6.7, 8.3],
    guide: "Good 6.7–8.3 ↓",
    higherIsBetter: false,
  },
];

// Where a value sits against its band, as a short word and a color. Chalk =
// inside the band or past it the good way; ember — the one alert hue — only
// when the number is off in the direction that costs you.
function verdict(m, v) {
  if (v == null || !m.good) return null;
  const [lo, hi] = m.good;
  if (v >= lo && v <= hi) return { text: "in range", color: "var(--color-chalk)" };
  const good = m.higherIsBetter ? v > hi : v < lo; // outside the band, but the good way
  return {
    text: v > hi ? "above range" : "below range",
    color: good ? "var(--color-chalk)" : "var(--color-ember)",
  };
}

/**
 * Running form, head-to-head — cadence, stride, ground contact and vertical
 * oscillation, averaged over each runner's recent runs. This data is captured
 * on every run but was never surfaced; it's the kind of thing two runners in a
 * household actually compare.
 */
export default function RunningFormSlide({ users }) {
  // Wrap so the user id lands in fetchRunningForm's userId param — passing the
  // bare fn would put the id in the leading `runs` argument instead.
  const forms = useTwoUsers((uid) => fetchRunningForm(30, uid), users);

  if (!forms[0] && !forms[1]) return <Loading what="running form" />;

  return (
    <Slide className="space-y-3 short:space-y-2">
      {(users || []).slice(0, 2).map((u, i) => {
        const avgs = forms[i]?.averages || {};
        const color = RUNNER_COLORS[i];
        return (
          <div key={u.id} className="bg-surface border border-line rounded-xl p-5 short:p-3 flex-1 min-h-0 flex flex-col justify-center">
            <div className="flex items-baseline justify-between mb-3 short:mb-2">
              <RunnerTag users={users} i={i} size="xl" />
              <span className="font-mono text-base text-muted">
                avg of last {forms[i]?.runs_counted ?? 0} runs
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 short:gap-3">
              {METRICS.map((m) => {
                const v = avgs[m.key];
                const vd = verdict(m, v);
                return (
                  <div key={m.key}>
                    <BigStat
                      label={m.label}
                      value={v != null ? m.fmt(v) : "—"}
                      unit={v != null ? m.unit : ""}
                      color={color}
                      size="xl"
                    />
                    {/* The reference band, so a number means something to a
                        reader who doesn't already know what good looks like. */}
                    <div className="font-mono text-sm mt-1.5 leading-tight text-muted whitespace-nowrap">
                      {m.guide}
                    </div>
                    <div className="font-mono text-sm leading-tight" style={{ color: vd ? vd.color : "transparent" }}>
                      {vd ? vd.text : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* One footnote for the whole slide, so each metric's band can stay a
          single short line under the number. */}
      <p className="shrink-0 font-mono text-sm text-muted">
        Bands are Garmin's top-30% running-dynamics range · ↑ higher is better · ↓ lower is better
      </p>
    </Slide>
  );
}
