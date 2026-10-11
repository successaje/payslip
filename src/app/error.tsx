"use client";

import { Button } from "@/components/ui";

/** Catches render errors on public pages (landing, docs, invite and claim links) so a judge never sees a blank screen. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <h1 className="text-[22px] font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-[14px] text-ink-3 text-pretty">
        Nothing was sent or signed. Reload to try again; if it keeps happening, the link may be stale.
      </p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-ink-4">{error.digest}</p>}
      <Button variant="secondary" className="mt-5" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
