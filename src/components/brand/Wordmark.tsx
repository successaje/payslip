import Link from "next/link";
import { cn } from "@/lib/cn";

/** The Payslip mark: a stacked-lines glyph (a slip) and the name. */
export function Mark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="8" className="fill-ink" />
      <path d="M9 11h14M9 16h14M9 21h8" className="stroke-paper" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <Mark />
      <span className="text-[15px] font-semibold tracking-[-0.01em]">Payslip</span>
    </Link>
  );
}
