// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { SettingsButton } from "./settings-button";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("opens the theme picker, saves a theme, follows system changes, and opens account settings", async () => {
  let systemChange = () => {};
  const media = { matches: true, addEventListener: vi.fn((_, callback) => { systemChange = callback; }), removeEventListener: vi.fn() };
  vi.stubGlobal("matchMedia", () => media);
  localStorage.clear();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const account = vi.fn();
  const signOut = vi.fn();
  try {
    await act(async () => root.render(<SettingsButton onAccountClick={account} onSignOut={signOut} />));
    expect(document.documentElement.dataset.theme).toBe("dark");
    await act(async () => host.querySelector<HTMLButtonElement>("button")!.click());
    const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(Array.from(radios, (radio) => radio.value)).toEqual(["light", "dark", "system"]);
    await act(async () => radios[0].click());
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("myfakebook:theme")).toBe("light");
    await act(async () => radios[2].click());
    expect(document.documentElement.dataset.theme).toBe("dark");
    media.matches = false;
    await act(async () => systemChange());
    expect(document.documentElement.dataset.theme).toBe("light");
    const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent === "Manage account")!;
    await act(async () => button.click());
    expect(account).toHaveBeenCalledOnce();
    await act(async () => host.querySelector<HTMLButtonElement>("button")!.click());
    const signOutButton = Array.from(document.querySelectorAll("button")).find((item) => item.textContent === "Sign out")!;
    await act(async () => signOutButton.click());
    expect(signOut).toHaveBeenCalledOnce();
    expect(host.querySelector("button")?.getAttribute("aria-expanded")).toBe("false");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
  }
});
