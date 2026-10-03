import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Every empty state answers three questions: why is this empty, is that
 * normal, and what should I do next.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-line-strong px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-paper-inset text-ink-2">{icon}</div>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13.5px] text-ink-3 text-pretty">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
