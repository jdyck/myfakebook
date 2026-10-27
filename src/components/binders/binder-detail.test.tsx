// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  mutate: vi.fn().mockResolvedValue("saved"),
  push: vi.fn(),
}));

const binder = {
  _id: "binder_1",
  name: "Friday set",
  items: [
    { _id: "item_1", songId: "song_1", title: "First song", canOpen: true, isOwned: true, abc: "T:First song\nK:C\nC|", displaySettings: { transposition: 0, showChords: true, showLyrics: true } },
    { _id: "item_2", songId: "song_2", title: "Second song", canOpen: true, isOwned: false, abc: "T:Second song\nK:G\nG|", displaySettings: { transposition: 2, showChords: false, showLyrics: true } },
  ],
};

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: (_query: unknown, args: object) => "id" in args ? binder : [
    { songId: "song_3", title: "Third song", isPublic: true },
    { songId: "song_4", title: "Fourth song", isPublic: false },
  ],
  useMutation: () => state.mutate,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("@/components/app-shell/header/header", () => ({ Header: () => null }));
vi.mock("@/components/songs/preview/preview-panel", () => ({
  PreviewPanel: ({ abc, displayControls }: { abc: string; displayControls: React.ReactNode }) => <div data-preview><p>{abc}</p>{displayControls}</div>,
}));

import { BinderDetail } from "./binder-detail";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.clearAllMocks());

describe("Binder detail", () => {
  it("selects songs in the preview and saves their display settings", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<BinderDetail id="binder_1" />));
      expect(container.querySelector('a[href="/binders"]')).not.toBeNull();
      expect(container.querySelector('[data-preview]')?.textContent).toContain("First song");
      expect(container.querySelector('a[href^="/mylibrary/song_1?"]')).not.toBeNull();
      const selectSecond = container.querySelector<HTMLButtonElement>('[data-binder-item="item_2"] button[aria-pressed]')!;
      await act(async () => selectSecond.click());
      expect(selectSecond.getAttribute("aria-pressed")).toBe("true");
      expect(container.querySelector('[data-preview]')?.textContent).toContain("Second song");
      expect(container.querySelector('a[href^="/songs/song_2?"]')).not.toBeNull();
      const key = container.querySelector<HTMLButtonElement>('button[aria-label="Concert key"]')!;
      expect(key.textContent).toContain("A");
      await act(async () => key.click());
      const options = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
      expect(options.find((option) => option.getAttribute("aria-checked") === "true")?.textContent).toContain("A");
      await act(async () => options.find((option) => option.textContent === "G major")!.click());
      expect(state.mutate).toHaveBeenCalledWith({
        binderId: "binder_1",
        itemId: "item_2",
        displaySettings: expect.objectContaining({ transposition: 0, showChords: false }),
      });
      const reorder = container.querySelector<HTMLButtonElement>('[aria-label="Reorder Second song; use the arrow keys to move"]')!;
      await act(async () => reorder.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })));
      expect(state.mutate).toHaveBeenCalledWith({ binderId: "binder_1", itemIds: ["item_2", "item_1"] });
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("selects multiple songs and adds them together", async () => {
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<BinderDetail id="binder_1" />));
      const open = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Add song"))!;
      await act(async () => open.click());
      const options = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'));
      expect(options).toHaveLength(2);
      await act(async () => options[0].click());
      await act(async () => options[1].click());
      expect(state.mutate).not.toHaveBeenCalled();
      const submit = container.querySelector<HTMLButtonElement>('dialog button[type="submit"]')!;
      expect(submit.textContent).toBe("Add 2 songs");
      await act(async () => submit.click());
      expect(state.mutate).toHaveBeenNthCalledWith(1, { binderId: "binder_1", songId: "song_3" });
      expect(state.mutate).toHaveBeenNthCalledWith(2, { binderId: "binder_1", songId: "song_4" });
      expect(container.querySelector("dialog")!.open).toBe(false);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("opens binder settings and saves the binder name", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<BinderDetail id="binder_1" />));
      expect(container.querySelector("h1")?.textContent).toBe("Friday set");
      expect(container.textContent).not.toContain("THE RUNNING ORDER.");
      expect(container.querySelector('input#binder-name')).toBeNull();
      await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Edit binder settings"]')!.click());
      const input = container.querySelector<HTMLInputElement>('input#binder-name')!;
      await act(async () => input.focus());
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Saturday set");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => input.blur());
      expect(state.mutate).toHaveBeenCalledWith({ id: "binder_1", name: "Saturday set" });
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
