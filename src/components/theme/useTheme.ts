"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "payslip.theme";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage can be unavailable in private windows; the attribute still applies.
    }
  }, []);

  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  return { theme, setTheme, toggle };
}
