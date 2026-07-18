import { useEffect, useMemo, useState } from "react";
import SlideNav from "./components/SlideNav.jsx";
import RefreshButton from "./components/RefreshButton.jsx";
import DataSourceBadge from "./components/DataSourceBadge.jsx";
import RunnerLegend from "./components/RunnerLegend.jsx";
import LastSyncBadge from "./components/LastSyncBadge.jsx";
import { visibleSlides, slideTitle } from "./slides.jsx";
import { fetchUsers } from "./api.js";

// Dwell time per slide for the hands-free carousel on the input-less Pi. Shorter
// than the old 20s tab dwell: each slide now carries a single idea, so it's read
// in a glance, and there are ~3x as many of them to get through.
const ROTATE_MS = 14000;

export default function App() {
  const [idx, setIdx] = useState(0);
  const [cycle, setCycle] = useState(0); // bumped each rotation; re-keys the progress bar
  const [paused, setPaused] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const slides = useMemo(() => visibleSlides(users), [users]);

  // Self-heal a wall display that runs for days: reload once nightly (~4am) to
  // recover from any leaked/frozen tab and pick up new frontend deploys. Data
  // itself already refreshes as each rotation remounts and refetches a slide.
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

  return (
    // h-screen (not min-h-screen) so the slide area is a *definite* height that
    // charts can size themselves against — the whole point of the redesign is
    // that every graphic fills the screen instead of sitting in a fixed-height
    // box with dead space beneath it.
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-6 short:px-4 pt-4 short:pt-2 pb-2 short:pb-1 gap-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-volt shrink-0 translate-y-[-2px]" />
          {/* The slide title is the only large text in the chrome — it tells you
              what you're looking at from across the room, which the old tab bar
              could no longer do once the slide count tripled. */}
          <h1 className="heading-display text-3xl short:text-2xl font-bold tracking-tight truncate">
            {slide ? slideTitle(slide, users) : "Run.Dashboard"}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <RunnerLegend users={users} />
          <LastSyncBadge />
          <DataSourceBadge />
          <button
            onClick={() => setPaused((p) => !p)}
            title={paused ? "Resume auto-rotation" : "Pause auto-rotation"}
            className="font-mono text-xs px-3 py-1.5 rounded border border-line bg-surface hover:border-volt hover:text-volt transition-colors"
          >
            {paused ? "▶" : "⏸"}
          </button>
          <RefreshButton onDone={() => window.location.reload()} />
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
