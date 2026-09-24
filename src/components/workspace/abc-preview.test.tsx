// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost:3000"}

import { act, createElement } from "react";
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

const FOUR_MEASURE_ABC = `X:1
T:Four measure test
M:4/4
K:C
"C" C D E F | "F" G A B c | "G7" c B A G | "C" F E D C |`;

type SelectedChordVariant = {
  id: string;
  startMeasure: number;
  endMeasure: number;
  chords: readonly string[];
};

type PlaybackPreviewProps = {
  abc: string;
  showChords?: boolean;
  showLyrics?: boolean;
  transposition?: number;
  selectedChordVariant?: SelectedChordVariant | null;
};

function createSynthMock() {
  let running = false;
  const synth = {
    init: vi.fn().mockResolvedValue(undefined),
    prime: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn(),
    start: vi.fn(() => {
      running = true;
    }),
    stop: vi.fn(() => {
      running = false;
      return 0;
    }),
    pause: vi.fn(() => {
      running = false;
      return 0;
    }),
    resume: vi.fn(() => {
      running = true;
    }),
    getIsRunning: vi.fn(() => running),
  };
  return synth;
}

function createTimingMock(noteTimings: Array<Record<string, unknown>> = []) {
  let options: ABCJS.AnimationOptions | undefined;
  const timing = {
    noteTimings,
    replaceTarget: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    reset: vi.fn(),
    stop: vi.fn(),
    setProgress: vi.fn(),
    currentMillisecond: vi.fn(() => 0),
  };

  vi.spyOn(ABCJS, "TimingCallbacks").mockImplementation(function TimingCallbacksMock(
    _visualObj: ABCJS.TuneObject,
    nextOptions?: ABCJS.AnimationOptions,
  ) {
    options = nextOptions;
    return timing as never;
  } as never);

  return {
    timing,
    getOptions: () => options,
  };
}

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

  function mount(propsOrAbc: PlaybackPreviewProps | string) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const props = typeof propsOrAbc === "string" ? { abc: propsOrAbc } : propsOrAbc;
    return act(async () => {
      root?.render(createElement(AbcPreview, props as never));
    });
  }

  function rerender(props: PlaybackPreviewProps) {
    return act(async () => {
      root?.render(createElement(AbcPreview, props as never));
    });
  }

  it("starts, stops, and restarts playback from the play button", async () => {
    const synth = createSynthMock();
    vi.spyOn(ABCJS.synth, "CreateSynth").mockImplementation(function CreateSynthMock() {
      return synth as never;
    } as never);

    await mount(FIRST_ABC);

    const playButton = container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]');
    expect(playButton).not.toBeNull();

    await act(async () => {
      playButton?.click();
    });

    expect(synth.prime).toHaveBeenCalledOnce();
    expect(synth.start).toHaveBeenCalledOnce();
    expect(container?.querySelector('button[aria-label="Stop playback"]')).not.toBeNull();

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Stop playback"]')?.click();
    });

    expect(synth.stop).toHaveBeenCalledOnce();
    expect(container?.querySelector('button[aria-label="Play lead sheet"]')).not.toBeNull();

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]')?.click();
    });

    expect(synth.init).toHaveBeenCalledTimes(2);
    expect(synth.start).toHaveBeenCalledTimes(2);
  });

  it("starts playback from the chosen measure", async () => {
    const synth = createSynthMock();
    vi.spyOn(ABCJS.synth, "CreateSynth").mockImplementation(function CreateSynthMock() {
      return synth as never;
    } as never);

    await mount(FOUR_MEASURE_ABC);

    const startMeasure = container?.querySelector<HTMLSelectElement>('select[aria-label="Playback start measure"]');

    await act(async () => {
      if (!startMeasure) throw new Error("Playback start measure control is missing.");
      startMeasure.value = "3";
      startMeasure.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]')?.click();
    });

    expect(synth.seek).toHaveBeenCalledWith(0.5, "percent");
    expect(synth.start.mock.invocationCallOrder[0]).toBeGreaterThan(synth.seek.mock.invocationCallOrder[0]);
  });

  it("uses Spacebar to play, pause, and resume playback", async () => {
    const synth = createSynthMock();
    vi.spyOn(ABCJS.synth, "CreateSynth").mockImplementation(function CreateSynthMock() {
      return synth as never;
    } as never);

    await mount(FIRST_ABC);

    const pressSpacebar = async () => {
      const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        code: "Space",
        key: " ",
      });
      const preventDefault = vi.spyOn(event, "preventDefault");
      await act(async () => {
        window.dispatchEvent(event);
      });
      expect(preventDefault).toHaveBeenCalledOnce();
    };

    await pressSpacebar();
    expect(synth.start).toHaveBeenCalledOnce();

    await pressSpacebar();
    expect(synth.pause).toHaveBeenCalledOnce();

    await pressSpacebar();
    expect(synth.resume).toHaveBeenCalledOnce();
  });

  it("starts from the selected rendered note the next time playback starts", async () => {
    const synth = createSynthMock();
    const renderAbc = vi.spyOn(ABCJS, "renderAbc");
    createTimingMock([{ type: "event", startChar: 42, milliseconds: 1800 }]);
    vi.spyOn(ABCJS.synth, "CreateSynth").mockImplementation(function CreateSynthMock() {
      return synth as never;
    } as never);

    await mount(FOUR_MEASURE_ABC);

    const renderOptions = renderAbc.mock.calls.at(-1)?.[2] as
      | { clickListener?: ABCJS.ClickListener; selectTypes?: unknown }
      | undefined;
    expect(renderOptions?.selectTypes).toEqual(["note"]);
    expect(renderOptions?.clickListener).toEqual(expect.any(Function));

    await act(async () => {
      renderOptions?.clickListener?.(
        { el_type: "note", startChar: 42 } as ABCJS.AbcElem,
        0,
        "",
        { measure: 2 } as ABCJS.ClickListenerAnalysis,
        {} as ABCJS.ClickListenerDrag,
      );
    });
    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]')?.click();
    });

    expect(synth.seek).toHaveBeenCalledWith(1.8, "seconds");
  });

  it("highlights the note reported by abcjs timing callbacks", async () => {
    const { getOptions } = createTimingMock();
    await mount(FIRST_ABC);

    const note = document.createElement("span");
    const eventCallback = getOptions()?.eventCallback;
    expect(eventCallback).toEqual(expect.any(Function));

    await act(async () => {
      eventCallback?.({
        elements: [[note]],
        milliseconds: 0,
        millisecondsPerMeasure: 1000,
        type: "event",
      });
    });
    expect(note.classList.contains("abcjs-note-playing")).toBe(true);

    await act(async () => {
      eventCallback?.(null);
    });
    expect(note.classList.contains("abcjs-note-playing")).toBe(false);
  });

  it.each([
    ["melody", { chordsOff: true }],
    ["chords", { voicesOff: true }],
    ["both", {}],
  ] as const)("plays %s according to the selected parts", async (part, expectedOptions) => {
    const synth = createSynthMock();
    vi.spyOn(ABCJS.synth, "CreateSynth").mockImplementation(function CreateSynthMock() {
      return synth as never;
    } as never);

    await mount(FOUR_MEASURE_ABC);

    const parts = container?.querySelector<HTMLSelectElement>('select[aria-label="Playback parts"]');
    await act(async () => {
      if (!parts) throw new Error("Playback parts control is missing.");
      parts.value = part;
      parts.dispatchEvent(new Event("change", { bubbles: true }));
      container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]')?.click();
    });

    const options = synth.init.mock.calls[0]?.[0]?.options as Record<string, unknown> | undefined;
    expect(options).toMatchObject(expectedOptions);
    if (part === "both") {
      expect(options?.chordsOff).not.toBe(true);
      expect(options?.voicesOff).not.toBe(true);
    }
  });

  it("uses the current transposition and selected chord-change variant", async () => {
    const synth = createSynthMock();
    const renderAbc = vi.spyOn(ABCJS, "renderAbc");
    vi.spyOn(ABCJS.synth, "CreateSynth").mockImplementation(function CreateSynthMock() {
      return synth as never;
    } as never);

    await mount({
      abc: FOUR_MEASURE_ABC,
      transposition: 2,
      selectedChordVariant: {
        id: "bridge-substitutions",
        startMeasure: 3,
        endMeasure: 4,
        chords: ["Abmaj7", "Db7"],
      },
    });

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]')?.click();
    });

    const renderedSource = renderAbc.mock.calls.at(-1)?.[1];
    expect(renderedSource).toContain('"Abmaj7"');
    expect(renderedSource).toContain('"Db7"');
    expect(synth.init).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ midiTranspose: 2 }),
      }),
    );
  });

  it("stops and resets when the chart or selected variant changes", async () => {
    const synth = createSynthMock();
    vi.spyOn(ABCJS.synth, "CreateSynth").mockImplementation(function CreateSynthMock() {
      return synth as never;
    } as never);

    const firstProps: PlaybackPreviewProps = {
      abc: FOUR_MEASURE_ABC,
      selectedChordVariant: {
        id: "original",
        startMeasure: 1,
        endMeasure: 4,
        chords: ["C", "F", "G7", "C"],
      },
    };
    await mount(firstProps);

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]')?.click();
    });

    await rerender({
      ...firstProps,
      selectedChordVariant: {
        id: "tritone-substitutions",
        startMeasure: 3,
        endMeasure: 4,
        chords: ["Db7", "C"],
      },
    });

    expect(synth.stop).toHaveBeenCalledOnce();
    expect(container?.querySelector('button[aria-label="Play lead sheet"]')).not.toBeNull();

    await act(async () => {
      container?.querySelector<HTMLButtonElement>('button[aria-label="Play lead sheet"]')?.click();
    });

    await rerender({ ...firstProps, abc: SECOND_ABC });

    expect(synth.stop).toHaveBeenCalledTimes(2);
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
