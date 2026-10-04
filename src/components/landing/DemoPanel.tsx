"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Eye, Globe, Lock, ShieldCheck } from "lucide-react";
import { Amount } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * The product in one panel: the same payout batch seen three ways. Amounts are
 * illustrative; the layout is the real run-detail layout.
 */
const people = [
  { name: "Ada Okafor", role: "Designer · salary", amount: 2_350_000_000n, sig: "5vXR…NWaz" },
  { name: "Tunde Bello", role: "Contractor · invoice", amount: 4_100_000_000n, sig: "3kFq…p9Ue" },
  { name: "Mara Ilić", role: "Grantee · tranche 2", amount: 1_800_000_000n, sig: "9bLw…Qd2n" },
  { name: "Yusuf Adeyemi", role: "Bounty winner", amount: 3_900_000_000n, sig: "7cHn…mA4r" },
];

type View = "explorer" | "employee" | "auditor";

const views: { key: View; label: string; icon: React.ReactNode; blurb: string }[] = [
  { key: "explorer", label: "Anyone", icon: <Globe size={14} />, blurb: "Four transfers happened. That is all the chain shows." },
  { key: "employee", label: "Ada", icon: <Eye size={14} />, blurb: "Ada decrypts her own payout with her wallet. Nothing else." },
  { key: "auditor", label: "Auditor", icon: <ShieldCheck size={14} />, blurb: "The auditor key reveals every amount and cannot spend." },
];

export function DemoPanel() {
  const [view, setView] = useState<View>("explorer");
  const [touched, setTouched] = useState(false);
  const reduce = useReducedMotion();

  // Auto-cycle until the visitor interacts.
  useEffect(() => {
    if (touched || reduce) return;
    const order: View[] = ["explorer", "employee", "auditor"];
    const t = setInterval(() => setView((v) => order[(order.indexOf(v) + 1) % order.length]), 2800);
    return () => clearInterval(t);
  }, [touched, reduce]);

  const current = views.find((v) => v.key === view)!;

  return (
    <div className="rounded-[var(--radius-xl)] border border-line bg-paper-raised shadow-[var(--shadow-lg)]">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">October payouts · seen by</span>
        </div>
        <div className="flex gap-1 rounded-[var(--radius-md)] bg-paper-inset p-1">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => {
                setTouched(true);
                setView(v.key);
              }}
              className={cn(
                "relative flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                view === v.key ? "text-ink" : "text-ink-3 hover:text-ink-2",
              )}
            >
              {view === v.key && (
                <motion.span layoutId="demo-tab" className="absolute inset-0 rounded-[6px] bg-paper-raised shadow-[var(--shadow-sm)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {v.icon}
                {v.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <ul>
        {people.map((p) => (
          <li key={p.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 hairline last:shadow-none">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-ink">{p.name}</p>
              <p className="text-[12px] text-ink-3">{p.role}</p>
            </div>
            <span className="hidden items-center gap-1.5 text-[12.5px] text-green-ink sm:inline-flex">
              <Check size={13} className="text-green" /> Paid
            </span>
            <div className="w-24 text-right">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${view}-${p.name}`}
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="inline-block"
                >
                  <Amount value={p.amount} hidden={view === "explorer" || (view === "employee" && p.name !== "Ada Okafor")} />
                </motion.span>
              </AnimatePresence>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-start gap-2 border-t border-line bg-paper-sunken/60 px-4 py-3 text-[13px] text-ink-2">
        {view === "explorer" ? <Lock size={14} className="mt-0.5 shrink-0 text-ink-3" /> : view === "employee" ? <Eye size={14} className="mt-0.5 shrink-0 text-ink-3" /> : <ShieldCheck size={14} className="mt-0.5 shrink-0 text-ink-3" />}
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={view} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {current.blurb}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
