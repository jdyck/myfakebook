import type { PublicSong } from "@/lib/songs/public-library";
import { privateSong, publishedSong, longTitleSong } from "@/components/story-support/song-samples";

export const publicSongsFixtures = [
  { id: publishedSong.id, title: publishedSong.title, abc: publishedSong.abc, writers: "George Gershwin / Ira Gershwin", rhythm: "Swing", publicationTerritory: "US" },
  { id: privateSong.id, title: privateSong.title, abc: privateSong.abc, writers: "Traditional", rhythm: "Reel", publicationTerritory: "worldwide" },
  { id: longTitleSong.id, title: longTitleSong.title, abc: longTitleSong.abc, writers: "", rhythm: "", publicationTerritory: "worldwide" },
] satisfies PublicSong[];
