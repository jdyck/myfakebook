import type { SongContent } from "@/lib/songs/song-content";
import type { Id } from "../../../convex/_generated/dataModel";

export type SongId = Id<"songs">;

export type PublicationValue = "none" | "US" | "worldwide";

export type LoadedSong = {
  id: SongId;
  title: string;
  abc: string;
  abcParts?: string;
  content?: SongContent;
  publicDomainTerritory?: PublicationValue;
  publicationState: "private" | "published";
  publicationTerritory?: "US" | "worldwide";
};

export function publicationValueForSong(song: Pick<LoadedSong, "publicationState" | "publicationTerritory" | "publicDomainTerritory">): PublicationValue {
  if (song.publicDomainTerritory !== undefined) return song.publicDomainTerritory;
  if (song.publicationState === "private") return "none";
  return song.publicationTerritory ?? "worldwide";
}

export function publicationLabel(value: PublicationValue) {
  switch (value) {
    case "US": return "U.S.";
    case "worldwide": return "Worldwide";
    case "none": return "Not public domain";
  }
}

export function publicationStatusForSong(song: Pick<LoadedSong, "publicationState" | "publicationTerritory" | "publicDomainTerritory">) {
  const value = publicationValueForSong(song);
  return value === "none" ? "Private" : `Public domain · ${publicationLabel(value)}`;
}

export type BinderSong = { id: Id<"songs">; title: string };
