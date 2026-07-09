import { useEffect, useState } from "react";
import TabNav from "./components/TabNav.jsx";
import RefreshButton from "./components/RefreshButton.jsx";
import UserSwitcher from "./components/UserSwitcher.jsx";
import WeekView from "./components/WeekView.jsx";
import CalendarView from "./components/CalendarView.jsx";
import HistoryView from "./components/HistoryView.jsx";
import InsightsView from "./components/InsightsView.jsx";
import RecordsView from "./components/RecordsView.jsx";
import ActivityModal from "./components/ActivityModal.jsx";
import { fetchActivity, fetchUsers, updateUserName, setCurrentUser } from "./api.js";

export default function App() {
  const [tab, setTab] = useState("week");
  const [selected, setSelected] = useState(null);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    fetchUsers().then((us) => {
      setUsers(us);
      if (us.length) {
        setCurrentUser(us[0].id);
        setUserId(us[0].id);
      }
    });
  }, []);

  function handleSelectUser(id) {
    setCurrentUser(id); // set before remount so views fetch the right user
    setUserId(id);
  }

  async function handleRenameUser(id, name) {
    await updateUserName(id, name);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, name } : u)));
  }

  async function handleSelectActivity(activity) {
    // Records/history pass partial objects; fetch the full detail (incl. polyline/splits).
    const full = await fetchActivity(activity.id);
    setSelected(full);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-volt" />
          <h1 className="heading-display text-lg sm:text-xl font-bold tracking-tight">
            Run<span className="text-volt">.</span>Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <UserSwitcher
            users={users}
            selectedId={userId}
            onSelect={handleSelectUser}
            onRename={handleRenameUser}
          />
          <RefreshButton onDone={() => window.location.reload()} />
        </div>
      </header>

      <TabNav active={tab} onChange={setTab} />

      <main className="flex-1" key={userId}>
        {tab === "week" && <WeekView onSelectActivity={handleSelectActivity} />}
        {tab === "calendar" && <CalendarView />}
        {tab === "history" && <HistoryView onSelectActivity={handleSelectActivity} />}
        {tab === "insights" && <InsightsView />}
        {tab === "records" && <RecordsView onSelectActivity={handleSelectActivity} />}
      </main>

      <ActivityModal activity={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
