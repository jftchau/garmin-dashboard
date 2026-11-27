import { fetchPersonalRecords, fetchRacePredictions } from "../../api.js";
import { useTwoUsers } from "../../useTwoUsers.js";
import { GlassSlide, GlassCard, RunnerHead, Loading } from "../glass.jsx";
import { formatDuration, formatDateShort } from "../../utils.js";

// Our PR distance keys mapped to the race-prediction fields.
const PREDICTION_KEY = {
  "5K": "time_5k",
  "10K": "time_10k",
  HALF: "time_half_marathon",
  MARATHON: "time_marathon",
};

// Short names: the distance sits beside or above a 104–128px time, so it has
// to stay narrow.
const SHORT_LABEL = { "1K": "1K", "5K": "5K", "10K": "10K", HALF: "Half", MARATHON: "Full" };

// One distance in a runner's card. Short distances ("22:47") are narrow enough
// to put the name beside the time at stat-md, three to a card; long ones
// ("1:45:20") need the card's full width, so the name goes above. A time with
// hours is 406px at stat-lg — 10px more than the card — so it takes stat-md;
// a sub-hour time (rare at these distances) keeps stat-lg.
function RecordRow({ label, rec, predicted, wide }) {
  const time = rec?.best_time_sec ? formatDuration(rec.best_time_sec) : "—";
  const meta = [rec?.achieved_at ? formatDateShort(rec.achieved_at) : null, predicted != null ? `pred ${formatDuration(predicted)}` : null]
    .filter(Boolean)
    .join(" · ");

  if (wide) {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="t-caption text-soft">{label}</span>
          <span className="t-meta text-muted whitespace-nowrap">{meta}</span>
        </div>
        <div className={`${time.split(":").length > 2 ? "t-stat-md" : "t-stat-lg"} mt-3`}>{time}</div>
      </div>
    );
  }
  // A short distance run in over an hour ("1:02:15") is too wide to share the
  // row with its name, so the name joins the meta line beneath instead.
  if (time.split(":").length > 2) {
    return (
      <div className="text-right">
        <div className="t-stat-md">{time}</div>
        <div className="t-meta text-muted whitespace-nowrap mt-2">
          <span className="text-soft">{label}</span>
          {meta && ` · ${meta}`}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="t-caption text-soft">{label}</span>
      <div className="text-right">
        <div className="t-stat-md">{time}</div>
        <div className="t-meta text-muted whitespace-nowrap mt-2">{meta || " "}</div>
      </div>
    </div>
  );
}

/**
 * Personal bests, head-to-head: one card per runner, one row per distance.
 * The five distances are split across two slides (`distances`) so each time
 * can be large: 104px, or 128px where the card is wide enough.
 */
export default function RecordsSlide({ users, distances }) {
  const [recA, recB] = useTwoUsers(fetchPersonalRecords, users);
  const [predA, predB] = useTwoUsers(fetchRacePredictions, users);

  if (!recA && !recB) return <Loading what="records" />;

  const byDist = [recA, recB].map((rec) => Object.fromEntries((rec || []).map((r) => [r.distance_name, r])));
  const preds = [predA, predB];
  const shown = (users || []).slice(0, 2);
  const wide = distances.length <= 2;

  return (
    <GlassSlide cols={shown.length || 1}>
      {shown.map((u, i) => (
        <GlassCard key={u.id} runner={i}>
          <RunnerHead users={users} i={i} />
          <div className={`flex flex-col ${wide ? "gap-7" : "gap-[14px]"}`}>
            {distances.map((dist) => {
              const pk = PREDICTION_KEY[dist];
              return (
                <RecordRow
                  key={dist}
                  label={SHORT_LABEL[dist] || dist}
                  rec={byDist[i][dist]}
                  predicted={pk && preds[i] ? preds[i][pk] : null}
                  wide={wide}
                />
              );
            })}
          </div>
        </GlassCard>
      ))}
    </GlassSlide>
  );
}
