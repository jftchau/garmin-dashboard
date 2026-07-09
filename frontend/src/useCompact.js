import { useEffect, useState } from "react";

// Matches the `short:` Tailwind variant in index.css. Keep the threshold in
// sync. Returns true on short viewports (e.g. the 1024×600 Raspberry Pi
// display) so components can shrink fixed-height charts that CSS can't reach —
// Recharts' <ResponsiveContainer> needs a numeric pixel height as a prop.
const QUERY = "(max-height: 700px)";

export function useCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e) => setCompact(e.matches);
    mql.addEventListener("change", onChange);
    setCompact(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return compact;
}
