import { describe, expect, it } from "vitest";

import { selectPublicCatalog } from "./catalog-source";

describe("public catalog source", () => {
  it("uses database songs when at least one published song exists", () => {
    const databaseCatalog = [
      {
        id: "database-song",
        title: "Database Song",
        writers: "Test Writer",
        rhythm: "Swing",
        abc: "T:Database Song",
      },
    ];

    const fallbackCatalog = [
      {
        id: "fallback-song",
        title: "Fallback Song",
        writers: "Fallback Writer",
        rhythm: "Ballad",
        abc: "T:Fallback Song",
      },
    ];

    expect(selectPublicCatalog(databaseCatalog, fallbackCatalog)).toEqual(
      databaseCatalog,
    );
  });
});
