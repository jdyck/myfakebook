"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Popover } from "@base-ui/react/popover";
import { LogOut, Settings, UserRound } from "lucide-react";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "myfakebook:theme";

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("notate:theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Use the system theme when storage is unavailable.
  }
  return "system";
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("theme-change", callback);
  };
}

export function SettingsButton({ onAccountClick, onSignOut }: { onAccountClick?: () => void; onSignOut?: () => void }) {
  const storedTheme = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as Theme);
  const [sessionTheme, setSessionTheme] = useState<Theme | null>(null);
  const theme = sessionTheme ?? storedTheme;
  const [open, setOpen] = useState(false);
  const groupName = useId();

  useEffect(() => {
    const system = window.matchMedia?.("(prefers-color-scheme: dark)");
    function apply() {
      document.documentElement.dataset.theme = theme === "system" ? (system?.matches ? "dark" : "light") : theme;
    }
    apply();
    system?.addEventListener("change", apply);
    return () => system?.removeEventListener("change", apply);
  }, [theme]);

  function selectTheme(next: Theme) {
    setSessionTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new Event("theme-change"));
    } catch {
      // Keep the selected theme for this session.
    }
  }

  return (
    <span className="inline-flex shrink-0">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          aria-label="Settings"
          title="Settings"
          className="flex size-9 cursor-pointer items-center justify-center text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="end" sideOffset={8} className="z-50">
            <Popover.Popup aria-label="Settings" className="w-72 border border-line bg-paper text-ink shadow-menu">
              <fieldset className="flex items-center justify-between gap-4 border-b border-line p-3">
                <legend className="sr-only">Color theme</legend>
                <span aria-hidden="true" className="text-xs">Theme</span>
                <div className="flex border border-line">
                  {(["light", "dark", "system"] as const).map((option) => (
                    <label key={option} className="cursor-pointer">
                      <input className="peer sr-only" type="radio" name={groupName} value={option} checked={theme === option} onChange={() => selectTheme(option)} />
                      <span className="block px-2 py-2 text-xs capitalize peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent">{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {onAccountClick ? (
                <button type="button" className="flex min-h-touch w-full cursor-pointer items-center gap-2 p-3 text-xs hover:bg-canvas focus-visible:outline-2 focus-visible:outline-accent" onClick={() => { setOpen(false); onAccountClick(); }}>
                  <UserRound size={16} aria-hidden="true" />Manage account
                </button>
              ) : <p className="p-3 text-xs text-muted">Sign in to manage your account</p>}
              {onSignOut && (
                <button type="button" className="flex min-h-touch w-full cursor-pointer items-center gap-2 border-t border-line p-3 text-xs hover:bg-canvas focus-visible:outline-2 focus-visible:outline-accent" onClick={() => { setOpen(false); onSignOut(); }}>
                  <LogOut size={16} aria-hidden="true" />Sign out
                </button>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </span>
  );
}
