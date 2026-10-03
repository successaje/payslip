"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";

export interface RowMenuItem {
  label: string;
  icon?: ReactNode;
  tone?: "default" | "danger";
  onSelect: () => void | Promise<void>;
}

/** Small overflow menu for list rows. */
export function RowMenu({ trigger, items, label = "More actions" }: { trigger: ReactNode; items: RowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-[var(--radius-sm)] p-1.5 text-ink-3 hover:bg-paper-inset hover:text-ink"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-30 mt-1 w-44 origin-top-right rounded-[var(--radius-md)] border border-line bg-paper-raised p-1 shadow-[var(--shadow-md)]"
          >
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={async () => {
                  setOpen(false);
                  await it.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13.5px] hover:bg-paper-sunken",
                  it.tone === "danger" ? "text-red" : "text-ink",
                )}
              >
                {it.icon && <span className="text-ink-3">{it.icon}</span>}
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
