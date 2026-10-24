import type { ComponentProps } from "react";
import { longTitleSong, privateSong, publishedSong } from "@/components/story-support/song-samples";
import type { SongHeading } from "./song-heading";

type HeadingProps = ComponentProps<typeof SongHeading>;

export const songHeadingFixtures = {
  unsaved: { ...privateSong, transposition: 0, song: null, isPublicSong: false },
  private: { ...privateSong, transposition: 0, song: privateSong, isPublicSong: false },
  published: { ...publishedSong, transposition: 2, song: publishedSong, isPublicSong: true, position: 3 },
  longTitle: { ...longTitleSong, transposition: 0, song: longTitleSong, isPublicSong: true },
} satisfies Record<string, HeadingProps>;
