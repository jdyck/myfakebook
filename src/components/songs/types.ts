import type { Id } from "../../../convex/_generated/dataModel";

export type SongId = Id<"songs">;

export type PublicationValue = "none" | "US" | "worldwide";

export type LoadedSong = {
  id: SongId;
  title: string;
  abc: string;
  publicationState: "private" | "published";
  publicationTerritory?: "US" | "worldwide";
};

export function publicationValueForSong(song: Pick<LoadedSong, "publicationState" | "publicationTerritory">): PublicationValue {
  if (song.publicationState === "private") return "none";
  return song.publicationTerritory ?? "worldwide";
}

export function publicationLabel(value: PublicationValue) {
  switch (value) {
    case "US": return "U.S.";
    case "worldwide": return "Worldwide";
    case "none": return "None";
  }
}

export function publicationStatusForSong(song: Pick<LoadedSong, "publicationState" | "publicationTerritory">) {
  const value = publicationValueForSong(song);
  return value === "none" ? "Private" : `Published · ${publicationLabel(value)}`;
}

export type SetListSong = { id: Id<"songs">; title: string };
