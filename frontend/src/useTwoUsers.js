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

// Same contract for the slides that show ONE runner at a time (the weekly
// volume and run-frequency slides, where a head-to-head would be too dense to
// read at distance). Returns the payload, or null while loading / if that
// runner slot isn't configured.
export function useOneUser(fetchFn, users, index) {
  const [data, setData] = useState(null);
  const id = users?.[index]?.id;

  useEffect(() => {
    let alive = true;
    setData(null);
    if (id != null) fetchFn(id).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return data;
}
