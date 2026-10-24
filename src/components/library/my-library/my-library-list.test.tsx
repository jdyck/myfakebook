// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-shell/header/header", () => ({ Header: () => null }));
vi.mock("next/font/google", () => ({ Roboto_Condensed: () => ({ className: "condensed" }) }));

import { MyLibraryList } from "./my-library-list";
import type { Id } from "../../../../convex/_generated/dataModel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

  it("combines visibility and title filters, clears empty results, and toggles sorting", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const titles = () => Array.from(container.querySelectorAll("tbody tr")).map((row) => row.querySelector("td:nth-child(2) a")?.textContent);
    const click = async (label: string) => {
      const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.startsWith(label));
      expect(button).toBeDefined();
      await act(async () => button!.click());
    };
    try {
      await act(async () => root.render(<MyLibraryList songs={[
        { id: "alpha" as Id<"songs">, title: "Alpha", updatedAt: 1, publicationState: "private" },
        { id: "zulu" as Id<"songs">, title: "Zulu", updatedAt: 3, publicationState: "published", publicationTerritory: "US" },
        { id: "bravo" as Id<"songs">, title: "Bravo", updatedAt: 2, publicationState: "published" },
      ]} />));
      expect(titles()).toEqual(["Zulu", "Bravo", "Alpha"]);
      await click("Published");
      expect(titles()).toEqual(["Zulu", "Bravo"]);
      expect(container.textContent).toContain("02 OF 03 SONGS");

      const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, " alpha ");
        search.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(titles()).toEqual([]);
      expect(container.textContent).toContain("No songs found.");
      await click("Clear filters");
      expect(search.value).toBe("");
      expect(titles()).toEqual(["Zulu", "Bravo", "Alpha"]);

      await click("SONG TITLE");
      expect(titles()).toEqual(["Alpha", "Bravo", "Zulu"]);
      expect(container.querySelector('th[aria-sort="ascending"]')?.textContent).toContain("SONG TITLE");
      await click("SONG TITLE");
      expect(titles()).toEqual(["Zulu", "Bravo", "Alpha"]);
      await click("UPDATED");
      await click("UPDATED");
      expect(titles()).toEqual(["Alpha", "Bravo", "Zulu"]);
      await click("Private");
      expect(titles()).toEqual(["Alpha"]);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("announces loading without showing an empty library", () => {
    const markup = renderToStaticMarkup(<MyLibraryList songs={undefined} loading />);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Loading your songs…");
    expect(markup).not.toContain("No songs in your library yet.");
  });
});
