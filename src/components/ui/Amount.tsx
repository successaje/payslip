import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/domain/money";

/**
 * Renders a USD-denominated base-unit amount (6 decimals) in tabular mono.
 * `hidden` renders the redacted form used wherever the viewer is not allowed
 * to see the number.
 */
export function Amount({
  value,
  hidden,
  className,
  size = "md",
}: {
  value: bigint | number | string | null | undefined;
  hidden?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "text-[13px]",
    md: "text-[14px]",
    lg: "text-[20px]",
    xl: "text-[34px] tracking-tight",
  };
  if (hidden || value === null || value === undefined) {
    return (
      <span
        aria-label="Amount hidden"
        className={cn("font-mono tnum text-ink-4 select-none", sizes[size], className)}
      >
        ••••••
      </span>
    );
  }
  return <span className={cn("font-mono tnum text-ink", sizes[size], className)}>{formatUsd(value)}</span>;
}
