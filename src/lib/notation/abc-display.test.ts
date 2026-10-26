import ABCJS from "abcjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getTranspositionChoices, prepareAbcForExport, type SongDisplaySettings } from "./abc-display";

const DISPLAY_SETTINGS: SongDisplaySettings = {
  showChords: true,
  showLyrics: true,
  transposition: 2,
};

describe("ABC display settings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["", "K:C\n"])("handles music without a tonal key (%j)", (key) => {
    const source = `X:17\nT:The First Noel\nM:3/4\nL:1/4\n${key}(E/D/) | "C" (C3/2 D/) "Am" (E/F/) |`;
    const choices = getTranspositionChoices(source);
    expect(choices).toHaveLength(25);
    expect(choices.every((choice) => choice.key === "No key")).toBe(true);
    expect(choices.map((choice) => choice.steps)).toEqual(Array.from({ length: 25 }, (_, i) => i - 12));
  });

  it("keeps rendering when abcjs rejects incomplete input", () => {
    vi.spyOn(ABCJS, "parseOnly").mockImplementation(() => { throw new Error("Invalid ABC"); });
    expect(getTranspositionChoices("X:1\nK:")).toHaveLength(25);
    expect(getTranspositionChoices("X:1\nK:")[12]).toEqual({ steps: 0, key: "Unknown key" });
  });

  it("still labels transposition choices for tonal keys", () => {
    expect(getTranspositionChoices("K:C\nC |")[14]).toEqual({ steps: 2, key: "D" });
  });

  it("delegates export transposition to abcjs", () => {
    const source = "K:C\nC |";
    const parsedTunes: ABCJS.TuneObjectArray = [{} as ABCJS.TuneObject];
    const transposedSource = "K:D\nD |";
    const parseOnly = vi.spyOn(ABCJS, "parseOnly").mockReturnValue(parsedTunes);
    const strTranspose = vi.spyOn(ABCJS, "strTranspose").mockReturnValue(transposedSource);

    const prepared = prepareAbcForExport(source, DISPLAY_SETTINGS);

    expect(parseOnly).toHaveBeenCalledWith(source);
    expect(strTranspose).toHaveBeenCalledWith(source, parsedTunes, 2);
    expect(prepared).toBe(transposedSource);
  });
});
