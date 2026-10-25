import { privateSong } from "@/components/story-support/song-samples";
import type { SongSourceInput } from "@/lib/songs/song-source";

export const songEditorDrawerFixtures = {
  populated: { title: privateSong.title, abc: privateSong.abc },
  withSubtitle: { title: privateSong.title, abc: privateSong.abc.replace("T:The Session", "T:The Session\nT:An evening reel") },
  empty: { title: "Untitled song" },
} satisfies Record<string, SongSourceInput>;
