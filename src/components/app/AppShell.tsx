"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/components/theme/useTheme";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Wordmark } from "@/components/brand/Wordmark";
import { CLUSTER } from "@/lib/solana/config";
import { Badge } from "@/components/ui";

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Small count or dot shown on the right. */
  badge?: ReactNode;
}

interface AppShellProps {
  nav: NavItem[];
  /** Text under the wordmark, e.g. the company name. */
  context?: ReactNode;
  children: ReactNode;
  onSignOut?: () => Promise<void> | void;
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-9 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 text-[14px] transition-colors",
        active ? "text-ink font-medium" : "text-ink-2 hover:bg-paper-inset hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-[var(--radius-md)] bg-paper-inset"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      <span className="relative z-10 text-ink-3 [[aria-current]_&]:text-ink">{item.icon}</span>
      <span className="relative z-10 flex-1">{item.label}</span>
      {item.badge && <span className="relative z-10">{item.badge}</span>}
    </Link>
  );
}

export function AppShell({ nav, context, children, onSignOut }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || (href !== "/app" && href !== "/app/me" && pathname.startsWith(`${href}/`));

  const sidebar = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-0.5">
      {nav.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} />
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-paper px-3 py-4 lg:flex">
        <div className="mb-6 px-2.5">
          <Wordmark />
          {context && <p className="mt-1 truncate text-[13px] text-ink-3">{context}</p>}
        </div>
        {sidebar()}
        <div className="mt-auto flex items-center justify-between px-2.5 pt-4">
          {CLUSTER !== "mainnet-beta" ? <Badge tone="amber">Devnet</Badge> : <span />}
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="rounded-[var(--radius-sm)] p-1.5 text-ink-3 hover:bg-paper-inset hover:text-ink"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="-ml-1.5 rounded-[var(--radius-sm)] p-1.5 text-ink-2 hover:bg-paper-inset"
            >
              <Menu size={20} />
            </button>
            <Wordmark />
          </div>
          <div className="hidden lg:block" />
          <ConnectButton size="sm" variant="secondary" onSignOut={onSignOut} />
        </header>

        <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-ink/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-paper px-3 py-4 shadow-[var(--shadow-lg)]"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-6 flex items-center justify-between px-2.5">
                <div>
                  <Wordmark />
                  {context && <p className="mt-1 truncate text-[13px] text-ink-3">{context}</p>}
                </div>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-sm)] p-1.5 text-ink-2 hover:bg-paper-inset"
                >
                  <X size={18} />
                </button>
              </div>
              {sidebar(() => setOpen(false))}
              <div className="mt-auto flex items-center justify-between px-2.5 pt-4">
                {CLUSTER !== "mainnet-beta" ? <Badge tone="amber">Devnet</Badge> : <span />}
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Toggle theme"
                  className="rounded-[var(--radius-sm)] p-1.5 text-ink-3 hover:bg-paper-inset hover:text-ink"
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
