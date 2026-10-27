import type { SongContent } from "./song-content";
export type PublicSong = {
  id: string;
  catalogId?: string;
  publicationTerritory?: "US" | "worldwide";
  title: string;
  writers: string;
  rhythm: string;
  abc: string;
  abcParts?: string;
  content?: SongContent;
};
