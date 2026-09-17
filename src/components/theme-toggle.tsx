"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

const THEME_STORAGE_KEY = "myfakebook:theme";
const LEGACY_THEME_STORAGE_KEY = "notate:theme";
type Theme = "light" | "dark";

export function ThemeToggle() {
  useEffect(() => {
    let storedTheme: string | null = null;
    try {
      storedTheme =
        window.localStorage.getItem(THEME_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
    const nextTheme: Theme = storedTheme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    if (storedTheme) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, storedTheme);
      } catch {
        // The current theme remains active for this session.
      }
    }
  }, []);

  function toggleTheme() {
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The current theme remains active for this session.
    }
  }

  return (
    <button
      aria-label="Toggle light and dark mode"
      className="theme-toggle"
      title="Toggle light and dark mode"
      type="button"
      onClick={toggleTheme}
    >
      <Moon className="theme-toggle-dark" aria-hidden="true" size={15} strokeWidth={1.8} />
      <Sun className="theme-toggle-light" aria-hidden="true" size={15} strokeWidth={1.8} />
    </button>
  );
}
