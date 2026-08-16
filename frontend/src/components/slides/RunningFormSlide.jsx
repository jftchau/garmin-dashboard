import { fetchRunningForm } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import Slide, { BigStat, Loading, RunnerTag } from "../Slide.jsx";
import { RUNNER_COLORS } from "../../utils.js";

// The four form metrics worth showing side by side, with how to render each
// from the raw average the API returns. Cadence and stride are "more is
// usually better"; ground contact and vertical oscillation are "less is more
// economical" — but this slide just reports them, it doesn't judge.
const METRICS = [
  { key: "cadence_spm", label: "Cadence", unit: "spm", fmt: (v) => Math.round(v) },
  { key: "stride_cm", label: "Stride", unit: "m", fmt: (v) => (v / 100).toFixed(2) },
  { key: "ground_contact_ms", label: "Ground contact", unit: "ms", fmt: (v) => Math.round(v) },
  { key: "vertical_osc_cm", label: "Vert. oscillation", unit: "cm", fmt: (v) => v.toFixed(1) },
];

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
              <RunnerTag users={users} i={i} size="lg" />
              <span className="font-mono text-sm text-muted">
                last {forms[i]?.runs_counted ?? 0} runs
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 short:gap-3">
              {METRICS.map((m) => {
                const v = avgs[m.key];
                return (
                  <BigStat
                    key={m.key}
                    label={m.label}
                    value={v != null ? m.fmt(v) : "—"}
                    unit={v != null ? m.unit : ""}
                    color={color}
                    size="lg"
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </Slide>
  );
}
