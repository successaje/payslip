"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PollingState {
  /** When the last successful check finished. Null until the first one. */
  lastCheckedAt: Date | null;
  /** True while a check is in flight. */
  checking: boolean;
  /** Message from the last failed check, cleared on the next success. */
  error: string | null;
  /** Run a check now, outside the schedule. */
  checkNow: () => Promise<void>;
}

/**
 * Calls `check` on an interval while the page is visible, immediately when
 * the tab comes back into view or the window regains focus, and never
 * concurrently. Failures back off (doubling, capped at 8x) so a flaky RPC
 * does not hammer. Nothing runs while `enabled` is false or the tab is hidden.
 */
export function usePolling(check: () => Promise<void>, { intervalMs, enabled = true }: { intervalMs: number; enabled?: boolean }): PollingState {
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkRef = useRef(check);
  const inFlight = useRef(false);
  const failures = useRef(0);

  useEffect(() => {
    checkRef.current = check;
  });

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      await checkRef.current();
      failures.current = 0;
      setError(null);
      setLastCheckedAt(new Date());
    } catch (e) {
      failures.current = Math.min(failures.current + 1, 3);
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const schedule = () => {
      if (stopped || document.visibilityState !== "visible") return;
      const delay = intervalMs * 2 ** failures.current;
      timer = setTimeout(async () => {
        await run();
        schedule();
      }, delay);
    };
    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const onVisible = () => {
      clear();
      if (document.visibilityState === "visible") {
        void run().then(schedule);
      }
    };

    // First check on the next tick so the effect itself stays side-effect free for React.
    timer = setTimeout(() => void run().then(schedule), 0);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      clear();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, intervalMs, run]);

  return { lastCheckedAt, checking, error, checkNow: run };
}
