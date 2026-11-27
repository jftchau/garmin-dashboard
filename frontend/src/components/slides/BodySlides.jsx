import { fetchVo2maxTrend, fetchWellnessTrend, fetchCurrentStatus } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, GlassStat, LabelStat, Loading } from "../glass.jsx";
import { Sparkline } from "../chart.jsx";
import { signed, isoDay, addDays } from "../../utils.js";

// Window for the body-metric slides: a month of points is what a sparkline
// on this display can resolve.
const TREND_DAYS = 30;

const sinceCutoff = () => isoDay(addDays(new Date(), -TREND_DAYS));

const round = (v) => (v != null ? Math.round(v) : null);

// One runner's series as { date, v } rows, oldest first.
const series = (rows, key, map = (v) => v) =>
  (rows || [])
    .filter((d) => d[key] != null)
    .map((d) => ({ date: d.date, v: map(d[key]) }))
    .sort((x, y) => (x.date < y.date ? -1 : 1));

/**
 * One body metric, head-to-head: each runner's latest value at stat-xl, how it
 * sits against their 30-day average, and the 30-day shape as a sparkline.
 * Split from the old two-chart "Heart" and "Fitness & sleep" slides, which had
 * no number on screen at all.
 */
function MetricSlide({ users, rows, unit, digits = 0, pad, what }) {
  const shown = (users || []).slice(0, 2);
  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const r = rows[i] || [];
        const last = r.length ? r[r.length - 1].v : null;
        // Against the window's average rather than its first day: one night's
        // sleep vs another is mostly noise.
        const avg = r.length > 1 ? r.reduce((t, x) => t + x.v, 0) / r.length : null;
        const change = avg != null ? +(last - avg).toFixed(digits) : null;
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            <div>
              <GlassStat value={last != null ? last.toFixed(digits) : "—"} unit={last != null ? unit : null} />
              <div className="t-caption text-soft mt-5 whitespace-nowrap">
                {change != null ? `${signed(change)} vs ${TREND_DAYS}-day avg` : `no ${what} yet`}
              </div>
            </div>
            <div className="h-[110px]">
              <Sparkline rows={r} i={i} pad={pad} />
            </div>
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}

export function RestingHrSlide({ users }) {
  const wells = useTwoUsers((uid) => fetchWellnessTrend(TREND_DAYS, uid), users);
  if (!wells[0] && !wells[1]) return <Loading what="resting heart rate" />;
  return <MetricSlide users={users} rows={wells.map((w) => series(w, "resting_hr"))} unit="bpm" pad={1} what="resting HR" />;
}

export function Vo2maxSlide({ users }) {
  const vo2 = useTwoUsers(fetchVo2maxTrend, users);
  if (!vo2[0] && !vo2[1]) return <Loading what="VO₂max" />;
  // /vo2max-trend has no window parameter; the 30-day cut happens here.
  const cutoff = sinceCutoff();
  const rows = vo2.map((t) => series((t?.trend || []).filter((d) => d.date >= cutoff), "vo2max"));
  return <MetricSlide users={users} rows={rows} unit="" pad={0.5} what="VO₂max" />;
}

export function SleepSlide({ users }) {
  const wells = useTwoUsers((uid) => fetchWellnessTrend(TREND_DAYS, uid), users);
  if (!wells[0] && !wells[1]) return <Loading what="sleep" />;
  const rows = wells.map((w) => series(w, "sleep_seconds", (s) => +(s / 3600).toFixed(1)));
  return <MetricSlide users={users} rows={rows} unit="h" digits={1} pad={0.3} what="sleep" />;
}

/**
 * Today's readiness, head-to-head: four numbers per runner in a 2x2 grid.
 * Two digits fit stat-lg in a half-width cell; a three-digit value (HRV can
 * pass 100) steps down to stat-md rather than overflow.
 */
export function StatusSlide({ users }) {
  const [statA, statB] = useTwoUsers(fetchCurrentStatus, users);
  const [vo2A, vo2B] = useTwoUsers(fetchVo2maxTrend, users);

  if (!statA && !statB) return <Loading what="current status" />;

  const stats = [statA, statB];
  const vo2 = [vo2A, vo2B];
  const shown = (users || []).slice(0, 2);

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => {
        const s = stats[i];
        const cell = (label, value) => <LabelStat label={label} value={value} size="lg" stepAt={3} />;
        return (
          <GlassCard key={u.id} runner={i}>
            <RunnerHead users={users} i={i} />
            <div className="grid grid-cols-2 gap-x-6 gap-y-7">
              {cell("Resting HR · bpm", s?.resting_hr)}
              {cell("HRV · ms", s?.hrv_last_night)}
              {cell("Sleep score", s?.sleep_score)}
              {cell("VO₂max", round(vo2[i]?.current))}
            </div>
          </GlassCard>
        );
      })}
    </GlassSlide>
  );
}
