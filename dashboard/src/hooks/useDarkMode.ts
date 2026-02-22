import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "dashboard-dark-mode";

function getSystemPreference(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStored(): boolean | null {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function applyClass(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = readStored();
    const value = stored ?? getSystemPreference();
    applyClass(value);
    return value;
  });

  useEffect(() => {
    applyClass(dark);
    localStorage.setItem(STORAGE_KEY, String(dark));
  }, [dark]);

  // Listen for system preference changes when user hasn't explicitly set
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (readStored() === null) {
        setDark(e.matches);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggle = useCallback(() => setDark((prev) => !prev), []);

  return { dark, toggle };
}
