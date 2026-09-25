// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost:3000"}

import { act } from "react";
import { createRoot } from "react-dom/client";
import ABCJS from "abcjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MyFakebookWorkspace } from "./my-fakebook-workspace";
import { PUBLIC_LIBRARY } from "@/lib/public-library";
import type { Id } from "../../../convex/_generated/dataModel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("MyFakebookWorkspace", () => {
  let container: HTMLDivElement | undefined;
  let unmount: (() => void) | undefined;

  afterEach(async () => {
    if (unmount) {
      await act(async () => {
        unmount?.();
      });
    }
    container?.remove();
    window.localStorage?.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    container = undefined;
    unmount = undefined;
  });

  it("wires the public chart into the editor and preview", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace clerkConfigured={false} persistenceEnabled={false} publicSongs={PUBLIC_LIBRARY} />,
      );
    });

    const editor = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]');
    expect(editor).not.toBeNull();
    expect(editor?.value).toContain("T:Oh, Lady Be Good!");
    expect(container.querySelector("#songs-heading")).toBeNull();
    expect(container.querySelector('[aria-label="Rendered lead sheet"]')).not.toBeNull();
  });

  it("opens the public song selected by the route", async () => {
    const secondSong = { ...PUBLIC_LIBRARY[0], id: "second-song", title: "Second Song", abc: "X:1\nT:Second Song\nM:4/4\nK:C\nC D E F |" };
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace
          clerkConfigured={false}
          persistenceEnabled={false}
          publicSongs={[PUBLIC_LIBRARY[0], secondSong]}
          initialPublicSongId={secondSong.id}
        />,
      );
    });

    expect(container.querySelector<HTMLInputElement>('input[aria-label="Lead sheet title"]')?.value).toBe("Second Song");
    expect(container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]')?.value).toContain("T:Second Song");
  });

  it("opens a private song selected from My Library", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace
          clerkConfigured={false}
          persistenceEnabled={false}
          publicSongs={PUBLIC_LIBRARY}
          initialPrivateSong={{ id: "private-song" as Id<"privateSongs">, title: "My Song", abc: "X:1\nT:My Song\nM:4/4\nK:C\nC D E F |" }}
        />,
      );
    });

    expect(container.querySelector<HTMLInputElement>('input[aria-label="Lead sheet title"]')?.value).toBe("My Song");
    expect(container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]')?.value).toContain("T:My Song");
    expect(container.textContent).toContain("Private song");
  });

  it("lets a visitor start and edit a new song while keeping the preview connected", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace clerkConfigured={false} persistenceEnabled={false} publicSongs={PUBLIC_LIBRARY} />,
      );
    });

    const newButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "New",
    );
    expect(newButton).not.toBeUndefined();

    await act(async () => {
      newButton?.click();
    });

    const title = container.querySelector<HTMLInputElement>('input[aria-label="Lead sheet title"]');
    const editor = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]');
    const renderedLeadSheet = container.querySelector('[aria-label="Rendered lead sheet"]');

    expect(title?.value).toBe("Midnight Walk");
    expect(editor?.value).toContain("T:Midnight Walk");
    expect(container.textContent).toContain("New song");
    expect(renderedLeadSheet).not.toBeNull();

    const editedAbc = editor?.value.replace("T:Midnight Walk", "T:Guest edit");
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setValue?.call(editor, editedAbc);
      editor?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(editor?.value).toContain("T:Guest edit");
    expect(container.textContent).toContain("New song");
    expect(container.querySelector('[aria-label="Rendered lead sheet"]')).not.toBeNull();
  });

  it("applies display controls to the preview and retains them while editing", async () => {
    const renderAbc = vi.spyOn(ABCJS, "renderAbc");
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace clerkConfigured={false} persistenceEnabled={false} publicSongs={PUBLIC_LIBRARY} />,
      );
    });

    const transposition = container.querySelector<HTMLSelectElement>('select[aria-label="Song transposition"]');
    const showChords = container.querySelector<HTMLInputElement>('input[aria-label="Show chords"]');
    const showLyrics = container.querySelector<HTMLInputElement>('input[aria-label="Show lyrics"]');
    expect(transposition).not.toBeNull();
    expect(showChords?.checked).toBe(true);
    expect(showLyrics?.checked).toBe(true);

    await act(async () => {
      if (!transposition || !showChords || !showLyrics) throw new Error("Display controls are missing.");
      transposition.value = "2";
      transposition.dispatchEvent(new Event("change", { bubbles: true }));
      showChords.click();
      showLyrics.click();
    });

    expect(transposition?.value).toBe("2");
    expect(showChords?.checked).toBe(false);
    expect(showLyrics?.checked).toBe(false);
    expect(container.querySelector(".abc-preview-hide-chords")).not.toBeNull();
    expect(container.querySelector(".abc-preview-hide-lyrics")).not.toBeNull();
    expect(renderAbc.mock.calls.at(-1)?.[2]).toEqual(expect.objectContaining({ visualTranspose: 2 }));

    const editor = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]');
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setValue?.call(editor, editor?.value.replace("T:Oh, Lady Be Good!", "T:Edited with display settings"));
      editor?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(transposition?.value).toBe("2");
    expect(showChords?.checked).toBe(false);
    expect(showLyrics?.checked).toBe(false);
  });

  it("sends the current display settings with a download request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["musicxml"])),
    });
    vi.stubGlobal("fetch", fetchMock);

    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace clerkConfigured={false} persistenceEnabled={false} publicSongs={PUBLIC_LIBRARY} />,
      );
    });

    const transposition = container.querySelector<HTMLSelectElement>('select[aria-label="Song transposition"]');
    const showLyrics = container.querySelector<HTMLInputElement>('input[aria-label="Show lyrics"]');
    await act(async () => {
      if (!transposition || !showLyrics) throw new Error("Display controls are missing.");
      transposition.value = "-2";
      transposition.dispatchEvent(new Event("change", { bubbles: true }));
      showLyrics.click();
      Array.from(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])
        .find((button) => button.textContent?.includes("Export MusicXML"))
        ?.click();
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(String(request?.body))).toMatchObject({
      display: {
        showChords: true,
        showLyrics: false,
        transposition: -2,
      },
    });
  });

  it("keeps editing and downloading available after a playback error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["musicxml"])),
    });
    vi.stubGlobal("fetch", fetchMock);

    const synth = {
      init: vi.fn().mockRejectedValue(new Error("MIDI audio is unavailable.")),
      prime: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(() => 0),
      getIsRunning: vi.fn(() => false),
    };
    vi.spyOn(ABCJS.synth, "CreateSynth").mockImplementation(function CreateSynthMock() {
      return synth as never;
    } as never);

    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    unmount = () => root.unmount();

    await act(async () => {
      root.render(
        <MyFakebookWorkspace clerkConfigured={false} persistenceEnabled={false} publicSongs={PUBLIC_LIBRARY} />,
      );
    });

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]')?.click();
    });

    expect(container.textContent).toContain("MIDI audio is unavailable.");

    const editor = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="ABC notation source"]');
    const exportButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("Export MusicXML"),
    );
    expect(editor?.disabled).toBe(false);
    expect(exportButton?.disabled).toBe(false);

    const editedAbc = editor?.value.replace("T:Oh, Lady Be Good!", "T:Edited after audio error");
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setValue?.call(editor, editedAbc);
      editor?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(editor?.value).toContain("T:Edited after audio error");

    await act(async () => {
      exportButton?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/musicxml",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
