// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { HeaderMemberNavigation, HeaderView } from "./header-view";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("opens the mobile drawer with hidden account actions and closes it after navigation", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(
      <HeaderView activeSection="binders" memberNavigation={<HeaderMemberNavigation activeSection="binders" />} accountControls={<button>Create account</button>} />,
    ));
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Open menu"]')!;
    await act(async () => trigger.click());
    const drawer = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(drawer).not.toBeNull();
    expect(drawer.textContent).toContain("Create account");
    expect(Array.from(drawer.querySelectorAll("nav a"), (link) => link.textContent)).toEqual(["Songs", "My Library", "Binders"]);
    expect(drawer.querySelector('[aria-current="page"]')?.getAttribute("href")).toBe("/binders");
    const link = drawer.querySelector<HTMLAnchorElement>('a[href="/binders"]')!;
    link.addEventListener("click", (event) => event.preventDefault());
    await act(async () => link.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await act(async () => trigger.click());
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Close menu"]')!.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
