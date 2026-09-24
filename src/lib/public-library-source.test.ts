import { describe, expect, it } from "vitest";

import { selectPublicLibrary } from "./public-library-source";

describe("Public Library source", () => {
  it("uses database songs when at least one published song exists", () => {
    const databaseSongs = [
      {
        id: "database-song",
        title: "Database Song",
        writers: "Test Writer",
        rhythm: "Swing",
        abc: "T:Database Song",
      },
    ];

    const fallbackSongs = [
      {
        id: "fallback-song",
        title: "Fallback Song",
        writers: "Fallback Writer",
        rhythm: "Ballad",
        abc: "T:Fallback Song",
      },
    ];

    expect(selectPublicLibrary(databaseSongs, fallbackSongs)).toEqual(
      databaseSongs,
    );
  });
});
