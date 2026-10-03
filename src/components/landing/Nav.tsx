"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui";
import { useTheme } from "@/components/theme/useTheme";

export function Nav() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-4 md:px-6">
        <Wordmark />
        <nav className="hidden items-center gap-6 text-[14px] text-ink-2 md:flex">
          <a href="#how" className="hover:text-ink">
            How it works
          </a>
          <a href="#roles" className="hover:text-ink">
            For your team
          </a>
          <a href="#solana" className="hover:text-ink">
            Built on Solana
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="rounded-[var(--radius-sm)] p-2 text-ink-3 hover:bg-paper-inset hover:text-ink"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link href="/app">
            <Button size="sm">Open app</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
