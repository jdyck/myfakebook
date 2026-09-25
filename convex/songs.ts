import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { isAdmin, requireAdmin, requireOwner, requireUser } from "./auth";
import { listMine, listPublished, removeSong, saveSong, setPublicationState } from "./songStore";

export const listMySongs = query({
  args: {},
  handler: async (ctx) => listMine(ctx, await requireOwner(ctx)),
});

export const listPublicSongs = query({
  args: {},
  handler: async (ctx) => {
    const songs = await listPublished(ctx);
    return songs.map((song) => ({
      id: song._id,
      ...(song.catalogId
        ? { catalogId: song.catalogId }
        : {}),
      title: song.title,
      writers: song.writers,
      rhythm: song.rhythm,
      abc: song.abc,
      updatedAt: song.updatedAt,
    }));
  },
});

export const save = mutation({
  args: {
    id: v.optional(v.id("songs")),
    title: v.string(),
    abc: v.string(),
    writers: v.optional(v.string()),
    rhythm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireUser(ctx);
    return saveSong(ctx, identity.subject, {
      title: args.title.trim() || "Untitled lead sheet",
      abc: args.abc,
      writers: args.writers,
      rhythm: args.rhythm,
    }, args.id, isAdmin(identity));
  },
});

export const publish = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return setPublicationState(ctx, args.id, identity.subject, "published");
  },
});

export const unpublish = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    return setPublicationState(ctx, args.id, identity.subject, "private");
  },
});

export const remove = mutation({
  args: { id: v.id("songs") },
  handler: async (ctx, args) => removeSong(ctx, args.id, await requireOwner(ctx)),
});

// The hardcoded public library was already visible to everyone. Import it once
// as published song records so future visibility changes go through publish.
export const ensureCatalogSongs = mutation({
  args: {
    songs: v.array(v.object({
      id: v.string(),
      title: v.string(),
      writers: v.string(),
      rhythm: v.string(),
      abc: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const libraryId = "built-in-v1";
    const importRecord = await ctx.db
      .query("catalogImports")
      .withIndex("by_libraryId", (query) => query.eq("libraryId", libraryId))
      .first();
    if (importRecord) return { imported: 0 };

    let imported = 0;

    for (const catalogSong of args.songs) {
      const alreadyImported = await ctx.db
        .query("songs")
        .withIndex("by_catalogId", (query) => query.eq("catalogId", catalogSong.id))
        .first();
      if (alreadyImported) continue;

      const matchingPublishedSong = await ctx.db
        .query("songs")
        .withIndex("by_owner_updatedAt", (query) => query.eq("ownerId", identity.subject))
        .filter((query) => query.and(
          query.eq(query.field("title"), catalogSong.title),
          query.eq(query.field("abc"), catalogSong.abc),
        ))
        .collect()
        .then((matches) => matches.find((song) => song.publicationState === "published"));

      const now = Date.now();
      if (matchingPublishedSong) {
        await ctx.db.patch("songs", matchingPublishedSong._id, {
          writers: catalogSong.writers,
          rhythm: catalogSong.rhythm,
          publicationState: "published",
          publishedAt: matchingPublishedSong.publishedAt ?? now,
          catalogId: catalogSong.id,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("songs", {
          ownerId: identity.subject,
          title: catalogSong.title,
          writers: catalogSong.writers,
          rhythm: catalogSong.rhythm,
          abc: catalogSong.abc,
          publicationState: "published",
          publishedAt: now,
          catalogId: catalogSong.id,
          updatedAt: now,
        });
      }
      imported += 1;
    }

    await ctx.db.insert("catalogImports", { libraryId, importedAt: Date.now() });
    return { imported };
  },
});
