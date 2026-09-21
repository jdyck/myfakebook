// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost:3000"}

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import ABCJS from "abcjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbcPreview } from "./abc-preview";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FIRST_ABC = `X:1
T:First title
M:4/4
K:C
C D E F |`;

const SECOND_ABC = `X:1
T:Second title
M:3/4
K:G
G A B |`;

describe("AbcPreview", () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }
    container?.remove();
    vi.restoreAllMocks();
    container = undefined;
    root = undefined;
  });

  function mount(abc: string) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    return act(async () => {
      root?.render(<AbcPreview abc={abc} />);
    });
  }

  it("renders valid ABC with abcjs and rerenders when the source changes", async () => {
    await mount(FIRST_ABC);

    const firstSvg = container?.querySelector("svg");
    expect(firstSvg?.getAttribute("role")).toBe("img");
    expect(firstSvg?.getAttribute("aria-label")).toBe('Sheet Music for "First title"');

    await act(async () => {
      root?.render(<AbcPreview abc={SECOND_ABC} />);
    });

    const secondSvg = container?.querySelector("svg");
    expect(secondSvg?.getAttribute("aria-label")).toBe('Sheet Music for "Second title"');
  });

  it("hands the rendered tune to abcjs playback controls", async () => {
    let running = false;
    const synth = {
      init: vi.fn().mockResolvedValue(undefined),
      prime: vi.fn().mockResolvedValue(undefined),
      start: vi.fn(() => {
        running = true;
      }),
      stop: vi.fn(() => {
        running = false;
        return 0;
      }),
      getIsRunning: vi.fn(() => running),
    };
    vi.spyOn(ABCJS.synth, "CreateSynth").mockImplementation(function CreateSynthMock() {
      return synth as never;
    } as never);

    await mount(FIRST_ABC);

    const playButton = container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]');
    expect(playButton).not.toBeNull();

    await act(async () => {
      playButton?.click();
    });

    expect(synth.init).toHaveBeenCalledWith(
      expect.objectContaining({
        visualObj: expect.any(Object),
      }),
    );
    expect(synth.prime).toHaveBeenCalledOnce();
    expect(synth.start).toHaveBeenCalledOnce();
    expect(container?.querySelector('button[aria-label="Stop playback"]')).not.toBeNull();

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Stop playback"]')?.click();
    });

    expect(synth.stop).toHaveBeenCalledOnce();
    expect(container?.querySelector('button[aria-label="Play lead sheet"]')).not.toBeNull();
  });

  it("shows an actionable error when there is no ABC source", async () => {
    await mount("");

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(container?.textContent).toContain("Add ABC notation to see the staff preview.");
    expect(container?.textContent).toContain("Check the ABC header and note syntax.");
    expect(container?.querySelector('button[aria-label="Play lead sheet"]')?.hasAttribute("disabled")).toBe(true);
  });
});
