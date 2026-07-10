import { useEffect, useState } from "react";

// Fetch the same endpoint for both runners in a head-to-head view. `fetchFn`
// takes a user id and returns a promise, e.g. (uid) => fetchThisWeek(uid).
// Returns [dataA, dataB]; dataB stays null when only one user is configured, so
// every view degrades cleanly to a single series.
export function useTwoUsers(fetchFn, users) {
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);

  const idA = users?.[0]?.id;
  const idB = users?.[1]?.id;

  useEffect(() => {
    let alive = true;
    setA(null);
    setB(null);
    if (idA != null) fetchFn(idA).then((d) => alive && setA(d));
    if (idB != null) fetchFn(idB).then((d) => alive && setB(d));
    return () => {
      alive = false;
    };
    // fetchFn is an inline arrow at the call site; depend on the ids instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idA, idB]);

  return [a, b];
}
