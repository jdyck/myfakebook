// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-shell/header/header", () => ({ Header: () => null }));
vi.mock("next/font/google", () => ({ Roboto_Condensed: () => ({ className: "condensed" }) }));

import { BindersList } from "./binders-index";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const binders = [
  { _id: "friday", name: "Friday set", updatedAt: 1, itemCount: 3 },
  { _id: "afternoon", name: "Afternoon set", updatedAt: 3, itemCount: 1 },
  { _id: "late", name: "Late set", updatedAt: 2, itemCount: 0 },
];

describe("Binders list", () => {
  it("searches and sorts binders and links to their new URLs", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const names = () => Array.from(container.querySelectorAll("tbody tr")).map((row) => row.querySelector("td:nth-child(2) a")?.textContent);
    const click = async (label: string) => {
      const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.startsWith(label));
      expect(button).toBeDefined();
      await act(async () => button!.click());
    };
    const searchFor = async (value: string) => {
      const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, value);
        search.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };
    try {
      await act(async () => root.render(<BindersList binders={binders} onCreate={vi.fn()} />));
      expect(names()).toEqual(["Afternoon set", "Late set", "Friday set"]);
      expect(container.querySelector('a[href="/binders/friday"]')).not.toBeNull();
      await searchFor(" FRIDAY ");
      expect(names()).toEqual(["Friday set"]);
      expect(container.textContent).toContain("01 OF 03 BINDERS");
      await searchFor("missing");
      expect(container.textContent).toContain("No binders found.");
      await click("Clear search");
      await click("BINDER NAME");
      expect(names()).toEqual(["Afternoon set", "Friday set", "Late set"]);
      await click("BINDER NAME");
      expect(names()).toEqual(["Late set", "Friday set", "Afternoon set"]);
      await click("SONGS");
      expect(names()).toEqual(["Friday set", "Afternoon set", "Late set"]);
      await click("UPDATED");
      await click("UPDATED");
      expect(names()).toEqual(["Friday set", "Late set", "Afternoon set"]);
      await searchFor("late");
      await click("All binders");
      expect(names()).toEqual(["Friday set", "Late set", "Afternoon set"]);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("focuses the creation field, submits its name, and reports errors", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onCreate = vi.fn().mockRejectedValueOnce(new Error("Couldn’t create binder")).mockResolvedValueOnce(undefined);
    try {
      await act(async () => root.render(<BindersList binders={[]} onCreate={onCreate} />));
      const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "New binder")!;
      await act(async () => button.click());
      const input = container.querySelector<HTMLInputElement>("#new-binder-name")!;
      expect(document.activeElement).toBe(input);
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Friday at the Blue Note");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const submit = async () => act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
      await submit();
      expect(onCreate).toHaveBeenCalledWith("Friday at the Blue Note");
      expect(container.querySelector('[role="alert"]')?.textContent).toBe("Couldn’t create binder");
      expect(container.querySelector('button[type="submit"]')?.hasAttribute("disabled")).toBe(false);
      await submit();
      expect(container.querySelector('[role="alert"]')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("distinguishes loading, empty collections, and unavailable persistence", () => {
    const loading = renderToStaticMarkup(<BindersList binders={undefined} loading onCreate={vi.fn()} />);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Loading your binders…");
    expect(loading).not.toContain("No binders yet");
    const empty = renderToStaticMarkup(<BindersList binders={[]} onCreate={vi.fn()} />);
    expect(empty).toContain("No binders yet");
    expect(empty).toContain("Create binder");
    const unavailable = renderToStaticMarkup(<BindersList binders={[]} />);
    expect(unavailable).toContain("Connect Convex to create and save binders.");
    expect(unavailable).not.toContain("<form");
  });
});
