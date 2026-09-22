import ABCJS from "abcjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { prepareAbcForExport, type ChartDisplaySettings } from "./abc-display";

const DISPLAY_SETTINGS: ChartDisplaySettings = {
  showChords: true,
  showLyrics: true,
  transposition: 2,
};

describe("ABC display settings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
