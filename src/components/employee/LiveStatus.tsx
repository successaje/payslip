"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { PollingState } from "@/hooks/usePolling";

function ago(from: Date, now: number) {
  const s = Math.max(0, Math.round((now - from.getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m} min ago`;
}

/** "Watching for pay · checked 12s ago". Ticks every 5s so the text stays honest. */
export function LiveStatus({ state }: { state: PollingState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const problem = state.error && !state.checking;
  return (
    <span className="inline-flex h-9 items-center gap-2 text-[12.5px] text-ink-3" title={problem ? state.error ?? undefined : "Re-reads your account on-chain every 20 seconds while this tab is open."}>
      <span className="relative flex h-2 w-2">
        {!problem && <span className={cn("absolute inline-flex h-full w-full rounded-full bg-green opacity-60", state.checking && "animate-ping")} />}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", problem ? "bg-amber" : "bg-green")} />
      </span>
      <span className="hidden sm:inline">
        {problem ? "Could not reach the chain, retrying" : state.lastCheckedAt ? `Watching for pay · checked ${ago(state.lastCheckedAt, now)}` : "Watching for pay"}
      </span>
    </span>
  );
}
