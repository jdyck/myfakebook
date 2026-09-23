import { describe, expect, it } from "vitest";

import { PUBLIC_CATALOG } from "./public-catalog";

describe("public catalog bootstrap", () => {
  it("contains complete public chart metadata", () => {
    expect(PUBLIC_CATALOG.length).toBeGreaterThan(0);

    const ids = PUBLIC_CATALOG.map((chart) => chart.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const chart of PUBLIC_CATALOG) {
      expect(chart.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(chart.title.trim()).not.toBe("");
      expect(chart.writers.trim()).not.toBe("");
      expect(chart.rhythm.trim()).not.toBe("");
      expect(chart.abc).toMatch(/^T:\s*\S/m);
      expect(chart.abc).toMatch(/^C:\s*\S/m);
      expect(chart.abc).toMatch(/^M:\s*\d+\/\d+/m);
      expect(chart.abc).toMatch(/^K:\s*[A-Ga-g]/m);
    }
  });
});
