"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type StepState = "pending" | "active" | "done" | "error";

export interface Step {
  key: string;
  label: string;
  detail?: string;
  state: StepState;
}

/**
 * Vertical staged progress for multi-transaction flows:
 * Preparing → Waiting for signature → Submitted → Confirming → Complete.
 */
export function Stepper({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className={cn("absolute left-[11px] top-6 bottom-0 w-px", s.state === "done" ? "bg-green" : "bg-line")}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                s.state === "done" && "border-green bg-green text-white",
                s.state === "active" && "border-ink bg-paper-raised text-ink",
                s.state === "pending" && "border-line-strong bg-paper-raised text-ink-4",
                s.state === "error" && "border-red bg-red-soft text-red",
              )}
            >
              {s.state === "done" ? (
                <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}>
                  <Check size={13} strokeWidth={3} />
                </motion.span>
              ) : s.state === "active" ? (
                <Spinner size={13} />
              ) : s.state === "error" ? (
                "!"
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  "text-[14px] leading-tight",
                  s.state === "pending" ? "text-ink-3" : "font-medium text-ink",
                  s.state === "error" && "text-red",
                )}
              >
                {s.label}
              </p>
              {s.detail && <p className="mt-0.5 text-[12.5px] text-ink-3">{s.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
