import { useEffect, useRef } from "react";

// The Pi's kiosk is autostarted Chromium, not a service — a deploy can't restart
// it (killing Chromium would leave a blank desktop), and nobody can press F5 on a
// display-only screen. So after deploy/update.sh swaps in a new dist/, the kiosk
// would happily keep running the *old* bundle it already has in memory, forever.
//
// update.sh stamps each build with the deployed git SHA in dist/version.json.
// Poll it; when it changes from the one we booted with, reload into the new one.
//
// Absent in dev (vite doesn't emit it) — a missing/unparseable file is simply
// ignored, so this is a no-op outside the Pi.
const POLL_MS = 5 * 60 * 1000;

async function readSha() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.sha ?? null;
  } catch {
    // Not deployed (dev), or nginx served index.html for a missing file.
    return null;
  }
}

export function useVersionCheck() {
  const booted = useRef(null);

  useEffect(() => {
    let alive = true;

    const check = async () => {
      const sha = await readSha();
      if (!alive || !sha) return;
      if (booted.current === null) {
        booted.current = sha; // first read: whatever we're running now
        return;
      }
      if (sha !== booted.current) window.location.reload();
    };

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
}
