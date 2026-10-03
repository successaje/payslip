"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export type Resource<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "error"; data: null; error: string }
  | { status: "ready"; data: T; error: null };

/**
 * Loads an async resource and exposes reload + optimistic mutate. Results
 * from a stale request are ignored when deps change.
 */
export function useResource<T>(fetcher: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<Resource<T>>({ status: "loading", data: null, error: null });
  const seq = useRef(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(() => {
    const id = ++seq.current;
    return fetcherRef
      .current()
      .then((data) => id === seq.current && setState({ status: "ready", data, error: null }))
      .catch((e) => id === seq.current && setState({ status: "error", data: null, error: e instanceof Error ? e.message : "Something went wrong" }));
  }, []);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const mutate = useCallback((updater: (prev: T) => T) => {
    setState((s) => (s.status === "ready" ? { ...s, data: updater(s.data) } : s));
  }, []);

  return { ...state, reload: run, mutate };
}
