import { publicDomainTerritory } from "./songAccess";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { sameSongContent } from "../src/lib/songs/song-content";
import { resolveSongSource, type SongSourceInput } from "../src/lib/songs/song-source";

export type SongId = Id<"songs">;
type ReadCtx = QueryCtx | MutationCtx;

export function withSongContent(song: Doc<"songs">) {
  return { ...song, publicDomainTerritory: publicDomainTerritory(song), ...resolveSongSource(song) };
}

export function prepareSongContent(data: SongSourceInput, previousAbc = "") {
  return resolveSongSource(data, previousAbc);
}

export async function listMine(ctx: ReadCtx, ownerId: string) {
  const songs = await ctx.db
    .query("songs")
    .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", ownerId))
    .order("desc")
    .collect();
  return songs.map(withSongContent);
}

export async function listPublicDomain(ctx: ReadCtx) {
  const songs = await ctx.db
    .query("songs")
    .withIndex("by_publication_updatedAt", (query) => query.eq("publicationState", "published"))
    .order("desc")
    .collect();
  return songs.map(withSongContent);
}

export async function saveSong(
  ctx: MutationCtx,
  ownerId: string,
  data: { title: string; abc?: string; content?: Doc<"songs">["content"]; abcParts?: string; writers?: string; rhythm?: string },
  requestedId?: SongId,
  canEditPublished = false,
) {
  const now = Date.now();

  if (requestedId) {
    const existing = await ctx.db.get("songs", requestedId);
    if (!existing || existing.ownerId !== ownerId) throw new Error("Song not found");
    if (publicDomainTerritory(existing) !== "none" && !canEditPublished) throw new Error("Not authorized");
    const notation = data.content === undefined && data.abc === undefined && data.abcParts === undefined
      ? prepareSongContent({ ...existing, title: data.title })
      : prepareSongContent(data, withSongContent(existing).abc);
    await ctx.db.patch("songs", requestedId, {
      title: data.title,
      ...notation,
      writers: data.writers?.trim() ?? existing.writers,
      rhythm: data.rhythm?.trim() ?? existing.rhythm,
      updatedAt: now,
    });
    return requestedId;
  }

  if (data.abc === undefined && data.content === undefined && data.abcParts === undefined) {
    throw new Error("Song content or ABC is required");
  }

  const { abc, content, abcParts } = prepareSongContent(data);
  const matches = await ctx.db
    .query("songs")
    .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", ownerId))
    .filter((query) =>
      query.and(
        query.eq(query.field("title"), data.title),
        query.eq(query.field("abc"), abc),
      ),
    )
    .collect();
  const existing = matches.find((song) => sameSongContent(withSongContent(song).content, content));

  if (existing) {
    if (existing.content === undefined) await ctx.db.patch("songs", existing._id, { content, abc, abcParts });
    return existing._id;
  }

  return ctx.db.insert("songs", {
    ownerId,
    title: data.title,
    writers: data.writers?.trim() ?? "",
    rhythm: data.rhythm?.trim() ?? "",
    abc,
    content,
    abcParts,
    publicDomainTerritory: "none",
    publicationState: "private",
    updatedAt: now,
  });
}

export async function setPublicDomainStatus(
  ctx: MutationCtx,
  id: SongId,
  ownerId: string,
  publication: "none" | "US" | "worldwide",
) {
  const song = await ctx.db.get("songs", id);
  if (!song || song.ownerId !== ownerId) throw new Error("Song not found");
  const publicationState = publication === "none" ? "private" : "published";
  const publicationTerritory = publication === "none" ? undefined : publication;
  const currentPublication = publicDomainTerritory(song);
  if (currentPublication === publication && song.publicDomainTerritory === publication) return id;
  if (publication !== "none" && !song.abc?.trim() && !song.abcParts?.trim() && !withSongContent(song).content.measures.length) {
    throw new Error("Song content or ABC is required");
  }
  const now = Date.now();
  await ctx.db.patch("songs", id, {
    publicDomainTerritory: publication,
    publicationState,
    publicationTerritory,
    publishedAt: publication === "none" ? undefined : song.publishedAt ?? now,
    updatedAt: now,
  });
  return id;
}

export async function removeSong(ctx: MutationCtx, id: SongId, ownerId: string) {
  const song = await ctx.db.get("songs", id);
  if (!song || song.ownerId !== ownerId) throw new Error("Song not found");
  if (publicDomainTerritory(song) !== "none") throw new Error("Remove public-domain status before removing");
  const binderItems = await ctx.db
    .query("binderItems")
    .withIndex("by_song", (query) => query.eq("songId", id))
    .collect();
  for (const item of binderItems) {
    await ctx.db.delete("binderItems", item._id);
    const binder = await ctx.db.get("binders", item.binderId);
    if (binder) {
      await ctx.db.patch("binders", binder._id, { updatedAt: Date.now() });
    }
  }
  await ctx.db.delete("songs", id);
  return id;
}
