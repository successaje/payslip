"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-[20px] font-semibold text-ink">Something went wrong on this screen</h1>
      <p className="mt-2 text-[14px] text-ink-3 text-pretty">
        Your funds are not affected. Nothing is sent without your wallet&apos;s signature.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
