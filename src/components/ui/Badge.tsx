import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "green" | "amber" | "red" | "blue";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-inset text-ink-2",
  green: "bg-green-soft text-green-ink",
  amber: "bg-amber-soft text-amber",
  red: "bg-red-soft text-red",
  blue: "bg-blue-soft text-blue",
};

const dots: Record<Tone, string> = {
  neutral: "bg-ink-3",
  green: "bg-green",
  amber: "bg-amber",
  red: "bg-red",
  blue: "bg-blue",
};

export function Badge({
  tone = "neutral",
  dot,
  pulse,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-[12px] font-medium leading-none whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative inline-flex h-1.5 w-1.5">
          {pulse && (
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dots[tone])} />
          )}
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dots[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}
