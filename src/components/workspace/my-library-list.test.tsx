import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/header", () => ({ Header: () => null }));

import { MyLibraryList } from "./my-library-list";
import type { Id } from "../../../convex/_generated/dataModel";

describe("My Library list", () => {
  it("links each saved song to its own page", () => {
    const markup = renderToStaticMarkup(
      <MyLibraryList songs={[
        { id: "song_1" as Id<"songs">, title: "First Song", updatedAt: 1, publicationState: "private" },
        { id: "song_2" as Id<"songs">, title: "Second Song", updatedAt: 2, publicationState: "published" },
      ]} />,
    );

    expect(markup).toContain('href="/mylibrary/song_1"');
    expect(markup).toContain('href="/mylibrary/song_2"');
    expect(markup).toContain("First Song");
    expect(markup).toContain("Second Song");
    expect(markup).toContain("Published");
    expect(markup).not.toContain("textarea");
  });

  it("shows an empty state when there are no saved songs", () => {
    const markup = renderToStaticMarkup(<MyLibraryList songs={[]} />);
    expect(markup).toContain("No songs in your library yet.");
    expect(markup).toContain('href="/new"');
  });
});
