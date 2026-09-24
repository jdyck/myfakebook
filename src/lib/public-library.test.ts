import { describe, expect, it } from "vitest";

import { PUBLIC_LIBRARY } from "./public-library";

describe("Public Library bootstrap", () => {
  it("contains complete public song metadata", () => {
    expect(PUBLIC_LIBRARY.length).toBeGreaterThan(0);

    const ids = PUBLIC_LIBRARY.map((song) => song.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const song of PUBLIC_LIBRARY) {
      expect(song.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(song.title.trim()).not.toBe("");
      expect(song.writers.trim()).not.toBe("");
      expect(song.rhythm.trim()).not.toBe("");
      expect(song.abc).toMatch(/^T:\s*\S/m);
      expect(song.abc).toMatch(/^C:\s*\S/m);
      expect(song.abc).toMatch(/^M:\s*\d+\/\d+/m);
      expect(song.abc).toMatch(/^K:\s*[A-Ga-g]/m);
    }
  });
});
