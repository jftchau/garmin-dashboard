import { useEffect, useState } from "react";
import { getDataSource, subscribeDataSource } from "./api.js";

// Reactive view of whether the dashboard is showing live backend data or the
// mock fallback. Returns "real" | "mock" | "unknown" (unknown until the first
// API read resolves). Kept in a hook so api.js stays React-free.
export function useDataSource() {
  const [source, setSource] = useState(getDataSource());
  useEffect(() => subscribeDataSource(setSource), []);
  return source;
}
