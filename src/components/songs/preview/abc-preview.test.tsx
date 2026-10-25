// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const synth = { init: vi.fn().mockResolvedValue(undefined), prime: vi.fn().mockResolvedValue(undefined), seek: vi.fn(), start: vi.fn(), stop: vi.fn(), getIsRunning: vi.fn(() => false) };
  const tune = { getBpm: () => 120, millisecondsPerMeasure: (bpm: number) => 240000 / bpm };
  const timingOptions = vi.fn();
  return { synth, tune, timingOptions, renderOptions: vi.fn() };
});

vi.mock("next/font/google", () => ({ Roboto_Condensed: () => ({ className: "condensed" }) }));
vi.mock("abcjs", () => ({ default: {
  parseOnly: () => [mocks.tune],
  strTranspose: (abc: string) => abc,
  extractMeasures: () => [{ measures: [{}, {}, {}] }],
  renderAbc: (target: HTMLElement, abc: string, options: { initialClef: boolean }) => {
    mocks.renderOptions(options);
    target.innerHTML = abc.includes("%%text")
      ? `<svg viewBox="0 0 800 100"><g class="abcjs-staff-wrapper abcjs-l1">${options.initialClef ? "" : '<g class="abcjs-clef"></g>'}<g class="abcjs-key-signature"></g></g><g class="abcjs-staff-wrapper abcjs-l2"><g class="abcjs-clef"></g><g class="abcjs-key-signature"></g></g></svg>`
      : '<svg viewBox="0 0 800 100" aria-label="Test score"></svg>';
    return [mocks.tune];
  },
  TimingCallbacks: class {
    noteTimings = [];
    constructor(_tune: unknown, options: unknown) { mocks.timingOptions(options); }
    stop() {}
    start() {}
  },
  synth: { CreateSynth: class { constructor() { return mocks.synth; } } },
} }));

import { AbcPreview } from "./abc-preview";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("preserves the first musical staff's clef and key when text precedes the music", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const abc = "X:1\nT:Song\nM:4/4\nK:G\n%%text Verse\nG8|\nA8|";
  try {
    await act(async () => root.render(<AbcPreview abc={abc} />));
    expect(mocks.renderOptions).toHaveBeenLastCalledWith(expect.objectContaining({ initialClef: false }));
    const systems = container.querySelectorAll(".abcjs-staff-wrapper");
    expect(systems[0].querySelector(".abcjs-clef")).not.toBeNull();
    expect(systems[0].querySelector(".abcjs-key-signature")).not.toBeNull();
    expect(systems[1].querySelector(".abcjs-clef")).toBeNull();
    expect(systems[1].querySelector(".abcjs-key-signature")).toBeNull();
    await act(async () => root.render(<AbcPreview abc={abc} showFirstLineClefOnly={false} />));
    expect(container.querySelectorAll(".abcjs-clef")).toHaveLength(2);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it("uses the selected tempo, parts, and start measure for playback and stops when tempo changes", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const change = async (element: HTMLInputElement | HTMLSelectElement, value: string) => {
    await act(async () => {
      const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLSelectElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
      element.dispatchEvent(new Event(element instanceof HTMLInputElement ? "input" : "change", { bubbles: true }));
    });
  };
  try {
    await act(async () => root.render(<AbcPreview abc={'T:Song\nM:4/4\nK:C\n"C"C D E F|G A B c|c B A G|'} />));
    const tempo = container.querySelector<HTMLInputElement>('[aria-label="Playback tempo"]')!;
    expect(tempo.value).toBe("120");
    await change(tempo, "90");
    const choose = async (label: string, text: string) => {
      await act(async () => container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click());
      const option = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')).find((item) => item.textContent === text)!;
      await act(async () => option.click());
    };
    await choose("Playback parts", "Chords");
    await choose("Playback start measure", "2");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Play lead sheet"]')!.click());
    expect(mocks.synth.init).toHaveBeenLastCalledWith(expect.objectContaining({
      millisecondsPerMeasure: 240000 / 90,
      options: expect.objectContaining({ voicesOff: true }),
    }));
    expect(mocks.timingOptions).toHaveBeenLastCalledWith(expect.objectContaining({ qpm: 90 }));
    expect(mocks.synth.seek).toHaveBeenLastCalledWith(1 / 3, "percent");
    expect(container.querySelector('[aria-label="Stop playback"]')).not.toBeNull();
    await change(tempo, "100");
    expect(mocks.synth.stop).toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Play lead sheet"]')).not.toBeNull();
    await change(tempo, "");
    expect(tempo.value).toBe("");
    await change(tempo, "60");
    expect(tempo.value).toBe("60");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
