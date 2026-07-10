import { useEffect, useState } from "react";
import TabNav, { TABS } from "./components/TabNav.jsx";
import RefreshButton from "./components/RefreshButton.jsx";
import DataSourceBadge from "./components/DataSourceBadge.jsx";
import RunnerLegend from "./components/RunnerLegend.jsx";
import WeekView from "./components/WeekView.jsx";
import CalendarView from "./components/CalendarView.jsx";
import HistoryView from "./components/HistoryView.jsx";
import InsightsView from "./components/InsightsView.jsx";
import RecordsView from "./components/RecordsView.jsx";
import { fetchUsers } from "./api.js";

// Dwell time per tab for the hands-free carousel on the input-less Pi.
const ROTATE_MS = 20000;

export default function App() {
  const [tabIdx, setTabIdx] = useState(0);
  const [cycle, setCycle] = useState(0); // bumped each rotation; re-keys the progress bar
  const [paused, setPaused] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  // Auto-advance through the tabs unless paused (e.g. a desktop user is looking).
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setTabIdx((i) => (i + 1) % TABS.length);
      setCycle((c) => c + 1);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [paused]);

  const tab = TABS[tabIdx].id;

  function handleTab(id) {
    setTabIdx(TABS.findIndex((t) => t.id === id));
    setPaused(true); // manual navigation stops the carousel
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 short:py-2 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-volt" />
          <h1 className="heading-display text-lg sm:text-xl font-bold tracking-tight">
            Run<span className="text-volt">.</span>Dashboard
          </h1>
          <RunnerLegend users={users} />
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge />
          <button
            onClick={() => setPaused((p) => !p)}
            title={paused ? "Resume auto-rotation" : "Pause auto-rotation"}
            className="font-mono text-xs sm:text-sm px-3 py-2 rounded border border-line bg-surface hover:border-volt hover:text-volt transition-colors"
          >
            {paused ? "▶ Play" : "⏸ Pause"}
          </button>
          <RefreshButton onDone={() => window.location.reload()} />
        </div>
      </header>

      <TabNav
        active={tab}
        onChange={handleTab}
        rotating={!paused}
        rotateMs={ROTATE_MS}
        cycle={cycle}
      />

      <main className="flex-1">
        {tab === "week" && <WeekView users={users} />}
        {tab === "calendar" && <CalendarView users={users} />}
        {tab === "history" && <HistoryView users={users} />}
        {tab === "insights" && <InsightsView users={users} />}
        {tab === "records" && <RecordsView users={users} />}
      </main>
    </div>
  );
}
