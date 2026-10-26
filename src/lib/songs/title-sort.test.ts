import { describe, expect, it } from "vitest";

import { compareSongTitles } from "./title-sort";

describe("song title sorting", () => {
  it("ignores leading punctuation, including before and after articles", () => {
    for (const title of ["'Deed I Do", "’Deed I Do", "… (Deed I Do", "The 'Deed I Do", "“The Deed I Do"]) {
      expect(compareSongTitles(title, "Deed I Do")).toBe(0);
    }
    expect(["Georgia", "'Deed I Do", "Autumn Leaves"].toSorted(compareSongTitles)).toEqual([
      "Autumn Leaves", "'Deed I Do", "Georgia",
    ]);
  });

  it("sorts leading A and The by the following word", () => {
    const titles = ["The First Noel", "A Wonderful World", "Georgia", "Autumn Leaves"];
    expect(titles.toSorted(compareSongTitles)).toEqual([
      "Autumn Leaves", "The First Noel", "Georgia", "A Wonderful World",
    ]);
    expect(titles.toSorted((a, b) => -compareSongTitles(a, b))).toEqual([
      "A Wonderful World", "Georgia", "The First Noel", "Autumn Leaves",
    ]);
  });

  it("ignores article case and extra whitespace", () => {
    expect(compareSongTitles("  tHE   First Noel  ", "First Noel")).toBe(0);
    expect(compareSongTitles("a Wonderful World", "Wonderful World")).toBe(0);
  });

  it("preserves complete words and articles elsewhere in the title", () => {
    expect(compareSongTitles("Theme", "Theme")).toBe(0);
    expect(compareSongTitles("Autumn", "Autumn")).toBe(0);
    expect(compareSongTitles("A", "A")).toBe(0);
    expect(compareSongTitles("In the Mood", "In Mood")).toBeGreaterThan(0);
  });
});
