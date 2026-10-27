import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { copySongs, developmentDeployment, latestExport } from "./import-development.mjs";

describe("development song import", () => {
  it("drops production IDs to avoid cross-table conflicts while preserving replacement times", () => {
    const source = { _id: "original", _creationTime: 123, updatedAt: 456, ownerId: "user_prod", title: "Tune", publicationState: "published", publishedAt: 789, catalogId: "catalog" };
    expect(copySongs(JSON.stringify(source), "user_dev", undefined, true)).toEqual([{
      _creationTime: 123, updatedAt: 456, ownerId: "user_dev", title: "Tune", publicationState: "private",
    }]);
    expect(copySongs(JSON.stringify({ ...source, _id: undefined }), "user_dev", undefined, true)[0]._creationTime).toBe(123);
    for (const invalid of [{ ownerId: "user_prod" }, { ...source, _creationTime: "123" }, { ...source, _creationTime: -1 }]) {
      expect(() => copySongs(JSON.stringify(invalid), "user_dev", undefined, true)).toThrow("original numeric _creationTime");
    }
  });
  it("copies notation to a private development song without production identity or publication metadata", () => {
    const source = { _id: "old", _creationTime: 1, ownerId: "user_prod", title: "Tune", abc: "K:C", content: { measures: [] }, publicationState: "published", publicationTerritory: "US", publishedAt: 2, catalogId: "catalog", updatedAt: 3 };
    expect(copySongs(JSON.stringify(source), "user_dev")).toEqual([{
      ownerId: "user_dev", title: "Tune", abc: "K:C", content: { measures: [] }, publicationState: "private", updatedAt: 3,
    }]);
    expect(source.ownerId).toBe("user_prod");
  });

  it("filters the original owner before assigning the development owner", () => {
    const lines = [{ ownerId: "user_a", title: "A" }, { ownerId: "user_b", title: "B" }].map(JSON.stringify).join("\n");
    expect(copySongs(lines, "user_dev", "user_b").map((song) => song.title)).toEqual(["B"]);
    expect(copySongs(lines, "user_dev", "missing")).toEqual([]);
    expect(() => copySongs(lines, "")).toThrow("DEV_CLERK_USER_ID");
    expect(() => copySongs("null", "user_dev")).toThrow("Invalid song");
  });

  it("refuses production, preview, missing and malformed deployment selections", () => {
    expect(developmentDeployment("dev:happy-fox-123")).toBe("dev:happy-fox-123");
    for (const value of [undefined, "prod:happy-fox-123", "preview:fox", "happy-fox-123", "dev:fox\nCONVEX_DEPLOY_KEY=bad"]) {
      expect(() => developmentDeployment(value)).toThrow("must be dev:");
    }
  });

  it("selects the most recently modified ZIP and reports an empty directory", () => {
    const directory = mkdtempSync(join(tmpdir(), "song-import-test-"));
    try {
      expect(() => latestExport(directory)).toThrow("No ZIP exports");
      const older = join(directory, "z.zip");
      const newer = join(directory, "a.zip");
      writeFileSync(older, "");
      writeFileSync(newer, "");
      writeFileSync(join(directory, "other.txt"), "");
      utimesSync(older, 1, 1);
      utimesSync(newer, 2, 2);
      expect(latestExport(directory)).toBe(newer);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
