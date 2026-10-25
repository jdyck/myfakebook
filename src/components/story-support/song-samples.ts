// Viewer-only samples shared by library and workspace stories.
import { PUBLIC_LIBRARY } from "@/lib/songs/public-library";
import type { LoadedSong, SongId } from "@/lib/songs/types";

const catalogSong = PUBLIC_LIBRARY[0];

export const privateSong = {
  id: "viewer-private-session" as SongId,
  title: "The Session",
  abc: "X:1\nT:The Session\nC:Traditional\nR:reel\nM:4/4\nL:1/8\nK:D\nDEFG A2 d2|",
  publicationState: "private",
} satisfies LoadedSong;

export const publishedSong = {
  id: "viewer-published-us" as SongId,
  title: catalogSong.title,
  abc: catalogSong.abc,
  publicationState: "published",
  publicationTerritory: "US",
} satisfies LoadedSong;

export const longTitleSong = {
  ...privateSong,
  id: "viewer-published-worldwide" as SongId,
  title: "The Last Tune of the Evening Before the Long Journey Home Across the Mountains",
  publicationState: "published",
  publicationTerritory: "worldwide",
} satisfies LoadedSong;
