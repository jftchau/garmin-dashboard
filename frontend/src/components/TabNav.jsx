const TABS = [
  { id: "week", label: "This Week" },
  { id: "calendar", label: "Calendar" },
  { id: "history", label: "History" },
  { id: "insights", label: "Insights" },
  { id: "records", label: "Records" },
];

export default function TabNav({ active, onChange }) {
  return (
    <div className="border-b border-line">
      <nav className="flex gap-1 px-4 sm:px-6">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative px-3 sm:px-4 py-3 text-sm sm:text-base font-display font-medium tracking-wide transition-colors ${
                isActive ? "text-volt" : "text-muted hover:text-chalk"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="lane-rule absolute left-0 right-0 -bottom-px" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
