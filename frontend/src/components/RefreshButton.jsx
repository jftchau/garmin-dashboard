import { useState } from "react";
import { triggerSync } from "../api.js";

export default function RefreshButton({ onDone }) {
  const [state, setState] = useState("idle"); // idle | loading | ok | error

  async function handleClick() {
    setState("loading");
    const result = await triggerSync();
    setState(result.ok ? "ok" : "error");
    if (onDone) onDone(result);
    setTimeout(() => setState("idle"), 2500);
  }

  const label = {
    idle: "Refresh data",
    loading: "Syncing…",
    ok: "Synced ✓",
    error: "Sync failed",
  }[state];

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="font-mono text-xs sm:text-sm px-3 py-2 rounded border border-line bg-surface hover:border-volt hover:text-volt transition-colors disabled:opacity-60"
    >
      {label}
    </button>
  );
}
