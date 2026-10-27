import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export type CatalogCountry = "US" | "other";
export function publicDomainTerritory(song: Pick<Doc<"songs">, "publicDomainTerritory" | "publicationState" | "publicationTerritory">) {
  return song.publicDomainTerritory ?? (song.publicationState === "published" ? song.publicationTerritory ?? "worldwide" : "none");
}
export function canReadSong(song: Doc<"songs"> | null, ownerId?: string, country: CatalogCountry = "other") {
  if (!song) return false;
  const territory = publicDomainTerritory(song);
  return song.ownerId === ownerId || territory === "worldwide" || (territory === "US" && country === "US");
}

// Only our server may supply regional access. Browser-supplied countries are never trusted.
export const regionalAccessValidator = v.optional(v.object({ key: v.string(), country: v.union(v.literal("US"), v.literal("other")) }));
export function trustedCountry(access?: { key: string; country: CatalogCountry }): CatalogCountry {
  const key = process.env.PUBLIC_CATALOG_ACCESS_KEY;
  return key && access?.key === key ? access.country : "other";
}
