import { useEffect, useMemo, useState } from "react";
import SlideNav from "./components/SlideNav.jsx";
import RefreshButton from "./components/RefreshButton.jsx";
import DataSourceBadge from "./components/DataSourceBadge.jsx";
import LastSyncBadge from "./components/LastSyncBadge.jsx";
import { visibleSlides, slideTitle } from "./slides.jsx";
import { fetchUsers } from "./api.js";
import { useVersionCheck } from "./useVersionCheck.js";

// Dwell time per slide for the hands-free carousel on the input-less Pi. Shorter
// than the old 20s tab dwell: each slide now carries a single idea, so it's read
// in a glance, and there are ~3x as many of them to get through.
const ROTATE_MS = 14000;

export default function App() {
  const [idx, setIdx] = useState(0);
  const [cycle, setCycle] = useState(0); // bumped each rotation; re-keys the progress bar
  const [paused, setPaused] = useState(false);
  const [users, setUsers] = useState([]);

  // Reload into a freshly deployed bundle within minutes of deploy/update.sh
  // swapping it in — the nightly reload below runs at 4am, *before* the 4:30
  // update timer, so on its own it would leave the kiosk a day behind.
  useVersionCheck();

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const slides = useMemo(() => visibleSlides(users), [users]);

  // Self-heal a wall display that runs for days: reload once nightly (~4am) to
  // recover from any leaked/frozen tab. Data itself already refreshes as each
  // rotation remounts and refetches a view.
  useEffect(() => {
    const next = new Date();
    next.setHours(4, 0, 0, 0);
    if (next <= new Date()) next.setDate(next.getDate() + 1);
    const t = setTimeout(() => window.location.reload(), next - new Date());
    return () => clearTimeout(t);
  }, []);

  // Auto-advance unless paused (e.g. a desktop user is looking).
  useEffect(() => {
    if (paused || slides.length === 0) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
      setCycle((c) => c + 1);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  // The visible set shrinks when only one runner is configured; keep the cursor
  // in range rather than blanking the screen.
  const safeIdx = slides.length ? idx % slides.length : 0;
  const slide = slides[safeIdx];

  function handleSelect(i) {
    setIdx(i);
    setPaused(true); // manual navigation stops the carousel
  }

  // Whose light fills the room (design/README.md, "The room"): a per-runner
  // slide takes that runner's light; everything else is lit by both.
  const runner = slide?.props?.runner;
  const light = slide?.light ?? (runner === 0 ? "a" : runner === 1 ? "b" : "both");

  return (
    // h-screen (not min-h-screen) so the slide area is a *definite* height that
    // charts can size themselves against. Header 48px + progress rule 3px leaves
    // the 549px content budget the design is sized for.
    <div className={`h-screen flex flex-col room room-${light}`}>
      <header className="h-12 shrink-0 flex items-center gap-4 px-10">
        {/* Slide number, so a viewer can say "page 7 needs updating" without
            guessing what the slide is called. Zero-padded for a stable width. */}
        {slides.length > 0 && (
          <span className="t-meta text-muted shrink-0">
            {String(safeIdx + 1).padStart(2, "0")}/{slides.length}
          </span>
        )}
        <h1 className="t-title truncate min-w-0">{slide ? slideTitle(slide, users) : "Run Dashboard"}</h1>
        <div className="ml-auto flex items-center gap-4 shrink-0">
          <LastSyncBadge />
          <DataSourceBadge />
          {/* Desktop-only controls: the Pi has no input, so they're hidden on
              the short (kiosk) viewport rather than spending header width. */}
          <button
            onClick={() => setPaused((p) => !p)}
            title={paused ? "Resume auto-rotation" : "Pause auto-rotation"}
            className="short:hidden text-sm px-3 py-1.5 rounded-full border border-line bg-surface hover:border-chalk transition-colors"
          >
            {paused ? "▶" : "⏸"}
          </button>
          <span className="short:hidden">
            <RefreshButton onDone={() => window.location.reload()} />
          </span>
        </div>
      </header>

      <SlideNav
        slides={slides}
        index={safeIdx}
        onSelect={handleSelect}
        rotating={!paused}
        rotateMs={ROTATE_MS}
        cycle={cycle}
      />

      <main className="flex-1 min-h-0 flex flex-col">
        {slide && <slide.Component key={slide.id} users={users} {...(slide.props || {})} />}
      </main>
    </div>
  );
}
