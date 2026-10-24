// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-shell/header/header", () => ({ Header: () => null }));
vi.mock("next/font/google", () => ({ Roboto_Condensed: () => ({ className: "condensed" }) }));

import type { PublicSong } from "@/lib/songs/public-library";
import { PublicSongsList } from "./public-songs-list";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const songs: PublicSong[] = [
  { id: "zulu", title: "Zulu", writers: "Alice", rhythm: "Swing", abc: "", publicationTerritory: "US" },
  { id: "alpha/song", title: "Alpha", writers: "Charlie", rhythm: "Ballad", abc: "" },
  { id: "bravo", title: "Bravo", writers: "Bob", rhythm: "Swing", abc: "" },
];

describe("Public Songs list", () => {
  it("links to public songs and preserves admin publication details", () => {
    const markup = renderToStaticMarkup(<PublicSongsList clerkConfigured={false} songs={songs} isAdmin />);
    expect(markup).toContain('href="/songs/alpha%2Fsong"');
    expect(markup).toContain("Published songs in all territories.");
    expect(markup).toContain("U.S.");
    expect(markup).toContain("Worldwide");
    expect(markup).toContain("Alice");
    expect(markup).toContain("Swing");
  });

  it("searches titles, writers, and styles, clears results, and sorts columns", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const titles = () => Array.from(container.querySelectorAll("tbody tr")).map((row) => row.querySelector("td:nth-child(2) a")?.textContent);
    const click = async (label: string) => {
      const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.startsWith(label));
      expect(button).toBeDefined();
      await act(async () => button!.click());
    };
    const searchFor = async (value: string) => {
      const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, value);
        search.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };

    try {
      await act(async () => root.render(<PublicSongsList clerkConfigured={false} songs={songs} />));
      expect(titles()).toEqual(["Alpha", "Bravo", "Zulu"]);
      await searchFor(" ZULU ");
      expect(titles()).toEqual(["Zulu"]);
      await searchFor("charlie");
      expect(titles()).toEqual(["Alpha"]);
      await searchFor("swing");
      expect(titles()).toEqual(["Bravo", "Zulu"]);
      expect(container.textContent).toContain("02 OF 03 SONGS");
      await searchFor("missing");
      expect(titles()).toEqual([]);
      expect(container.textContent).toContain("No songs found.");
      await click("Clear search");
      expect(titles()).toEqual(["Alpha", "Bravo", "Zulu"]);
      await click("SONG TITLE");
      expect(titles()).toEqual(["Zulu", "Bravo", "Alpha"]);
      await click("COMPOSER / WRITERS");
      expect(titles()).toEqual(["Zulu", "Bravo", "Alpha"]);
      await click("COMPOSER / WRITERS");
      expect(titles()).toEqual(["Alpha", "Bravo", "Zulu"]);
      await click("STYLE");
      expect(titles()).toEqual(["Alpha", "Bravo", "Zulu"]);
      expect(container.querySelector('th[aria-sort="ascending"]')?.textContent).toContain("STYLE");
      await searchFor("ballad");
      await click("All songs");
      expect(titles()).toEqual(["Alpha", "Bravo", "Zulu"]);
      expect(songs.map((song) => song.title)).toEqual(["Zulu", "Alpha", "Bravo"]);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("announces loading separately from an empty catalog", () => {
    const loading = renderToStaticMarkup(<PublicSongsList clerkConfigured={false} songs={undefined} />);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Loading songs…");
    expect(loading).not.toContain("No published songs yet.");
    const empty = renderToStaticMarkup(<PublicSongsList clerkConfigured={false} songs={[]} />);
    expect(empty).toContain("No published songs yet.");
    expect(empty).toContain("Songs available in your region.");
  });
});
