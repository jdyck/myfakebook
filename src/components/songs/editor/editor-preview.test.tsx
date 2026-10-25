// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { EditorPreview } from "./editor-preview";

vi.mock("@/components/songs/preview/abc-preview", () => ({
  AbcPreview: ({ abc }: { abc: string }) => <pre>{abc}</pre>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test("zooms the score, preserves the view during edits, and refits after zooming or scrolling", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<EditorPreview abc="Original" />));
    const zoomIn = host.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!;
    const zoomOut = host.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!;
    expect(zoomOut.disabled).toBe(true);
    expect(host.textContent).not.toContain("Fit preview");
    await act(async () => zoomIn.click());
    expect(host.querySelector("output")!.textContent).toBe("125%");
    expect(host.querySelector("pre")!.parentElement!.style.transform).toBe("scale(1.25)");
    await act(async () => root.render(<EditorPreview abc="Edited" />));
    expect(host.querySelector("pre")!.textContent).toBe("Edited");
    expect(host.querySelector("output")!.textContent).toBe("125%");
    const viewport = host.querySelector<HTMLDivElement>('[tabindex="0"]')!;
    viewport.scrollTo = vi.fn();
    const fitButton = () => Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Fit preview");
    await act(async () => fitButton()!.click());
    expect(viewport.scrollTo).toHaveBeenCalledWith({ left: 0, top: 0, behavior: "instant" });
    expect(host.querySelector("output")!.textContent).toBe("100%");
    expect(fitButton()).toBeUndefined();
    await act(async () => {
      viewport.scrollTop = 120;
      viewport.dispatchEvent(new Event("scroll"));
    });
    expect(fitButton()).toBeDefined();
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

test("captures pinch zoom inside the score while leaving ordinary scrolling alone", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<EditorPreview abc="Song" />));
    const viewport = host.querySelector<HTMLDivElement>('[tabindex="0"]')!;
    const pinch = new WheelEvent("wheel", { ctrlKey: true, deltaY: -50, cancelable: true, bubbles: true });
    await act(async () => { viewport.dispatchEvent(pinch); });
    expect(pinch.defaultPrevented).toBe(true);
    expect(Number.parseInt(host.querySelector("output")!.textContent!)).toBeGreaterThan(100);
    const ordinaryScroll = new WheelEvent("wheel", { deltaY: 50, cancelable: true });
    await act(async () => { viewport.dispatchEvent(ordinaryScroll); });
    expect(ordinaryScroll.defaultPrevented).toBe(false);
    const outsidePinch = new WheelEvent("wheel", { ctrlKey: true, deltaY: -50, cancelable: true });
    host.dispatchEvent(outsidePinch);
    expect(outsidePinch.defaultPrevented).toBe(false);
    const start = new Event("gesturestart", { cancelable: true });
    viewport.dispatchEvent(start);
    const change = Object.assign(new Event("gesturechange", { cancelable: true }), { scale: 10 });
    await act(async () => { viewport.dispatchEvent(change); });
    expect(start.defaultPrevented).toBe(true);
    expect(change.defaultPrevented).toBe(true);
    expect(host.querySelector("output")!.textContent).toBe("400%");
    const zoomOut = new WheelEvent("wheel", { ctrlKey: true, deltaY: 10000, cancelable: true });
    await act(async () => { viewport.dispatchEvent(zoomOut); });
    expect(zoomOut.defaultPrevented).toBe(true);
    expect(host.querySelector("output")!.textContent).toBe("100%");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

test("fits both dimensions and recalculates the fit when the panel resizes", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  let panelHeight = 400;
  const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(600);
  const height = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => panelHeight);
  const scoreHeight = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(800);
  try {
    await act(async () => root.render(<EditorPreview abc="Tall score" />));
    const score = host.querySelector("pre")!.parentElement!;
    // A 600 × 800 score fits a 600 × 400 panel at half size.
    expect(score.style.width).toBe("600px");
    expect(score.style.transform).toBe("scale(0.5)");
    expect(score.style.left).toBe("150px");
    expect(score.parentElement!.style.height).toBe("400px");
    await act(async () => {
      panelHeight = 1000;
      window.dispatchEvent(new Event("resize"));
    });
    // With enough height, width limits the fit instead.
    expect(score.style.transform).toBe("scale(1)");
    expect(score.style.left).toBe("0px");
    expect(score.parentElement!.style.height).toBe("800px");
  } finally {
    await act(async () => root.unmount());
    host.remove();
    width.mockRestore();
    height.mockRestore();
    scoreHeight.mockRestore();
  }
});
