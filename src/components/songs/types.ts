import type { Id } from "../../../convex/_generated/dataModel";

export type SongId = Id<"songs">;

export type LoadedSong = {
  id: SongId;
  title: string;
  abc: string;
  publicationState: "private" | "published";
};

export type SetListSong = { id: Id<"songs">; title: string };
