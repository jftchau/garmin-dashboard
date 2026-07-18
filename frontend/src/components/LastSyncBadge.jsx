import { useEffect, useState } from "react";
import { fetchLastSync } from "../api.js";

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

  const label = ago(iso, now);
  if (!label) return null;

  const stale = now - new Date(iso).getTime() > STALE_MS;

  return (
    <span
      className={`font-mono text-[11px] whitespace-nowrap ${
        stale ? "text-zone4 font-semibold" : "text-muted"
      }`}
      title={
        stale
          ? `Garmin data last synced ${iso} — the hourly sync has stopped. ` +
            `The session token has probably expired: run ` +
            `fetch_garmin.py --login on the Pi to re-authenticate (needs the 2FA code).`
          : `Garmin data last synced: ${iso}`
      }
    >
      {stale ? "⚠ stale — " : ""}updated {label}
    </span>
  );
}
