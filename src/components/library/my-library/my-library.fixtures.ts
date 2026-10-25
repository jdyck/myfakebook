import type { ComponentProps } from "react";
import { longTitleSong, privateSong, publishedSong } from "@/components/story-support/song-samples";
import type { MyLibraryList, LibrarySong } from "./my-library-list";

export const emptyLibrarySongs = [] satisfies LibrarySong[];
export const populatedLibrarySongs = [
  { ...privateSong, updatedAt: Date.parse("2025-02-12T12:00:00Z") },
  { ...publishedSong, updatedAt: Date.parse("2025-01-20T12:00:00Z") },
  { ...longTitleSong, updatedAt: Date.parse("2024-12-06T12:00:00Z") },
] satisfies LibrarySong[];

export const libraryFixtures = {
  empty: { songs: emptyLibrarySongs },
  populated: { songs: populatedLibrarySongs },
  loading: { songs: undefined, loading: true },
} satisfies Record<string, ComponentProps<typeof MyLibraryList>>;
