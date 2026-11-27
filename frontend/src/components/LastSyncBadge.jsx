import { useEffect, useState } from "react";
import { fetchLastSync } from "../api.js";
import { useDataSource } from "../useDataSource.js";

// Compact "x ago" from an ISO timestamp (UTC-marked by the backend).
function ago(iso, now) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 90) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// The fetcher syncs hourly, so anything older than a day means it has stopped —
// most likely the Garmin session token expired and its 2FA re-login is waiting
// for a human (`fetch_garmin.py --login`). Nothing else on the kiosk would show
// that: the dashboard keeps rendering the last-synced numbers as if they were
// current.
const STALE_MS = 24 * 60 * 60 * 1000;

// Header indicator of when the Garmin fetcher last synced, so a wall display's
// numbers can be trusted (and a dead cron fetcher is visible). Re-fetches every
// 5 min and re-renders the relative label every 30s; hides until a time loads.
export default function LastSyncBadge() {
  const [iso, setIso] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchLastSync()
        .then((d) => alive && setIso(d?.last_sync ?? null))
        .catch(() => {});
    load();
    const refetch = setInterval(load, 5 * 60 * 1000);
    const tick = setInterval(() => alive && setNow(Date.now()), 30 * 1000);
    return () => {
      alive = false;
      clearInterval(refetch);
      clearInterval(tick);
    };
  }, []);

  const source = useDataSource();
  const label = ago(iso, now);
  // On demo data the sync time is the mock's, not Garmin's; the "Demo data"
  // chip already says the numbers aren't real, and two alert chips would push
  // the slide title out of the header.
  if (!label || source === "mock") return null;

  const stale = now - new Date(iso).getTime() > STALE_MS;

  // Stale = the one alert hue, as a chip with a glyph and a word (design: an
  // alert is never a bare colour). Otherwise quiet walk-closer status.
  return (
    <span
      className={`t-meta whitespace-nowrap ${
        stale
          ? "inline-flex items-center rounded-full px-3 py-1.5 bg-ember/20 border border-ember text-chalk font-semibold"
          : "text-muted"
      }`}
      title={
        stale
          ? `Garmin data last synced ${iso} — the hourly sync has stopped. ` +
            `If the Refresh button still works, the cron job isn't running ` +
            `(check crontab -l on the Pi). If Refresh fails too, the Garmin ` +
            `session expired: run fetch_garmin.py --login (needs the 2FA code).`
          : `Garmin data last synced: ${iso}`
      }
    >
      {stale ? "⚠ Stale · " : "Synced "}{label}
    </span>
  );
}
