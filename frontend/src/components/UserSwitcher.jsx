import { useState } from "react";

// Header control to switch between users and rename them inline.
// Double-click a name (or hit the ✎ on the active user) to edit it.
export default function UserSwitcher({ users, selectedId, onSelect, onRename }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");

  if (!users || users.length === 0) return null;

  function startEdit(u) {
    setEditingId(u.id);
    setDraft(u.name);
  }

  function commit() {
    const name = draft.trim();
    if (name && name !== users.find((u) => u.id === editingId)?.name) {
      onRename(editingId, name);
    }
    setEditingId(null);
  }

  return (
    <div className="flex items-center gap-1">
      {users.map((u) => {
        const active = u.id === selectedId;
        if (editingId === u.id) {
          return (
            <input
              key={u.id}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-24 bg-surface-2 border border-volt rounded px-2 py-1 text-xs sm:text-sm font-mono text-chalk focus:outline-none"
            />
          );
        }
        return (
          <button
            key={u.id}
            onClick={() => onSelect(u.id)}
            onDoubleClick={() => startEdit(u)}
            title="Click to switch · double-click to rename"
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-mono transition-colors border ${
              active
                ? "border-volt text-volt bg-surface"
                : "border-line text-muted hover:text-chalk"
            }`}
          >
            {u.name}
          </button>
        );
      })}
      {selectedId != null && (
        <button
          onClick={() => startEdit(users.find((u) => u.id === selectedId))}
          title="Rename current user"
          className="text-muted hover:text-volt text-sm px-1"
        >
          ✎
        </button>
      )}
    </div>
  );
}
